/** Test-only WCAG sRGB math. Opaque hex pairs only: no guessed alpha/gradient backdrop. */
export const relativeLuminance = (hex: string): number => {
  if (!/^#(?:[\da-f]{3}|[\da-f]{6})$/i.test(hex)) {
    throw new Error(`Expected an opaque #RGB or #RRGGBB color, received ${hex}`);
  }
  const digits = hex.length === 4
    ? hex.slice(1).split("").map((digit) => digit + digit).join("")
    : hex.slice(1);
  const linear = (offset: number): number => {
    const channel = parseInt(digits.slice(offset, offset + 2), 16) / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * linear(0) + 0.7152 * linear(2) + 0.0722 * linear(4);
};

export const contrastRatio = (foreground: string, background: string): number => {
  const first = relativeLuminance(foreground);
  const second = relativeLuminance(background);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
};

/** CSS uses 96px/in and 72pt/in: 18pt = 24px; 14pt = 56/3px, NOT 14px. */
export const requiredTextContrast = (
  fontSizePx: number,
  fontWeight: number,
  level: "AA" | "AAA" = "AA",
): number => {
  if (!Number.isFinite(fontSizePx) || fontSizePx <= 0 ||
      !Number.isFinite(fontWeight) || fontWeight < 1 || fontWeight > 1000) {
    throw new Error("Font size/weight must be finite positive CSS values");
  }
  const large = fontSizePx >= 24 || (fontSizePx >= 56 / 3 && fontWeight >= 700);
  return level === "AAA" ? (large ? 4.5 : 7) : (large ? 3 : 4.5);
};

export const assertTextContrast = (
  foreground: string,
  background: string,
  fontSizePx: number,
  fontWeight: number,
  level: "AA" | "AAA" = "AA",
): void => {
  const ratio = contrastRatio(foreground, background);
  const required = requiredTextContrast(fontSizePx, fontWeight, level);
  // Never round a near-threshold failure into a pass.
  if (ratio < required) {
    throw new Error(`Text contrast ${ratio}:1 is below ${level} ${required}:1 (${fontSizePx}px, weight ${fontWeight})`);
  }
};

/**
 * Read one literal token from the canonical file's flat :root/.dark blocks.
 * This is a source-token audit, NOT browser cascade/compositing verification.
 * Missing/unsupported colors fail closed instead of borrowing another theme.
 */
export const scopedHexToken = (css: string, selector: ":root" | ".dark", token: string): string => {
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, "");
  let value: string | undefined;
  for (const block of withoutComments.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (block[1]?.trim() !== selector) continue;
    for (const declaration of (block[2] ?? "").split(";")) {
      const colon = declaration.indexOf(":");
      if (colon < 0 || declaration.slice(0, colon).trim() !== token) continue;
      value = declaration.slice(colon + 1).trim();
    }
  }
  if (value === undefined) throw new Error(`Missing ${selector} token ${token}`);
  relativeLuminance(value); // Reject unsupported/transparent/gradient values.
  return value;
};
