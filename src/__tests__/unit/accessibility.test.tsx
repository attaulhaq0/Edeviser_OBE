/** @vitest-environment happy-dom */
// =============================================================================
// Accessibility Audit — Task 42.5
// Validates: keyboard navigation, screen reader support, color contrast
// =============================================================================

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { readFileSync } from "fs";
import { resolve } from "path";
import { checkA11y } from "@/__tests__/helpers/a11y";
import { assertTextContrast, contrastRatio, scopedHexToken } from "@/__tests__/helpers/contrast";
import SkipToMain from "@/components/shared/SkipToMain";

const appTsx = readFileSync(resolve(__dirname, "../../App.tsx"), "utf-8");
const appRouterTsx = readFileSync(
  resolve(__dirname, "../../router/AppRouter.tsx"),
  "utf-8"
);
const roleAppShellTsx = readFileSync(
  resolve(__dirname, "../../app/RoleAppShell.tsx"),
  "utf-8"
);
const eslintConfig = readFileSync(
  resolve(__dirname, "../../../eslint.config.js"),
  "utf-8"
);
const indexCss = readFileSync(resolve(__dirname, "../../index.css"), "utf-8");
const indexHtml = readFileSync(
  resolve(__dirname, "../../../index.html"),
  "utf-8"
);

// ─── ESLint jsx-a11y Integration ─────────────────────────────────────────────

describe("ESLint jsx-a11y plugin", () => {
  it("imports eslint-plugin-jsx-a11y in ESLint config", () => {
    expect(eslintConfig).toContain("eslint-plugin-jsx-a11y");
  });

  it("registers jsx-a11y plugin", () => {
    expect(eslintConfig).toContain('"jsx-a11y"');
  });

  it("spreads jsx-a11y recommended rules", () => {
    expect(eslintConfig).toContain("jsxA11y.configs.recommended.rules");
  });
});

// ─── Skip-to-Main-Content Link ───────────────────────────────────────────────

describe("SkipToMain component", () => {
  it("renders a link targeting #main-content", () => {
    render(<SkipToMain />);
    const link = screen.getByText("Skip to main content");
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "#main-content");
  });

  it("is visually hidden by default (sr-only)", () => {
    const { container } = render(<SkipToMain />);
    const link = container.querySelector("a");
    expect(link?.className).toContain("sr-only");
  });

  it("has no a11y violations", async () => {
    const { container } = render(<SkipToMain />);
    await checkA11y(container);
  });
});

describe("Skip-to-main integration", () => {
  it("App.tsx includes SkipToMain component", () => {
    expect(appTsx).toContain("<SkipToMain />");
  });

  it("public routes and protected role shells own a non-nested main landmark", () => {
    expect(appRouterTsx).toContain("const PublicMain");
    expect(appRouterTsx).toContain('id="main-content"');
    expect(appRouterTsx).toContain("<div>");
    expect(roleAppShellTsx).toContain("<main");
    expect(roleAppShellTsx).toContain('id="main-content"');
  });
});

// ─── Keyboard Navigation & Focus Management ─────────────────────────────────

describe("Keyboard navigation support", () => {
  it("main-content element has tabIndex={-1} for programmatic focus", () => {
    expect(appRouterTsx).toContain("tabIndex={-1}");
    expect(roleAppShellTsx).toContain("tabIndex={-1}");
  });

  it("html lang attribute is set for screen readers", () => {
    expect(indexHtml).toContain('lang="en"');
  });
});

// ─── Reduced Motion (already implemented, verify still present) ──────────────

describe("Reduced motion support (audit)", () => {
  it("CSS includes prefers-reduced-motion media query", () => {
    expect(indexCss).toContain("@media (prefers-reduced-motion: reduce)");
  });

  it("App delegates motion to the owned preference adapter without opting out of the OS", () => {
    expect(appTsx).toContain("<AccessibilityMotion>");
    const motion = readFileSync(resolve(__dirname, "../../providers/AccessibilityMotion.tsx"), "utf-8");
    expect(motion).toContain('reducedMotion={effective.reduced_animations ? "always" : "user"}');
    expect(motion).not.toContain('"never"');
  });
});

// ─── Color Contrast Requirements ─────────────────────────────────────────────

describe("Color contrast — Hawdex opaque source-token pairs", () => {
  // Numeric source-token checks, NOT proof of rendered text size, CSS cascade,
  // opacity, gradients, or browser contrast. Large text is >=24px normal or
  // >=56/3px at weight >=700. A 14px bold button is still NORMAL text.
  const tokensCss = readFileSync(
    resolve(__dirname, "../../design-system/tokens.css"),
    "utf-8"
  );
  const color = (theme: ":root" | ".dark", token: string): string =>
    scopedHexToken(tokensCss, theme, token);

  describe("Precision (light) — foreground/background pairs", () => {
    it.each([
      ["--foreground", "--background", "AAA"],
      ["--success-foreground", "--success-subtle", "AA"],
      ["--warning-foreground", "--warning-subtle", "AA"],
      ["--error-foreground", "--error-subtle", "AAA"],
      ["--info-foreground", "--info-subtle", "AAA"],
      ["--brand-neutral", "--card", "AA"],
    ] as const)("%s on %s meets %s normal-text contrast", (foreground, background, level) => {
      expect(() => assertTextContrast(color(":root", foreground), color(":root", background), 16, 400, level)).not.toThrow();
    });

    it.each([
      ["--primary", "--card"],
      ["--destructive-foreground", "--destructive"],
    ])("%s on %s meets normal and large source-text contrast", (foreground, background) => {
      const text = color(":root", foreground);
      const surface = color(":root", background);
      expect(() => assertTextContrast(text, surface, 14, 500)).not.toThrow();
      expect(() => assertTextContrast(text, surface, 24, 400)).not.toThrow();
      expect(() => assertTextContrast(text, surface, 56 / 3, 700)).not.toThrow();
      // Real consumer opacity/hover/active composition is checked in Chromium.
      expect(contrastRatio(text, surface)).toBeGreaterThanOrEqual(4.5);
    });
  });

  describe("Obsidian (dark) — foreground/background pairs", () => {
    it.each([
      ["--primary", "--background", "AA"],
      ["--foreground", "--background", "AAA"],
      ["--text-primary", "--card", "AAA"],
      ["--success", "--background", "AAA"],
      ["--error", "--background", "AA"],
      ["--text-secondary", "--background", "AA"],
      ["--success-foreground", "--success-subtle", "AA"],
      ["--warning-foreground", "--warning-subtle", "AA"],
      ["--error-foreground", "--error-subtle", "AA"],
      ["--info-foreground", "--info-subtle", "AA"],
    ] as const)("%s on %s meets %s normal-text contrast", (foreground, background, level) => {
      expect(() => assertTextContrast(color(".dark", foreground), color(".dark", background), 16, 400, level)).not.toThrow();
    });
  });

  it("retains decorative-border presence coverage without claiming text contrast", () => {
    expect(tokensCss).toContain("--border-default:");
  });
});
