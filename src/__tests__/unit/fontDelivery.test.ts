// Source/asset contracts only. Real browser font consumption requires CDP evidence.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "../../..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8").replace(/\r\n/g, "\n");
const css = read("src/design-system/fonts.css");
const notice = read("public/font-licenses.txt");
const blocks = [...css.matchAll(/@font-face\s*\{([^}]+)\}/g)].map((match) => match[1] ?? "");
const property = (block: string, name: string) => block.match(new RegExp(`${name}:\\s*([^;]+);`))?.[1] ?? "";
const manifest = new Map([...notice.matchAll(/^([^\s]+\.woff2?)\n {2}Bytes: (\d+)\n {2}SHA-256: ([a-f0-9]{64})/gm)]
  .map((match) => [match[1], { bytes: Number(match[2]), sha256: match[3] }]));

const codePoints = (range: string): Set<number> => {
  const result = new Set<number>();
  for (const part of range.split(",")) {
    const [, first, last] = /^U\+([0-9A-F]+)(?:-([0-9A-F]+))?$/.exec(part.trim()) ?? [];
    if (!first) throw new Error(`Invalid unicode range: ${part}`);
    for (let cp = parseInt(first, 16); cp <= parseInt(last ?? first, 16); cp++) result.add(cp);
  }
  return result;
};

describe("self-hosted face registry", () => {
  it("references exactly the eleven licensed original files with swap and no remote URLs", () => {
    expect(blocks).toHaveLength(11);
    const referenced = new Set<string>();
    for (const block of blocks) {
      const file = block.match(/url\("\.\.\/assets\/fonts\/([^"/]+)"\)/)?.[1];
      expect(file).toBeDefined();
      if (!file) throw new Error("Missing local font URL");
      const entry = manifest.get(file);
      expect(entry).toBeDefined();
      const bytes = readFileSync(resolve(root, "src/assets/fonts", file));
      expect(bytes.length).toBe(entry?.bytes);
      expect(createHash("sha256").update(bytes).digest("hex")).toBe(entry?.sha256);
      expect(bytes.toString("ascii", 0, 4)).toBe(file.endsWith("woff2") ? "wOF2" : "wOFF");
      expect(property(block, "font-display")).toBe("swap");
      expect(property(block, "unicode-range")).not.toBe("");
      referenced.add(file);
    }
    expect(referenced.size).toBe(11);
    expect(css).not.toMatch(/url\(["']?https?:/);
  });

  it("declares real family axis and style coverage, not synthetic variable ranges for static files", () => {
    for (const block of blocks) {
      const family = property(block, "font-family");
      const src = property(block, "src");
      expect(property(block, "font-style")).toBe(/italic\.woff2|Italic\.woff/.test(src) ? "italic" : "normal");
      const weight = family === '"Source Sans 3"' ? "200 900"
        : family === '"Plus Jakarta Sans"' ? "200 800"
        : family === '"Noto Sans Arabic"' ? "100 900"
        : src.includes("Bold") ? "700" : "400";
      expect(property(block, "font-weight")).toBe(weight);
    }
    expect(blocks.filter((block) => property(block, "font-family") === '"Noto Sans Arabic"')).toHaveLength(1);
    expect(css).not.toContain("-wdth-");
    expect(css).not.toContain("-standard-");
  });

  it("limits every reading face to its 230 mapped characters minus private-use E000", () => {
    const reading = blocks.filter((block) => property(block, "font-family") === '"OpenDyslexic"');
    expect(reading).toHaveLength(4);
    for (const block of reading) {
      const supported = codePoints(property(block, "unicode-range"));
      expect(supported.size).toBe(229);
      expect(supported.has(0x41)).toBe(true);
      expect(supported.has(0xFB01)).toBe(true);
      expect(supported.has(0x100)).toBe(false); // Not full Latin-ext.
      expect(supported.has(0x627)).toBe(false); // Arabic alef.
      expect([...supported].some((cp) => cp >= 0xE000 && cp <= 0xF8FF)).toBe(false);
    }
  });

  it("retains published script/subset eligibility rather than guessing Unicode coverage", () => {
    for (const block of blocks.filter((entry) => !entry.includes('"OpenDyslexic"'))) {
      expect(notice).toContain(property(block, "unicode-range"));
    }
  });

  it("keeps named current consumers on content/brand tokens, with no wildcard family override", () => {
    const tokens = read("src/design-system/tokens.css");
    const index = read("src/index.css");
    const auth = read("src/features/auth/landing/AuthLanding.css");
    const brand = read("src/components/shared/RoleBrandLink.tsx");
    expect(auth).toContain("font-family: var(--font-body)");
    expect(auth).toContain("font-family: var(--font-brand)");
    expect(auth).not.toMatch(/font-family:\s*(?:Inter|"IBM Plex|"Noto Sans)/);
    expect(brand).toContain("font-branding font-extrabold");
    expect(brand).not.toContain("fontFamily:");
    expect(index).toContain("--font-branding: var(--font-brand)");
    expect(index).toContain("--sidebar-font-family: var(--font-body)");
    expect(`${tokens}\n${index}\n${css}`).not.toMatch(/font-family:[^;}]*!important/);
    // The default Tailwind monospace utility remains independent of content mode.
    expect(tokens).not.toContain("--font-mono:");
    expect(read("src/components/shared/ChatMessage.tsx")).toContain("font-mono");
  });
});
