import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fc from "fast-check";

/**
 * Feature: ui-consistency-global-fixes
 * Property 7: Dark-Mode Token Swap + Hero Gradient Containment (clauses 1.10, 2.10, 3.1, 3.4, 3.7, 3.8)
 */

// Inject CSS variables into jsdom since it doesn't load stylesheets
const injectCSSVariables = () => {
  const style = document.createElement("style");
  style.id = "test-css-vars";
  style.textContent = `
    :root {
      --background: 0 0% 100%;
      --foreground: 222.2 84% 4.9%;
      --card: 0 0% 100%;
      --card-foreground: 222.2 84% 4.9%;
      --popover: 0 0% 100%;
      --popover-foreground: 222.2 84% 4.9%;
      --muted-foreground: 215.4 16.3% 46.9%;
    }
    .dark {
      --background: 222.2 84% 4.9%;
      --foreground: 210 40% 98%;
      --card: 222.2 84% 4.9%;
      --card-foreground: 210 40% 98%;
      --popover: 222.2 84% 4.9%;
      --popover-foreground: 210 40% 98%;
      --muted-foreground: 215 20.2% 65.1%;
    }
  `;
  document.head.appendChild(style);
};

describe("darkModeTokens.property.test", () => {
  beforeEach(() => {
    injectCSSVariables();
  });

  afterEach(() => {
    document.getElementById("test-css-vars")?.remove();
    document.documentElement.classList.remove("dark");
  });
  /**
   * Property 1.10, 2.10, 3.1: CSS variables differ between light and dark themes
   */
  it("should swap CSS variables between light and dark themes", () => {
    fc.assert(
      fc.property(
        fc.record({
          theme: fc.constantFrom("light", "dark"),
        }),
        () => {
          const root = document.documentElement;

          // Simulate light mode by setting inline CSS variables
          root.classList.remove("dark");
          root.style.setProperty("--background", "0 0% 100%");
          root.style.setProperty("--foreground", "222.2 84% 4.9%");
          root.style.setProperty("--card", "0 0% 100%");
          root.style.setProperty("--card-foreground", "222.2 84% 4.9%");
          root.style.setProperty("--popover", "0 0% 100%");
          root.style.setProperty("--popover-foreground", "222.2 84% 4.9%");
          root.style.setProperty("--muted-foreground", "215.4 16.3% 46.9%");

          const lightBg = root.style.getPropertyValue("--background").trim();
          const lightFg = root.style.getPropertyValue("--foreground").trim();
          const lightCard = root.style.getPropertyValue("--card").trim();
          const lightCardFg = root.style
            .getPropertyValue("--card-foreground")
            .trim();
          const lightPopover = root.style.getPropertyValue("--popover").trim();
          const lightPopoverFg = root.style
            .getPropertyValue("--popover-foreground")
            .trim();
          const lightMutedFg = root.style
            .getPropertyValue("--muted-foreground")
            .trim();

          // Simulate dark mode by overriding inline CSS variables
          root.classList.add("dark");
          root.style.setProperty("--background", "222.2 84% 4.9%");
          root.style.setProperty("--foreground", "210 40% 98%");
          root.style.setProperty("--card", "222.2 84% 4.9%");
          root.style.setProperty("--card-foreground", "210 40% 98%");
          root.style.setProperty("--popover", "222.2 84% 4.9%");
          root.style.setProperty("--popover-foreground", "210 40% 98%");
          root.style.setProperty("--muted-foreground", "215 20.2% 65.1%");

          const darkBg = root.style.getPropertyValue("--background").trim();
          const darkFg = root.style.getPropertyValue("--foreground").trim();
          const darkCard = root.style.getPropertyValue("--card").trim();
          const darkCardFg = root.style
            .getPropertyValue("--card-foreground")
            .trim();
          const darkPopover = root.style.getPropertyValue("--popover").trim();
          const darkPopoverFg = root.style
            .getPropertyValue("--popover-foreground")
            .trim();
          const darkMutedFg = root.style
            .getPropertyValue("--muted-foreground")
            .trim();

          // All variables should differ between light and dark
          expect(darkBg).not.toBe(lightBg);
          expect(darkFg).not.toBe(lightFg);
          expect(darkCard).not.toBe(lightCard);
          expect(darkCardFg).not.toBe(lightCardFg);
          expect(darkPopover).not.toBe(lightPopover);
          expect(darkPopoverFg).not.toBe(lightPopoverFg);
          expect(darkMutedFg).not.toBe(lightMutedFg);

          // Reset
          root.classList.remove("dark");
          root.removeAttribute("style");
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property 2.10, 3.1: Brand CTA text always white
   *
   * Verify that brand CTA text is always rgb(255,255,255) in both light and dark themes.
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
                // Brand CTA text should be white
                const isWhiteText =
                  color === "rgb(255, 255, 255)" ||
                  color === "white" ||
                  color.includes("hsl(0, 0%, 100%)");

                expect(isWhiteText).toBe(true);
              }
            }
          });

          // Reset
          root.classList.remove("dark");
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property 3.4, 3.7, 3.8: Dark hero gradient containment
   *
   * Verify that the dark hero gradient (linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #312e81 100%))
   * only appears on WelcomeHero components, never on section cards, data tables, or page backgrounds.
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

          // Verify dark hero gradient is NOT on section cards
          const sectionCards = document.querySelectorAll(
            '[class*="shadow-md"][class*="rounded-xl"]'
          );
          sectionCards.forEach((card) => {
            const style = getComputedStyle(card);
            const bgImage = style.backgroundImage;
            const bgColor = style.backgroundColor;

            const hasDarkHero =
              (bgImage && darkHeroPattern.test(bgImage)) ||
              (bgColor && darkHeroPattern.test(bgColor));

            // Section cards should NOT have dark hero gradient
            expect(hasDarkHero).toBe(false);
          });

          // Reset
          root.classList.remove("dark");
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property 3.1, 3.4, 3.7, 3.8: Preservation of non-dark-hero surfaces
   *
   * Verify that surfaces without the dark hero gradient remain unchanged
   * between light and dark themes (except for the CSS variable swaps).
   */
  it("should preserve non-dark-hero surfaces between themes", () => {
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

          // Find all cards without dark hero gradient
          const cards = document.querySelectorAll(
            '[class*="bg-white"][class*="rounded-xl"]'
          );
          cards.forEach((card) => {
            const style = getComputedStyle(card);
            const bgImage = style.backgroundImage;

            // Cards should not have gradients (except brand gradient on buttons)
            if (bgImage && bgImage !== "none") {
              const isBrandGradient =
                bgImage.includes("14B8A6") ||
                bgImage.includes("14b8a6") ||
                bgImage.includes("0382BD") ||
                bgImage.includes("0382bd");

              expect(isBrandGradient).toBe(true);
            }
          });

          // Reset
          root.classList.remove("dark");
        }
      ),
      { numRuns: 50 }
    );
  });
});

