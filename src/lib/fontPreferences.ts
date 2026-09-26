/** Faces and URLs are owned by design-system/fonts.css, not a JS registry. */
const READING_FACES = [
  { style: "normal", weight: "400" },
  { style: "normal", weight: "700" },
  { style: "italic", weight: "400" },
  { style: "italic", weight: "700" },
] as const;

let fontLoaded = false;
let inFlight: Promise<void> | undefined;
let resourceRevision = 0;
let applicationRevision = 0;

const isReadingFamily = (family: string): boolean =>
  family.replace(/^["']|["']$/g, "") === "OpenDyslexic";

/** A CSS-connected FontFace keeps its rejected load promise forever. Recreate
 * only its canonical rule, in place, to retry the same source without a shadow
 * family, URL cache-buster, or JS-owned face. The stylesheet still owns cleanup.
 * Chromium may recreate sibling FontFaces too; their resources stay cached.
 */
const renewErroredDeclarations = (): void => {
  const failed: FontFace[] = [];
  document.fonts.forEach((face) => {
    if (isReadingFamily(face.family) && face.status === "error") failed.push(face);
  });
  if (!failed.length) return;

  const visit = (container: CSSStyleSheet | CSSGroupingRule): void => {
    let rules: CSSRuleList;
    try { rules = container.cssRules; } catch {
      // Cross-origin sheets are not ours to edit. Native loading still rejects
      // if the matching declaration is unavailable, rather than claiming ready.
      return;
    }
    for (let index = 0; index < rules.length; index += 1) {
      const rule = rules[index];
      if (!rule) continue;
      if (rule instanceof CSSFontFaceRule) {
        const { style } = rule;
        if (isReadingFamily(style.getPropertyValue("font-family"))
          && failed.some((face) =>
            face.style === style.getPropertyValue("font-style")
            && face.weight === style.getPropertyValue("font-weight")
            && READING_FACES.some((expected) =>
              face.style === expected.style && face.weight === expected.weight))) {
          // Preserve all descriptors, the source URL's stylesheet base and order.
          const declaration = rule.cssText;
          // Insert first: a read-only/unsupported CSSOM must not lose the source.
          container.insertRule(declaration, index);
          container.deleteRule(index + 1);
        }
      } else if (rule instanceof CSSImportRule && rule.styleSheet) {
        visit(rule.styleSheet);
      } else if ("cssRules" in rule) {
        visit(rule as CSSGroupingRule);
      }
    }
  };
  Array.from(document.styleSheets).forEach(visit);
};

/** Loads the declared Latin reading faces, rejecting missing/fallback matches.
 * FontFaceSet.check/ready alone cannot establish that a custom face loaded.
 * A failed attempt is retryable; simultaneous callers share the same promise.
 */
export const loadDyslexiaFont = (): Promise<void> => {
  if (fontLoaded) return Promise.resolve();
  if (inFlight) return inFlight;
  const revision = resourceRevision;
  const attempt = Promise.resolve().then(async () => {
    if (typeof document === "undefined" || !document.fonts?.load) {
      throw new Error("Font loading is unavailable in this browser");
    }
    renewErroredDeclarations();
    // Keep the shared attempt pending until every sibling request settles. A
    // quick failure must not let Retry recreate rules still loading resources.
    const results = await Promise.allSettled(READING_FACES.map(async ({ style, weight }) => {
      const faces = await document.fonts.load(
        `${style} ${weight} 16px "OpenDyslexic"`,
        "Aa",
      );
      if (!faces.some((face) =>
        isReadingFamily(face.family)
        && face.status === "loaded"
        && face.style === style
        && face.weight === weight
      )) {
        throw new Error(`Declared OpenDyslexic ${style} ${weight} face did not load`);
      }
    }));
    const failure = results.find((result) => result.status === "rejected");
    if (failure?.status === "rejected") throw failure.reason;
    if (revision === resourceRevision) fontLoaded = true;
  });
  inFlight = attempt;
  // Observe both outcomes without swallowing the returned promise's rejection.
  const clear = () => { if (inFlight === attempt) inFlight = undefined; };
  void attempt.then(clear, clear);
  return attempt;
};

/** Applies effective rendering only; persistence remains owned by device prefs.
 * The data attribute exposes off/loading/ready/error without claiming UI wiring.
 * Arabic and unsupported Latin characters use the canonical CSS fallback stack.
 */
export const applyDyslexiaFont = (enabled: boolean): void => {
  const root = document.documentElement;
  const revision = ++applicationRevision;
  // Remove the old implementation's inline stack, so CSS remains the sole owner.
  root.style.removeProperty("--font-body");
  root.classList.remove("dyslexia-font");
  if (!enabled) {
    root.dataset.alternateFont = "off";
    return;
  }
  const activate = () => {
    if (revision !== applicationRevision) return;
    root.classList.add("dyslexia-font");
    root.dataset.alternateFont = "ready";
  };
  if (fontLoaded) {
    activate();
    return;
  }
  root.dataset.alternateFont = "loading";
  void loadDyslexiaFont().then(activate, (error: unknown) => {
    if (revision !== applicationRevision) return;
    root.dataset.alternateFont = "error";
    console.warn("Optional Latin reading font could not be loaded:", error);
  });
};

/** Reset internal state for tests; invalidate completions from older attempts. */
export const _resetFontLoaded = (): void => {
  fontLoaded = false;
  inFlight = undefined;
  resourceRevision += 1;
  applicationRevision += 1;
};
