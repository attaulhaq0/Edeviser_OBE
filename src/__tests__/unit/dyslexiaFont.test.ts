// Feature: i18n-rtl-support — declared optional-font delivery and toggle lifecycle.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { applyDyslexiaFont, loadDyslexiaFont, _resetFontLoaded } from "@/lib/fontPreferences";
import { applyDirection } from "@/lib/directionManager";
import { accessibilityPreferencesSchema, applyAccessibilityPreferences } from "@/lib/accessibilityPreferences";

const originalFonts = Object.getOwnPropertyDescriptor(document, "fonts");
const faceFor = (font: string): FontFace => {
  const [style = "normal", weight = "400"] = font.split(" ");
  return { family: '"OpenDyslexic"', style, weight, status: "loaded" } as FontFace;
};
const load = vi.fn(async (font: string): Promise<FontFace[]> => [faceFor(font)]);
const root = document.documentElement;
const nativeFaces = new Set<FontFace>();
let declarationSheet: HTMLStyleElement | undefined;

beforeEach(() => {
  _resetFontLoaded();
  load.mockReset().mockImplementation(async (font) => [faceFor(font)]);
  nativeFaces.clear();
  Object.defineProperty(document, "fonts", {
    configurable: true, value: { load, forEach: nativeFaces.forEach.bind(nativeFaces) },
  });
  root.classList.remove("dyslexia-font");
  root.style.removeProperty("--font-body");
  delete root.dataset.alternateFont;
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  _resetFontLoaded();
  if (originalFonts) Object.defineProperty(document, "fonts", originalFonts);
  else Reflect.deleteProperty(document, "fonts");
  root.classList.remove("dyslexia-font", "high-contrast", "reduce-animations", "simplified-view");
  root.style.removeProperty("font-size");
  root.style.removeProperty("--font-body");
  root.removeAttribute("lang");
  root.removeAttribute("dir");
  delete root.dataset.alternateFont;
  declarationSheet?.remove();
  declarationSheet = undefined;
  vi.restoreAllMocks();
});