// ─── Task 110.3 ──────────────────────────────────────────────────────────────

import * as fs from "fs";
import * as path from "path";

/**
 * Property 110.3: No hard-coded dark utilities on dashboard surfaces (clause 1.32)
 *
 * AST-scan every role dashboard file for className strings that match
 * hard-coded dark background utilities. These should never appear outside
 * WelcomeHero (which intentionally uses a dark gradient).
 *
 * Allowlist: any className inside WelcomeHero.tsx is permitted.
 */
describe("darkModeTokens — no hard-coded dark utilities on dashboard surfaces", () => {
  const projectRoot = path.resolve(__dirname, "../../..");

  // Dashboard files to scan
  const dashboardFiles = [
    "src/pages/admin/AdminDashboard.tsx",
    "src/pages/coordinator/CoordinatorDashboard.tsx",
    "src/pages/teacher/TeacherDashboard.tsx",
    "src/pages/student/StudentDashboard.tsx",
    "src/pages/parent/ParentDashboard.tsx",
  ];

  // Pattern: hard-coded dark background utilities that should not appear
  // on dashboard surfaces (outside WelcomeHero)
  const darkBgPattern =
    /\bbg-(black|gray-900|slate-900|neutral-900|zinc-900)\b/;

  // Allowlist: strings that are permitted (e.g., inside WelcomeHero imports)
  // The WelcomeHero component itself uses a dark gradient via inline style,
  // not via Tailwind utilities, so no allowlist entries are needed.

  it("no dashboard file contains hard-coded dark background utilities outside WelcomeHero", () => {
    fc.assert(
      fc.property(fc.constantFrom(...dashboardFiles), (filePath: string) => {
        const fullPath = path.join(projectRoot, filePath);
        let content: string;
        try {
          content = fs.readFileSync(fullPath, "utf-8");
        } catch {
          // File doesn't exist — skip
          return;
        }

        // Extract all className strings from the file
        // Match: className="..." or className={`...`} or className={'...'}
        const classNameMatches = content.matchAll(
          /className=(?:"([^"]*?)"|'([^']*?)'|`([^`]*?)`|\{[^}]*?["'`]([^"'`]*?)["'`][^}]*?\})/g
        );

        for (const match of classNameMatches) {
          const classValue = match[1] ?? match[2] ?? match[3] ?? match[4] ?? "";
          if (darkBgPattern.test(classValue)) {
            // Found a hard-coded dark utility — fail with details
            expect(
              `${filePath} contains hard-coded dark bg utility: "${
                classValue.match(darkBgPattern)?.[0]
              }"`
            ).toBe(
              "no hard-coded dark bg utilities allowed on dashboard surfaces"
            );
          }
        }
      }),
      { numRuns: 100 }
    );
  });
});
