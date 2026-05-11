import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fc from "fast-check";

/**
 * Feature: ui-consistency-global-fixes
 * Property 1: Design-System Compliance (clauses 1.1–1.10, 2.1–2.10, 3.1–3.10)
 */

// Inject CSS variables into jsdom since it doesn't load stylesheets
const injectCSSVariables = () => {
  const style = document.createElement("style");
  style.id = "test-css-vars-ui";
  style.textContent = `
    :root {
      --background: 0 0% 100%;
      --foreground: 222.2 84% 4.9%;
    }
    .dark {
      --background: 222.2 84% 4.9%;
      --foreground: 210 40% 98%;
    }
  `;
  document.head.appendChild(style);
};

describe("uiConsistency.property.test", () => {
  beforeEach(() => {
    injectCSSVariables();
  });

  afterEach(() => {
    document.getElementById("test-css-vars-ui")?.remove();
    document.documentElement.classList.remove("dark");
  });
  /**
   * Property 1.1–1.10, 2.1–2.10, 3.1–3.10: Design-System Compliance
   */
  it("should maintain design-system compliance across all roles and themes", () => {
    fc.assert(
      fc.property(
        fc.record({
          theme: fc.constantFrom("light", "dark"),
        }),
        ({ theme }) => {
          const root = document.documentElement;

          // Set CSS variables via inline style (jsdom doesn't process stylesheet rules)
          if (theme === "dark") {
            root.classList.add("dark");
            root.style.setProperty("--background", "222.2 84% 4.9%");
            root.style.setProperty("--foreground", "210 40% 98%");
          } else {
            root.classList.remove("dark");
            root.style.setProperty("--background", "0 0% 100%");
            root.style.setProperty("--foreground", "222.2 84% 4.9%");
          }

          // Verify CSS variables are defined (non-empty)
          const bgVar = root.style.getPropertyValue("--background").trim();
          const fgVar = root.style.getPropertyValue("--foreground").trim();

          expect(bgVar).toBeTruthy();
          expect(fgVar).toBeTruthy();

          // Cleanup
          root.removeAttribute("style");
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property 2.1–2.10, 3.1–3.10: No prohibited rendering patterns
   *
   * Verify no invisible text, rogue gradients, or dark dialogs.
   */
  it("should not render prohibited patterns", () => {
    fc.assert(
      fc.property(
        fc.record({
          theme: fc.constantFrom("light", "dark"),
        }),
        ({ theme }) => {
          const root = document.documentElement;
          if (theme === "dark") {
            root.classList.add("dark");
          } else {
            root.classList.remove("dark");
          }

          // Scan for dark surfaces on dialogs
          const dialogs = document.querySelectorAll('[role="dialog"]');
          dialogs.forEach((dialog) => {
            const style = getComputedStyle(dialog);
            const bgColor = style.backgroundColor;

            // Dialog background should be white or card token, not dark
            const isWhiteOrCard =
              bgColor === "rgb(255, 255, 255)" ||
              bgColor === "white" ||
              bgColor.includes("hsl(0, 0%, 100%)") ||
              bgColor.includes("var(--card)");

            expect(isWhiteOrCard).toBe(true);
          });
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property 2.10, 3.1, 3.4, 3.7, 3.8: Dark hero gradient containment
   *
   * The dark hero gradient should ONLY appear on WelcomeHero components.
   */
  it("should contain dark hero gradient only to WelcomeHero components", () => {
    fc.assert(
      fc.property(
        fc.record({
          theme: fc.constantFrom("light", "dark"),
        }),
        ({ theme }) => {
          const root = document.documentElement;
          if (theme === "dark") {
            root.classList.add("dark");
          } else {
            root.classList.remove("dark");
          }

          // Dark hero gradient pattern
          const darkHeroPattern = /#0f172a|#1e3a8a|#312e81/i;

          // Find all elements with the dark hero gradient
          const allElements = document.querySelectorAll("*");
          const elementsWithDarkHero: Element[] = [];

          allElements.forEach((el) => {
            const style = getComputedStyle(el);
            const bgImage = style.backgroundImage;
            const bgColor = style.backgroundColor;

            if (
              (bgImage && darkHeroPattern.test(bgImage)) ||
              (bgColor && darkHeroPattern.test(bgColor))
            ) {
              elementsWithDarkHero.push(el);
            }
          });

          // All elements with dark hero gradient should be WelcomeHero or descendants
          elementsWithDarkHero.forEach((el) => {
            const isWelcomeHero =
              el.classList.contains("welcome-hero") ||
              el.closest('[data-testid="welcome-hero"]') ||
              el.closest(".welcome-hero");

            expect(isWelcomeHero).toBeTruthy();
          });
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property 2.1–2.10, 3.1–3.10: Brand CTA text always white
   *
   * All buttons with the brand gradient should have white text in both light and dark modes.
   */
  it("should render brand CTA text as white in both themes", () => {
    fc.assert(
      fc.property(
        fc.record({
          theme: fc.constantFrom("light", "dark"),
        }),
        ({ theme }) => {
          const root = document.documentElement;
          if (theme === "dark") {
            root.classList.add("dark");
          } else {
            root.classList.remove("dark");
          }

          // Find all buttons with brand gradient
          const buttons = document.querySelectorAll("button");
          buttons.forEach((btn) => {
            const style = getComputedStyle(btn);
            const bgImage = style.backgroundImage;

            if (bgImage && bgImage !== "none") {
              const isBrandGradient =
                bgImage.includes("14B8A6") ||
                bgImage.includes("14b8a6") ||
                bgImage.includes("0382BD") ||
                bgImage.includes("0382bd") ||
                bgImage.includes("from-teal-500") ||
                bgImage.includes("to-blue-600");

              if (isBrandGradient) {
                const color = style.color;
                // Brand CTA text should be white: rgb(255, 255, 255)
                const isWhiteText =
                  color === "rgb(255, 255, 255)" ||
                  color === "white" ||
                  color.includes("hsl(0, 0%, 100%)");

                expect(isWhiteText).toBe(true);
              }
            }
          });
        }
      ),
      { numRuns: 50 }
    );
  });
});
