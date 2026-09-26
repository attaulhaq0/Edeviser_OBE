import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const tokensCss = readFileSync(
  resolve(__dirname, "../../design-system/tokens.css"),
  "utf-8"
);
const indexCss = readFileSync(resolve(__dirname, "../../index.css"), "utf-8");
const indexHtml = readFileSync(
  resolve(__dirname, "../../../index.html"),
  "utf-8"
);

describe("Design Tokens — Hawdex canonical (tokens.css)", () => {
  describe("Brand Colors", () => {
    it("defines --brand-primary as #0382BD (Hawdex blue)", () => {
      expect(tokensCss).toContain("--brand-primary: #0382BD");
    });

    it("defines --brand-secondary as #5AB9B4 (Hawdex teal)", () => {
      expect(tokensCss).toContain("--brand-secondary: #5AB9B4");
    });

    it("defines --brand-tertiary as #1D3557 (navy)", () => {
      expect(tokensCss).toContain("--brand-tertiary: #1D3557");
    });
  });

  describe("Brand Gradient", () => {
    it("defines --brand-gradient with Hawdex 135deg gradient", () => {
      expect(tokensCss).toContain("--brand-gradient: linear-gradient(135deg, #0382BD 0%, #09B99C 100%)");
    });
  });

  describe("Semantic Colors", () => {
    it("defines --success as #10B981", () => {
      expect(tokensCss).toMatch(/--success:\s+#10B981/);
    });

    it("defines --warning as #F59E0B", () => {
      expect(tokensCss).toMatch(/--warning:\s+#F59E0B/);
    });

    it("defines --error as #E53E3E", () => {
      expect(tokensCss).toMatch(/--error:\s+#E53E3E/);
    });

    it("defines --info as #3B82F6", () => {
      expect(tokensCss).toMatch(/--info:\s+#3B82F6/);
    });
  });

  describe("Tailwind Contract Tokens", () => {
    it("defines --background as #F3F7FB (Precision)", () => {
      expect(tokensCss).toContain("--background: #F3F7FB");
    });

    it("defines --card as #FFFFFF", () => {
      expect(tokensCss).toContain("--card: #FFFFFF");
    });

    it("defines --border as Hawdex border token", () => {
      expect(tokensCss).toContain("--border: rgba(15, 23, 42, 0.08)");
    });
  });

  describe("Typography", () => {
    it("consumes Source Sans 3 body tokens in the base layer", () => {
      expect(tokensCss).toContain('--font-body: "Source Sans 3", "Noto Sans Arabic"');
      expect(tokensCss).toMatch(/body\s*\{[^}]*font-family:\s*var\(--font-body\)/);
    });

    it("consumes the heading token with Jakarta and real Arabic fallback", () => {
      expect(tokensCss).toContain('--font-heading: "Plus Jakarta Sans", "Noto Sans Arabic"');
      expect(tokensCss).toMatch(/h1, h2, h3, h4, h5, h6\s*\{[^}]*font-family:\s*var\(--font-heading\)/);
    });

    it("defines typography scale tokens", () => {
      expect(tokensCss).toContain("--text-xs:");
      expect(tokensCss).toContain("--text-sm:");
      expect(tokensCss).toContain("--text-base:");
      expect(tokensCss).toContain("--text-lg:");
      expect(tokensCss).toContain("--text-xl:");
      expect(tokensCss).toContain("--text-2xl:");
      expect(tokensCss).toContain("--text-3xl:");
    });
  });

  describe("Depth/Elevation System", () => {
    it("defines --depth-0 through --depth-5", () => {
      expect(tokensCss).toContain("--depth-0:");
      expect(tokensCss).toContain("--depth-1:");
      expect(tokensCss).toContain("--depth-2:");
      expect(tokensCss).toContain("--depth-3:");
      expect(tokensCss).toContain("--depth-4:");
      expect(tokensCss).toContain("--depth-5:");
    });
  });

  describe("Gamification Tokens", () => {
    it("defines --xp-track and --xp-fill for XP bar", () => {
      expect(tokensCss).toContain("--xp-track: #e2e8f0");
      expect(tokensCss).toContain("--xp-fill: #14b8a6");
    });
  });

  describe("Dark Mode — Obsidian", () => {
    it("defines .dark block with Obsidian tokens", () => {
      expect(tokensCss).toContain(".dark {");
      expect(tokensCss).toContain("--background: #0A1628");
      expect(tokensCss).toContain("--card: #111E30");
    });
  });

  describe("Shell Layout Dimensions", () => {
    it("defines --app-header-h, --app-sidebar-w etc.", () => {
      expect(tokensCss).toContain("--app-header-h: 3.25rem");
      expect(tokensCss).toContain("--app-sidebar-w: 13.5rem");
      expect(tokensCss).toContain("--app-rail-w: 16.5rem");
      expect(tokensCss).toContain("--app-content-max: 96rem");
      expect(tokensCss).toContain("--app-gutter: 0.875rem");
    });
  });
});

describe("Sidebar Tokens — index.css", () => {
  it("defines --sidebar-font-family", () => {
    expect(indexCss).toContain("--sidebar-font-family:");
  });

  it("binds sidebar colors to theme-aware semantic tokens instead of fixed brand fills", () => {
    expect(indexCss).toContain("--sidebar-active-color: var(--sidebar-accent-foreground)");
    expect(indexCss).toContain("--sidebar-primary-muted: var(--muted-foreground)");
    expect(indexCss).toContain("--sidebar-secondary-color: var(--muted-foreground)");
    expect(indexCss).not.toContain("--sidebar-active-color: #0382BD");
  });

  it("has Tailwind imports", () => {
    expect(indexCss).toContain('@import "tailwindcss"');
    expect(indexCss).toContain('@import "shadcn/tailwind.css"');
  });
});

describe("theme cascade and direct CSS motion ownership", () => {
  const blocks = [...tokensCss.matchAll(/(?:^|\n)(:root|\.dark)\s*\{([^}]+)\}/g)];
  it.each([
    "--heatmap-empty", "--heatmap-level-1", "--heatmap-level-2",
    "--heatmap-level-3", "--heatmap-level-4", "--heatmap-cell-ring",
    "--heatmap-cell-outline", "--xp-track",
  ])("keeps every light default for %s before its dark override", (token) => {
    const declares = (block: RegExpExecArray) => new RegExp(`${token}\\s*:`).test(block[2] ?? "");
    const light = blocks.filter((block) => block[1] === ":root" && declares(block));
    const dark = blocks.filter((block) => block[1] === ".dark" && declares(block));
    expect(light.length).toBeGreaterThan(0);
    expect(dark).toHaveLength(1);
    const darkIndex = dark[0]?.index ?? -1;
    expect(light.every((block) => block.index < darkIndex)).toBe(true);
  });

  it("owns reduced-motion behavior next to its three direct CSS loops", () => {
    const rule = tokensCss.match(/@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{([\s\S]*?)\n\}/)?.[1] ?? "";
    for (const selector of [".agent-ring", ".risk-dot", ".cursor-blink"]) expect(rule).toContain(selector);
    expect(rule).toMatch(/animation:\s*none/);
  });
});

describe("Self-hosted font ownership", () => {
  it("removes external connections and preloads only the critical Latin normal body face", () => {
    expect(indexHtml).not.toMatch(/fonts\.(?:googleapis|gstatic)\.com/);
    const preloads = indexHtml.match(/<link[^>]*rel="preload"[^>]*>/g) ?? [];
    expect(preloads).toHaveLength(1);
    expect(preloads[0]).toContain('/src/assets/fonts/source-sans-3-latin-wght-normal.woff2');
    expect(preloads[0]).toMatch(/as="font" type="font\/woff2" crossorigin/);
    expect(preloads[0]).not.toMatch(/OpenDyslexic|italic|latin-ext/);
    expect(indexHtml).toContain("/font-licenses.txt");
    expect(indexCss).toContain('@import "./design-system/fonts.css"');
  });

  it("resolves sans and sidebar families through consumed content tokens", () => {
    expect(indexCss).toMatch(/@theme inline\s*\{[^}]*--font-sans:\s*var\(--font-body\)/);
    expect(indexCss).toContain("--sidebar-font-family: var(--font-body)");
    expect(indexCss).not.toMatch(/font-family:\s*"(?:Inter|Noto Sans)"/);
  });

  it("separates Arabic and effective alternate content from stable brand type", () => {
    expect(tokensCss).toMatch(/:root:lang\(ar\)\s*\{[^}]*--font-heading:\s*"Noto Sans Arabic"/);
    const alternate = tokensCss.match(/:root\.dyslexia-font\s*\{([^}]+)\}/)?.[1] ?? "";
    expect(alternate).toContain('--font-body: "OpenDyslexic"');
    expect(alternate).toContain('--font-heading: "OpenDyslexic"');
    expect(alternate).not.toContain("--font-brand:");
    expect(alternate).not.toContain("!important");
  });
});
