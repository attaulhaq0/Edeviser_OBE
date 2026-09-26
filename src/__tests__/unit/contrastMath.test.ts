// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  assertTextContrast, contrastRatio, relativeLuminance,
  requiredTextContrast, scopedHexToken,
} from "@/__tests__/helpers/contrast";

describe("WCAG opaque sRGB contrast math", () => {
  it("uses linearized sRGB luminance, not raw channel averages", () => {
    expect(relativeLuminance("#000000")).toBe(0);
    expect(relativeLuminance("#FFFFFF")).toBe(1);
    expect(relativeLuminance("#ff0000")).toBeCloseTo(0.2126, 8);
    expect(relativeLuminance("#00ff00")).toBeCloseTo(0.7152, 8);
    expect(relativeLuminance("#0000ff")).toBeCloseTo(0.0722, 8);
    expect(relativeLuminance("#808080")).toBeCloseTo(0.2158605, 6);
  });

  it("returns 21:1 for black/white, 1:1 for equal colors and symmetric ratios", () => {
    expect(contrastRatio("#000", "#fff")).toBe(21);
    expect(contrastRatio("#123456", "#123456")).toBe(1);
    expect(contrastRatio("#0382BD", "#fff")).toBe(contrastRatio("#fff", "#0382BD"));
  });

  it("does not round the known 4.478...:1 gray/white failure up to 4.5", () => {
    expect(contrastRatio("#777", "#fff")).toBeCloseTo(4.478089, 5);
    expect(() => assertTextContrast("#777", "#fff", 16, 400)).toThrow(/below AA 4.5/);
    expect(() => assertTextContrast("#767676", "#fff", 16, 400)).not.toThrow();
  });

  it.each(["transparent", "#fff8", "#ffffff80", "rgb(0,0,0)", "#gggggg", "#12345", "var(--foreground)"])("fails closed for unsupported color %s", (value) => {
    expect(() => relativeLuminance(value)).toThrow(/opaque/);
  });

  it.each([
    [14, 700, 4.5], [18, 700, 4.5], [18.66, 700, 4.5],
    [56 / 3, 700, 3], [56 / 3, 600, 4.5], [23.99, 400, 4.5], [24, 400, 3],
  ])("requires the correct ratio at %spx / weight %s", (size, weight, expected) => {
    expect(requiredTextContrast(size, weight)).toBe(expected);
  });

  it("applies AAA thresholds independently", () => {
    expect(requiredTextContrast(16, 400, "AAA")).toBe(7);
    expect(requiredTextContrast(24, 400, "AAA")).toBe(4.5);
    expect(requiredTextContrast(56 / 3, 700, "AAA")).toBe(4.5);
  });

  it("rejects a known brand/white pair at 14px bold but accepts genuinely large text", () => {
    expect(() => assertTextContrast("#0382BD", "#fff", 14, 700)).toThrow(/below AA 4.5/);
    expect(() => assertTextContrast("#0382BD", "#fff", 56 / 3, 700)).not.toThrow();
    expect(() => assertTextContrast("#0382BD", "#fff", 24, 400)).not.toThrow();
  });

  it("rejects a deliberately low-contrast fixture even at large sizes", () => {
    expect(() => assertTextContrast("#eee", "#fff", 32, 700)).toThrow(/below AA 3/);
  });

  it.each([[0, 400], [NaN, 400], [16, Infinity], [16, 0]])("fails invalid font size/weight %s / %s", (size, weight) => {
    expect(() => requiredTextContrast(size, weight)).toThrow(/finite positive/);
  });
});

describe("scope-aware canonical token reader", () => {
  const css = "/* :root { --text: #bad; } */ :root { --text: #123456; --surface: #fff; } .dark { --text: #abcdef; --surface: #000; }";
  it("does not accidentally test the light declaration for a dark pair", () => {
    expect(scopedHexToken(css, ":root", "--text")).toBe("#123456");
    expect(scopedHexToken(css, ".dark", "--text")).toBe("#abcdef");
  });
  it("fails missing selectors/tokens and does not use prefix matches", () => {
    expect(() => scopedHexToken(css, ":root", "--tex")).toThrow(/Missing/);
    expect(() => scopedHexToken(":root { --text: #fff; }", ".dark", "--text")).toThrow(/Missing/);
  });
  it("uses the last declaration and rejects unsupported values", () => {
    expect(scopedHexToken(":root { --text: #000; --text: #fff; }", ":root", "--text")).toBe("#fff");
    expect(() => scopedHexToken(":root { --text: rgba(0,0,0,0.5); }", ":root", "--text")).toThrow(/opaque/);
  });
});