describe("declared reading font loader", () => {
  it("loads all four exact CSS faces using Latin sample text, without constructing faces", async () => {
    await loadDyslexiaFont();
    expect(load.mock.calls).toEqual([
      ['normal 400 16px "OpenDyslexic"', "Aa"],
      ['normal 700 16px "OpenDyslexic"', "Aa"],
      ['italic 400 16px "OpenDyslexic"', "Aa"],
      ['italic 700 16px "OpenDyslexic"', "Aa"],
    ]);
    expect(root.classList.contains("dyslexia-font")).toBe(false);
  });

  it("deduplicates concurrent requests and caches successful completion", async () => {
    const first = loadDyslexiaFont();
    const second = loadDyslexiaFont();
    expect(second).toBe(first);
    await Promise.all([first, second]);
    await loadDyslexiaFont();
    expect(load).toHaveBeenCalledTimes(4);
  });

  it.each(["empty", "fallback", "unloaded", "wrong weight", "wrong style"])(
    "rejects %s results rather than treating them as successful custom-font loading",
    async (kind) => {
      load.mockImplementation(async (font) => {
        if (kind === "empty") return [];
        return [{ ...faceFor(font),
          ...(kind === "fallback" ? { family: "Arial" } : {}),
          ...(kind === "unloaded" ? { status: "unloaded" as const } : {}),
          ...(kind === "wrong weight" ? { weight: "300" } : {}),
          ...(kind === "wrong style" ? { style: "oblique" } : {}),
        }];
      });
      await expect(loadDyslexiaFont()).rejects.toThrow("did not load");
      expect(root.classList.contains("dyslexia-font")).toBe(false);
    },
  );

  it("recreates only the errored canonical rule without changing its descriptors", async () => {
    declarationSheet = document.createElement("style");
    declarationSheet.textContent = `@font-face { font-family: "OpenDyslexic"; font-style: normal; font-weight: 400; src: url("./canonical.woff"); unicode-range: U+0020-007E; font-display: swap; }
      @font-face { font-family: "OpenDyslexic"; font-style: italic; font-weight: 700; src: url("./other.woff"); }`;
    document.head.append(declarationSheet);
    const sheet = declarationSheet.sheet!;
    const original = sheet.cssRules[0];
    const text = original!.cssText;
    const insert = vi.spyOn(sheet, "insertRule");
    const remove = vi.spyOn(sheet, "deleteRule");
    const failed = { ...faceFor("normal 400"), status: "error" } as FontFace;
    nativeFaces.add(failed);
    // Unlike the old mock-reset test, retries remain rejected until the CSS
    // declaration really changes. Native Chromium proof lives in the audit script.
    load.mockImplementation(async (font) => {
      if (font.startsWith("normal 400") && sheet.cssRules[0] === original) {
        throw new Error("sticky native failure");
      }
      return [faceFor(font)];
    });
    await loadDyslexiaFont();
    expect(remove).toHaveBeenCalledExactlyOnceWith(1);
    expect(insert).toHaveBeenCalledExactlyOnceWith(text, 0);
    expect(sheet.cssRules).toHaveLength(2);
    expect(sheet.cssRules[0]!.cssText).toBe(text);
  });

  it("preserves the canonical rule and truthful error if CSSOM insertion is refused", async () => {
    declarationSheet = document.createElement("style");
    declarationSheet.textContent = '@font-face { font-family: "OpenDyslexic"; font-style: normal; font-weight: 400; src: url("./canonical.woff"); }';
    document.head.append(declarationSheet);
    const sheet = declarationSheet.sheet!;
    const original = sheet.cssRules[0];
    nativeFaces.add({ ...faceFor("normal 400"), status: "error" } as FontFace);
    vi.spyOn(sheet, "insertRule").mockImplementation(() => { throw new Error("read-only stylesheet"); });
    const remove = vi.spyOn(sheet, "deleteRule");
    applyDyslexiaFont(true);
    await expect(loadDyslexiaFont()).rejects.toThrow("read-only stylesheet");
    expect(sheet.cssRules[0]).toBe(original);
    expect(remove).not.toHaveBeenCalled();
    expect(load).not.toHaveBeenCalled();
    expect(root.dataset.alternateFont).toBe("error");
    expect(root.classList.contains("dyslexia-font")).toBe(false);
  });

  it("does not pretend an errored face without an accessible declaration recovered", async () => {
    nativeFaces.add({ ...faceFor("normal 400"), status: "error" } as FontFace);
    load.mockRejectedValue(new Error("sticky native failure"));
    await expect(loadDyslexiaFont()).rejects.toThrow("sticky native failure");
    await expect(loadDyslexiaFont()).rejects.toThrow("sticky native failure");
    expect(load).toHaveBeenCalledTimes(8);
  });

  it("shares a failed attempt until sibling transports settle and keeps OFF immediate", async () => {
    let release = () => {};
    const gate = new Promise<void>((resolve) => { release = resolve; });
    load.mockImplementation(async (font) => {
      if (font.startsWith("normal 400")) throw new Error("blocked");
      await gate;
      return [faceFor(font)];
    });
    applyDyslexiaFont(true);
    const pending = loadDyslexiaFont();
    await Promise.resolve();
    await Promise.resolve();
    expect(loadDyslexiaFont()).toBe(pending);
    expect(root.dataset.alternateFont).toBe("loading");
    applyDyslexiaFont(false);
    expect(root.dataset.alternateFont).toBe("off");
    release();
    await expect(pending).rejects.toThrow("blocked");
    expect(root.dataset.alternateFont).toBe("off");
    expect(root.classList.contains("dyslexia-font")).toBe(false);
  });

  it("rejects a missing FontFaceSet API explicitly", async () => {
    Object.defineProperty(document, "fonts", { configurable: true, value: undefined });
    await expect(loadDyslexiaFont()).rejects.toThrow("unavailable");
  });
});

