import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const cssContent = readFileSync(resolve(__dirname, "../../index.css"), "utf-8");

describe("Custom animation utility classes", () => {
  const expectedClasses = [
    "animate-shimmer",
    "animate-xp-pulse",
    "animate-badge-pop",
    "animate-float",
    "animate-streak-flame",
    "animate-fade-in-up",
    "animate-node-unlock",
    "animate-mystery-reveal",
  ];

  it.each(expectedClasses)("defines .%s utility class", (cls) => {
    expect(cssContent).toContain(`.${cls}`);
  });

  it("includes all animation classes in the reduced-motion media query", () => {
    const reducedMotionMatch = cssContent.match(
      /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{([^}]*\{[^}]*\})\s*\}/s
    );
    expect(reducedMotionMatch).not.toBeNull();
    const reducedMotionBlock = reducedMotionMatch![1]!;
    for (const cls of expectedClasses) {
      expect(reducedMotionBlock).toContain(`.${cls}`);
    }
  });

  it("defines @keyframes for node-unlock and mystery-reveal", () => {
    expect(cssContent).toContain("@keyframes node-unlock");
    expect(cssContent).toContain("@keyframes mystery-reveal");
  });

  it("keeps celebration animations ≤600ms", () => {
    // node-unlock: 0.5s = 500ms ✓
    // mystery-reveal: 0.6s = 600ms ✓
    const nodeUnlockMatch = cssContent.match(
      /\.animate-node-unlock\s*\{[^}]*animation:\s*node-unlock\s+([\d.]+)s/
    );
    const mysteryRevealMatch = cssContent.match(
      /\.animate-mystery-reveal\s*\{[^}]*animation:\s*mystery-reveal\s+([\d.]+)s/
    );

    expect(nodeUnlockMatch).not.toBeNull();
    expect(mysteryRevealMatch).not.toBeNull();

    const nodeUnlockDuration = parseFloat(nodeUnlockMatch![1]!) * 1000;
    const mysteryRevealDuration = parseFloat(mysteryRevealMatch![1]!) * 1000;

    expect(nodeUnlockDuration).toBeLessThanOrEqual(600);
    expect(mysteryRevealDuration).toBeLessThanOrEqual(600);
  });
});
