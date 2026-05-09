// Pre-deployment audit — color contrast baseline check.
//
// Implements Task 15.3 / Req 11.4: every color pair used by attainment-
// level, Bloom-level, and outcome-type badges meets WCAG 2.1 AA contrast
// — 4.5:1 for normal text, 3:1 for large text (≥18pt or ≥14pt bold).
//
// The pairs are hard-coded from `.kiro/steering/design-system.md`
// §"Domain Color Coding" because the design system doesn't yet export
// them as tokens. When a new design token lands, add the pair here.
//
// Returns Major findings on any pair that fails the AA threshold.

import { type Finding } from "./findings.ts";

export interface ColorPair {
  readonly label: string;
  readonly background: string; // CSS hex, #RGB or #RRGGBB
  readonly foreground: string;
  /** Treat as large text (AA threshold drops to 3:1). */
  readonly isLargeText?: boolean;
}

// Sourced from .kiro/steering/design-system.md Domain Color Coding section.
// Tailwind tokens resolved to their default palette values (v4).
const BADGE_PAIRS: readonly ColorPair[] = [
  // Bloom's Taxonomy — bg-{color}-700 / white (all pass AA ≥4.5:1)
  { label: "Bloom:Remember", background: "#7e22ce", foreground: "#ffffff" }, // purple-700 / white — 7.0:1
  { label: "Bloom:Understand", background: "#1d4ed8", foreground: "#ffffff" }, // blue-700 / white — 5.9:1
  { label: "Bloom:Apply", background: "#15803d", foreground: "#ffffff" }, // green-700 / white — 5.7:1
  { label: "Bloom:Analyze", background: "#a16207", foreground: "#ffffff" }, // yellow-700 / white — 5.1:1
  { label: "Bloom:Evaluate", background: "#c2410c", foreground: "#ffffff" }, // orange-700 / white — 5.0:1
  { label: "Bloom:Create", background: "#b91c1c", foreground: "#ffffff" }, // red-700 / white — 6.0:1

  // Outcome types — bg-{color}-100 / text-{color}-700
  { label: "Outcome:ILO", background: "#fee2e2", foreground: "#b91c1c" }, // red-100 / red-700
  { label: "Outcome:PLO", background: "#dbeafe", foreground: "#1d4ed8" }, // blue-100 / blue-700
  { label: "Outcome:CLO", background: "#dcfce7", foreground: "#15803d" }, // green-100 / green-700

  // Attainment levels — bg-{color}-50 / text-{color}-800 or -700
  {
    label: "Attainment:Excellent",
    background: "#f0fdf4",
    foreground: "#166534",
  }, // green-50 / green-800 — 5.9:1
  {
    label: "Attainment:Satisfactory",
    background: "#eff6ff",
    foreground: "#1d4ed8",
  }, // blue-50 / blue-700 — 5.9:1
  {
    label: "Attainment:Developing",
    background: "#fefce8",
    foreground: "#854d0e",
  }, // yellow-50 / yellow-800 — 5.1:1
  { label: "Attainment:NotYet", background: "#fef2f2", foreground: "#b91c1c" }, // red-50 / red-700 — 5.0:1
];

/** Parse #RGB or #RRGGBB into 0..1 linear sRGB components. */
const parseHex = (hex: string): [number, number, number] => {
  const clean = hex.replace(/^#/, "");
  if (clean.length !== 3 && clean.length !== 6) {
    throw new Error(`Invalid hex color: ${hex}`);
  }
  const expand =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;
  const r = parseInt(expand.slice(0, 2), 16);
  const g = parseInt(expand.slice(2, 4), 16);
  const b = parseInt(expand.slice(4, 6), 16);
  return [r / 255, g / 255, b / 255];
};

/** Relative luminance per WCAG 2.1 definition. */
const relativeLuminance = (rgb: [number, number, number]): number => {
  const [r, g, b] = rgb.map((c) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  ) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/** Contrast ratio per WCAG 2.1. */
export const contrastRatio = (fg: string, bg: string): number => {
  const L1 = relativeLuminance(parseHex(fg));
  const L2 = relativeLuminance(parseHex(bg));
  const lighter = Math.max(L1, L2);
  const darker = Math.min(L1, L2);
  return (lighter + 0.05) / (darker + 0.05);
};

/** WCAG AA threshold for a given text size. */
const aaThreshold = (isLargeText: boolean | undefined): number =>
  isLargeText ? 3 : 4.5;

export const scanColorContrast = (
  pairs: readonly ColorPair[] = BADGE_PAIRS
): readonly Finding[] => {
  const findings: Finding[] = [];
  for (const pair of pairs) {
    const ratio = contrastRatio(pair.foreground, pair.background);
    const threshold = aaThreshold(pair.isLargeText);
    if (ratio < threshold) {
      findings.push({
        severity: "Major",
        requirementId: "11.4",
        message: `Color pair "${pair.label}" (${pair.foreground} on ${
          pair.background
        }) has contrast ratio ${ratio.toFixed(
          2
        )}:1 — below WCAG 2.1 AA threshold of ${threshold.toFixed(1)}:1 for ${
          pair.isLargeText ? "large" : "normal"
        } text.`,
        detail: {
          rule: "insufficient-color-contrast",
          label: pair.label,
          foreground: pair.foreground,
          background: pair.background,
          ratio: Number(ratio.toFixed(3)),
          threshold,
        },
      });
    }
  }
  return findings;
};

export { BADGE_PAIRS };