describe("effective reading mode application", () => {
  it("does not fetch optional assets while off", () => {
    applyDyslexiaFont(false);
    expect(load).not.toHaveBeenCalled();
    expect(root.dataset.alternateFont).toBe("off");
  });

  it("activates only after loading and removes obsolete inline family ownership", async () => {
    root.style.setProperty("--font-body", "old-inline-font");
    applyDyslexiaFont(true);
    expect(root.dataset.alternateFont).toBe("loading");
    expect(root.classList.contains("dyslexia-font")).toBe(false);
    expect(root.style.getPropertyValue("--font-body")).toBe("");
    await loadDyslexiaFont();
    expect(root.dataset.alternateFont).toBe("ready");
    expect(root.classList.contains("dyslexia-font")).toBe(true);
    applyDyslexiaFont(false);
    expect(root.classList.contains("dyslexia-font")).toBe(false);
    applyDyslexiaFont(true);
    expect(root.dataset.alternateFont).toBe("ready");
    expect(load).toHaveBeenCalledTimes(4);
  });

  it("does not re-enable the class when disabled during a pending load", async () => {
    let release = () => {};
    const gate = new Promise<void>((resolve) => { release = resolve; });
    load.mockImplementation(async (font) => { await gate; return [faceFor(font)]; });
    applyDyslexiaFont(true);
    const pending = loadDyslexiaFont();
    applyDyslexiaFont(false);
    release();
    await pending;
    expect(root.dataset.alternateFont).toBe("off");
    expect(root.classList.contains("dyslexia-font")).toBe(false);
  });

  it("honors the newest on/off/on choice while sharing the pending request", async () => {
    applyDyslexiaFont(true);
    applyDyslexiaFont(false);
    applyDyslexiaFont(true);
    await loadDyslexiaFont();
    expect(root.dataset.alternateFont).toBe("ready");
    expect(root.classList.contains("dyslexia-font")).toBe(true);
    expect(load).toHaveBeenCalledTimes(4);
  });

  it("keeps fallback and observable error state on failure, then retries", async () => {
    load.mockResolvedValue([]);
    applyDyslexiaFont(true);
    await expect(loadDyslexiaFont()).rejects.toThrow();
    expect(root.dataset.alternateFont).toBe("error");
    expect(root.classList.contains("dyslexia-font")).toBe(false);
    load.mockImplementation(async (font) => [faceFor(font)]);
    applyDyslexiaFont(true);
    await loadDyslexiaFont();
    expect(root.dataset.alternateFont).toBe("ready");
  });

  it("ignores a stale rejection after disabling", async () => {
    load.mockRejectedValue(new Error("blocked"));
    applyDyslexiaFont(true);
    const pending = loadDyslexiaFont();
    applyDyslexiaFont(false);
    await expect(pending).rejects.toThrow("blocked");
    expect(root.dataset.alternateFont).toBe("off");
    expect(console.warn).not.toHaveBeenCalled();
  });

  it("invalidates old completions when internal state resets", async () => {
    applyDyslexiaFont(true);
    const old = loadDyslexiaFont();
    _resetFontLoaded();
    await old;
    expect(root.classList.contains("dyslexia-font")).toBe(false);
    await loadDyslexiaFont();
    expect(load).toHaveBeenCalledTimes(8);
  });

  it.each(["ar", "en"])("keeps %s direction changes independent of effective reading mode", async (language) => {
    applyDyslexiaFont(true);
    applyDirection(language);
    await loadDyslexiaFont();
    applyDirection(language === "ar" ? "en" : "ar");
    expect(root.classList.contains("dyslexia-font")).toBe(true);
    expect(root.style.fontFamily).toBe("");
  });

  it("uses the real accessibility apply path without changing device-persistence semantics", async () => {
    const prefs = accessibilityPreferencesSchema.parse({ dyslexia_font: true, font_size: "large" });
    const stored = localStorage.getItem("edeviser-accessibility-prefs");
    applyAccessibilityPreferences(prefs);
    expect(root.style.fontSize).toBe("18px");
    expect(root.dataset.alternateFont).toBe("loading");
    await loadDyslexiaFont();
    expect(root.classList.contains("dyslexia-font")).toBe(true);
    expect(localStorage.getItem("edeviser-accessibility-prefs")).toBe(stored);
    applyAccessibilityPreferences({ ...prefs, dyslexia_font: false });
    expect(root.dataset.alternateFont).toBe("off");
  });
});
