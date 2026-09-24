// @vitest-environment node
// Source + real Tailwind compilation contracts. Not browser paint, focus, modal
// stacking, preference wiring, whole-app AAA, or reviewed screenshot evidence.
import { beforeAll, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import postcss, { type Root, type Rule } from "postcss";
import { compile } from "@tailwindcss/node";
import { contrastRatio, relativeLuminance } from "@/__tests__/helpers/contrast";

const entry = readFileSync(resolve("src/index.css"), "utf8");
const accessibility = readFileSync(resolve("src/design-system/accessibility.css"), "utf8");
const portals = readFileSync(resolve("src/design-system/portals.css"), "utf8");
const tokens = readFileSync(resolve("src/design-system/tokens.css"), "utf8");
let compiled: Root;

beforeAll(async () => {
  const result = await compile(entry, { base: resolve("src"), onDependency: () => {} });
  compiled = postcss.parse(result.build([
    "z-50", "max-h-[50vh]", "overflow-y-auto", "bg-primary", "text-primary-foreground",
    "hover:bg-primary/90", "hover:bg-secondary/80", "dark:bg-input/30", "dark:hover:bg-input/50",
    "bg-destructive", "text-white", "hover:bg-destructive/90", "dark:bg-destructive/60",
    "focus-visible:ring-ring/50", "focus-visible:ring-[3px]",
  ]));
});

function declarations(root: Root, selector: string): Map<string, string> {
  const result = new Map<string, string>();
  root.walkRules((rule) => {
    if (rule.selector === selector) rule.walkDecls((decl) => { result.set(decl.prop, decl.value); });
  });
  if (!result.size) throw new Error(`Missing CSS selector ${selector}`);
  return result;
}

function color(values: Map<string, string>, name: string, visited = new Set<string>()): string {
  if (visited.has(name)) throw new Error(`Cyclic color alias ${name}`);
  visited.add(name);
  const value = values.get(name);
  if (!value) throw new Error(`Missing semantic color ${name}`);
  const alias = /^var\((--[\w-]+)\)$/.exec(value)?.[1];
  if (alias) return color(values, alias, visited);
  relativeLuminance(value); // Opaque supported colors only; do not guess backdrops.
  return value;
}

function composite(foreground: string, background: string, alpha: number): string {
  const expand = (hex: string) => hex.length === 4 ? `#${hex.slice(1).split("").map((v) => v + v).join("")}` : hex;
  const front = expand(foreground), back = expand(background);
  return `#${[1, 3, 5].map((offset) => Math.round(
    parseInt(front.slice(offset, offset + 2), 16) * alpha + parseInt(back.slice(offset, offset + 2), 16) * (1 - alpha)
  ).toString(16).padStart(2, "0")).join("")}`;
}

const pairs = [
  ["--foreground", "--background"], ["--card-foreground", "--card"], ["--popover-foreground", "--popover"],
  ["--primary-foreground", "--primary"], ["--secondary-foreground", "--secondary"],
  ["--destructive-foreground", "--destructive"], ["--destructive-foreground", "--a11y-destructive-hover"],
  ["--muted-foreground", "--muted"], ["--accent-foreground", "--accent"],
  ["--foreground", "--input-background"], ["--muted-foreground", "--input-background"],
  ["--sidebar-foreground", "--sidebar"], ["--sidebar-primary-foreground", "--sidebar-primary"],
  ["--sidebar-accent-foreground", "--sidebar-accent"],
  ["--action-primary-text", "--action-primary"], ["--action-primary-text", "--action-primary-hover"],
  ["--action-primary-text", "--action-primary-active"],
  ...["--background", "--card", "--popover", "--muted", "--accent"].flatMap((surface) =>
    ["--muted-foreground", "--primary", "--secondary", "--destructive"].map((text) => [text, surface] as const)),
  ...["success", "warning", "error", "info"].flatMap((status) => [
    [`--${status}-foreground`, `--${status}-subtle`] as const,
    [`--${status}-foreground`, "--card"] as const,
  ]),
] as const;

for (const dark of [false, true]) {
  describe(`high-contrast ${dark ? "dark" : "light"} semantic pairs`, () => {
    const palette = () => new Map([
      ...declarations(compiled, ":root.high-contrast"),
      ...(dark ? declarations(compiled, ":root.dark.high-contrast") : []),
    ]);
    it.each(pairs)("%s on %s reaches unrounded 7:1 for normal text", (foreground, background) => {
      const values = palette();
      expect(contrastRatio(color(values, foreground), color(values, background))).toBeGreaterThanOrEqual(7);
    });
    it("keeps core boundaries and icon/focus colors at least 3:1", () => {
      const values = palette();
      for (const surface of ["--background", "--card", "--popover", "--muted", "--accent"]) {
        for (const boundary of ["--border", "--input", "--ring"]) {
          expect(contrastRatio(color(values, boundary), color(values, surface))).toBeGreaterThanOrEqual(3);
        }
        for (const translucent of ["--ring", "--muted-foreground"]) {
          const back = color(values, surface);
          expect(contrastRatio(composite(color(values, translucent), back, 0.5), back)).toBeGreaterThanOrEqual(3);
        }
      }
    });
    it("checks the known generated hover alpha blends against declared core backdrops", () => {
      const values = palette();
      for (const backdrop of ["--background", "--card", "--popover"]) {
        const back = color(values, backdrop);
        for (const [fill, foreground, alpha] of [
          ["--primary", "--primary-foreground", 0.9], ["--secondary", "--secondary-foreground", 0.8],
        ] as const) {
          expect(contrastRatio(color(values, foreground), composite(color(values, fill), back, alpha))).toBeGreaterThanOrEqual(7);
        }
        if (dark) for (const alpha of [0.3, 0.5]) {
          expect(contrastRatio(color(values, "--foreground"), composite(color(values, "--input"), back, alpha))).toBeGreaterThanOrEqual(7);
        }
      }
    });
    it("retains the intended light/dark canvas rather than whitening dark mode", () => {
      const values = palette();
      expect(values.get("color-scheme")).toBe(dark ? "dark" : "light");
      expect(relativeLuminance(color(values, "--background"))).toBe(dark ? relativeLuminance("#080808") : 1);
    });
  });
}

describe("shared accessibility/portal adoption ownership", () => {
  it("imports each owner once and removes old descendant paint / 100ms restoration", () => {
    for (const file of ["accessibility", "portals"]) expect(entry.split(`@import "./design-system/${file}.css";`)).toHaveLength(2);
    expect(entry).not.toMatch(/\.high-contrast|\.reduce-animations/);
    const root = postcss.parse(accessibility);
    root.walkRules((rule) => {
      expect(/^:root\.(?:dark\.high-contrast|high-contrast|reduce-animations)/.test(rule.selector)).toBe(true);
      if (rule.selector.includes("high-contrast")) expect(rule.selector).not.toMatch(/\*|text-gray|text-slate/);
    });
    root.walkDecls((decl) => {
      expect(decl.prop).not.toMatch(/font|scroll-margin|scroll-padding|z-index/);
      if (decl.important) expect(["animation-duration", "animation-delay", "animation-iteration-count", "transition-duration", "transition-delay"]).toContain(decl.prop);
    });
    const motion = root.nodes.filter((node): node is Rule => node.type === "rule" && node.selector.includes("reduce-animations"));
    expect(motion).toHaveLength(1);
    const values = declarations(root, motion[0]?.selector ?? "");
    expect(values.get("transition-duration")).toBe("0.01ms");
    expect(values.get("animation-duration")).toBe("0.01ms");
    expect(values.get("animation-delay")).toBe("0ms");
    expect(values.get("transition-delay")).toBe("0ms");
  });

  it("adopts only the actual destructive slot/variant without important paint", () => {
    const selector = ':root.high-contrast [data-slot="button"][data-variant="destructive"]';
    expect(declarations(compiled, selector).get("background-color")).toBe("var(--destructive)");
    expect(declarations(compiled, selector).get("color")).toBe("var(--destructive-foreground)");
    expect(declarations(compiled, `${selector}:hover`).get("background-color")).toBe("var(--a11y-destructive-hover)");
    expect(declarations(compiled, `${selector}:focus-visible`).get("outline")).toBe("2px solid var(--ring)");
    const button = readFileSync(resolve("src/components/ui/button.tsx"), "utf8");
    expect(button).toContain('data-slot="button"');
    expect(button).toContain("data-variant={variant}");
    expect(button).toContain("dark:bg-destructive/60"); // Known generated mismatch is not silently edited.
  });

  it("preserves the normal semantic themes and toast layer", () => {
    const base = declarations(compiled, ":root"), dark = declarations(compiled, ".dark");
    expect(base.get("--background")?.toLowerCase()).toBe("#f3f7fb");
    expect(dark.get("--background")?.toLowerCase()).toBe("#0a1628");
    const raw = declarations(postcss.parse(tokens), ":root");
    expect(raw.get("--z-toast")).toBe("11000");
    const ordered = ["--z-modal-overlay", "--z-modal", "--z-floating", "--z-floating-submenu"].map((name) => Number(raw.get(name)));
    expect(ordered).toEqual([1000, 1010, 1020, 1030]);
    expect(Math.min(...ordered)).toBeGreaterThan(220);
    expect(Math.max(...ordered)).toBeLessThan(10000);
    for (const file of ["GlobalHeader", "Sidebar", "MobileTabBar", "GamificationFeedbackHost"]) {
      const source = readFileSync(resolve(`src/components/shared/${file}.tsx`), "utf8");
      const layers = [...source.matchAll(/\bz-\[(\d+)\]|\bz-(\d+)/g)].map((match) => Number(match[1] ?? match[2]));
      expect(layers.length).toBeGreaterThan(0);
      expect(Math.max(...layers)).toBeLessThan(Math.min(...ordered));
    }
    const tour = readFileSync(resolve("src/components/shared/TourRunner.tsx"), "utf8");
    expect(tour).toMatch(/zIndex:\s*10000/); // Deliberately unresolved concurrent-tour ownership.
    expect(readFileSync(resolve("src/components/shared/SkipToMain.tsx"), "utf8")).toContain("focus:z-[9999]");
  });

  it("adopts only slots that actually exist and leaves absent families/popover deferred", () => {
    const root = postcss.parse(portals);
    const inventory = [
      ["dialog", "dialog-overlay", "--z-modal-overlay"], ["dialog", "dialog-content", "--z-modal"],
      ["sheet", "sheet-overlay", "--z-modal-overlay"], ["sheet", "sheet-content", "--z-modal"],
      ["dropdown-menu", "dropdown-menu-content", "--z-floating"], ["dropdown-menu", "dropdown-menu-sub-content", "--z-floating-submenu"],
      ["select", "select-content", "--z-floating"], ["tooltip", "tooltip-content", "--z-floating"],
    ] as const;
    for (const [file, slot, layer] of inventory) {
      expect(readFileSync(resolve(`src/components/ui/${file}.tsx`), "utf8")).toContain(`data-slot="${slot}"`);
      let found = false;
      root.walkRules((rule) => {
        if (!rule.selectors.includes(`[data-slot="${slot}"]`)) return;
        rule.walkDecls("z-index", (decl) => {
          found = true;
          expect(rule.parent?.type).toBe("root");
          expect(decl.value).toBe(`var(${layer})`);
          expect(decl.important).not.toBe(true);
        });
      });
      expect(found).toBe(true);
    }
    const allowedSelectors = inventory.map(([, slot]) => `[data-slot="${slot}"]`);
    root.walkRules((rule) => {
      for (const selector of rule.selectors) expect(allowedSelectors).toContain(selector);
      expect(rule.selector).not.toMatch(/popover|alert-dialog|context-menu|hover-card|menubar|role=|style\*/);
    });
    expect(readFileSync(resolve("src/components/ui/popover.tsx"), "utf8")).not.toContain("data-slot=");
  });

  it("keeps modal scroll defaults below caller utility priority and does not resize floating widgets", () => {
    const root = postcss.parse(portals);
    root.walkDecls((decl) => {
      expect(decl.important).not.toBe(true);
      if (decl.prop === "z-index") return;
      expect(["max-block-size", "overflow-y", "overscroll-behavior"]).toContain(decl.prop);
      const rule = decl.parent;
      expect(rule?.type).toBe("rule");
      if (rule?.type !== "rule") throw new Error("Expected portal rule");
      expect([ '[data-slot="dialog-content"]', '[data-slot="sheet-content"]' ]).toContain(rule.selector);
      expect(rule.parent?.type).toBe("atrule");
      if (rule.parent?.type !== "atrule") throw new Error("Expected low-priority layer");
      expect(rule.parent.name).toBe("layer");
      expect(rule.parent.params).toBe("base");
    });
    let smallerBound = false;
    compiled.walkDecls("max-height", (decl) => { if (decl.value === "50vh") smallerBound = true; });
    expect(smallerBound).toBe(true);
  });
});
