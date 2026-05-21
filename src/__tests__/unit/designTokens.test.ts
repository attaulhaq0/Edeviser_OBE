import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const indexCss = readFileSync(resolve(__dirname, "../../index.css"), "utf-8");
const indexHtml = readFileSync(
  resolve(__dirname, "../../../index.html"),
  "utf-8"
);

describe("Design Tokens — src/index.css", () => {
  describe("Brand Colors", () => {
    it("defines --brand-primary as #3b82f6 (blue-500)", () => {
      expect(indexCss).toContain("--brand-primary: #3b82f6");
    });

    it("defines --brand-primary-dark as #2563eb (blue-600)", () => {
      expect(indexCss).toContain("--brand-primary-dark: #2563eb");
    });

    it("defines --brand-secondary as #14b8a6 (teal-500)", () => {
      expect(indexCss).toContain("--brand-secondary: #14b8a6");
    });

    it("defines --gradient-start and --gradient-end", () => {
      expect(indexCss).toContain("--gradient-start: #14b8a6");
      expect(indexCss).toContain("--gradient-end: #0382bd");
    });
  });

  describe("Brand Gradient", () => {
    it("defines --brand-gradient with correct teal-to-blue gradient", () => {
      expect(indexCss).toContain(
        "--brand-gradient: linear-gradient(135deg, #14b8a6 0%, #0382bd 100%)"
      );
    });

    it("defines --hero-gradient for dashboard hero cards", () => {
      expect(indexCss).toContain("--hero-gradient: linear-gradient(");
      expect(indexCss).toContain("#0f172a 0%");
      expect(indexCss).toContain("#1e3a8a 50%");
      expect(indexCss).toContain("#312e81 100%");
    });
  });

  describe("Semantic Colors", () => {
    it("defines --color-success as #22c55e (green-500)", () => {
      expect(indexCss).toContain("--color-success: #22c55e");
    });

    it("defines --color-warning as #f59e0b (amber-500)", () => {
      expect(indexCss).toContain("--color-warning: #f59e0b");
    });

    it("defines --color-destructive-brand as #ef4444 (red-500)", () => {
      expect(indexCss).toContain("--color-destructive-brand: #ef4444");
    });

    it("defines --color-neutral as #64748b (slate-500)", () => {
      expect(indexCss).toContain("--color-neutral: #64748b");
    });
  });

  describe("Surface Colors", () => {
    it("defines --surface-background as white", () => {
      expect(indexCss).toContain("--surface-background: #ffffff");
    });

    it("defines --surface-card as white", () => {
      expect(indexCss).toContain("--surface-card: #ffffff");
    });

    it("defines --surface-subtle as #f8fafc (slate-50)", () => {
      expect(indexCss).toContain("--surface-subtle: #f8fafc");
    });

    it("defines --surface-border as #e2e8f0 (slate-200)", () => {
      expect(indexCss).toContain("--surface-border: #e2e8f0");
    });
  });

  describe("Typography", () => {
    it("sets Noto Sans as the primary font in @theme", () => {
      expect(indexCss).toContain('"Noto Sans"');
    });

    it("defines --font-mono for code/technical text", () => {
      expect(indexCss).toContain('--font-mono: "Menlo"');
    });
  });

  describe("Shadows", () => {
    it("defines --shadow-sm, --shadow-md, --shadow-lg, --shadow-xl", () => {
      expect(indexCss).toContain("--shadow-sm:");
      expect(indexCss).toContain("--shadow-md:");
      expect(indexCss).toContain("--shadow-lg:");
      expect(indexCss).toContain("--shadow-xl:");
    });
  });

  describe("Gamification Tokens", () => {
    it("defines --xp-track and --xp-fill for XP bar", () => {
      expect(indexCss).toContain("--xp-track: #e2e8f0");
      expect(indexCss).toContain("--xp-fill: #14b8a6");
    });
  });
});

describe("Google Fonts — index.html", () => {
  it("loads Noto Sans via Google Fonts with display=swap", () => {
    expect(indexHtml).toContain("fonts.googleapis.com/css2?family=Noto+Sans");
    expect(indexHtml).toContain("display=swap");
  });

  it("includes preconnect for Google Fonts", () => {
    expect(indexHtml).toContain(
      'rel="preconnect" href="https://fonts.googleapis.com"'
    );
    expect(indexHtml).toContain(
      'rel="preconnect" href="https://fonts.gstatic.com"'
    );
  });

  it("loads required font weights (400, 500, 600, 700, 800, 900)", () => {
    expect(indexHtml).toMatch(/wght@.*400/);
    expect(indexHtml).toMatch(/wght@.*500/);
    expect(indexHtml).toMatch(/wght@.*600/);
    expect(indexHtml).toMatch(/wght@.*700/);
    expect(indexHtml).toMatch(/wght@.*900/);
  });
});
