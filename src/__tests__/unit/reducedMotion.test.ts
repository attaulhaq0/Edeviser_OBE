import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const cssContent = readFileSync(resolve(__dirname, "../../index.css"), "utf-8");
const appContent = readFileSync(resolve(__dirname, "../../App.tsx"), "utf-8");
const motionContent = readFileSync(resolve(__dirname, "../../providers/AccessibilityMotion.tsx"), "utf-8");

const ALL_ANIMATION_CLASSES = [
  "animate-shimmer",
  "animate-xp-pulse",
  "animate-badge-pop",
  "animate-float",
  "animate-streak-flame",
  "animate-fade-in-up",
  "animate-node-unlock",
  "animate-mystery-reveal",
];

describe("Reduced motion support", () => {
  describe("CSS @media (prefers-reduced-motion: reduce)", () => {
    it("contains a prefers-reduced-motion media query block", () => {
      expect(cssContent).toContain("@media (prefers-reduced-motion: reduce)");
    });

    it("disables animation for all 8 custom animation classes", () => {
      const reducedMotionMatch = cssContent.match(
        /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{([^}]*\{[^}]*\})\s*\}/s
      );
      expect(reducedMotionMatch).not.toBeNull();
      const block = reducedMotionMatch![1];

      for (const cls of ALL_ANIMATION_CLASSES) {
        expect(block).toContain(`.${cls}`);
      }
    });

    it("sets animation: none inside the reduced-motion block", () => {
      const reducedMotionMatch = cssContent.match(
        /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{([^}]*\{[^}]*\})\s*\}/s
      );
      expect(reducedMotionMatch).not.toBeNull();
      const block = reducedMotionMatch![1];
      expect(block).toContain("animation: none");
    });
  });

  describe("Framer Motion global config", () => {
    it("imports the real MotionConfig in the single owned preference adapter", () => {
      expect(appContent).toContain("<AccessibilityMotion>");
      expect(motionContent).toMatch(
        /import\s*\{[^}]*MotionConfig[^}]*\}\s*from\s*['"]framer-motion['"]/
      );
    });

    it("adds stored reduction without ever overriding the OS with never", () => {
      expect(motionContent).toContain('reducedMotion={effective.reduced_animations ? "always" : "user"}');
      expect(motionContent).not.toContain('"never"');
      // Real MotionConfig context + child preservation are exercised by
      // accessibilityMotion.test.tsx; root ancestry by accessibilityRootWiring.
      expect(appContent).toContain("<AccessibilityPreferencesProvider>");
    });
  });
});
