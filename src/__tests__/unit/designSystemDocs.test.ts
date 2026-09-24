// @vitest-environment node
import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "../../design-system");
const readme = readFileSync(resolve(root, "README.md"), "utf8");
const barrel = readFileSync(resolve(root, "index.ts"), "utf8");
const localLinks = (markdown: string): string[] => [...markdown.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)]
  .map((match) => match[1])
  .filter((target): target is string => typeof target === "string" && !/^(?:https?:|#)/.test(target))
  .map((target) => target.replace(/#.*$/, ""));
const assertLinks = (markdown: string) => {
  const links = localLinks(markdown);
  if (links.length === 0) throw new Error("No local documentation-link coverage");
  for (const target of links) {
    if (!statSync(resolve(root, target)).isFile()) throw new Error(`Not a file: ${target}`);
  }
  return links;
};

describe("design-system documentation matches current source", () => {
  it("gives new agents one current design entrypoint and marks prototype authority historical", () => {
    const agent = readFileSync(resolve(root, "../../AGENTS.md"), "utf8");
    const frontendAgent = readFileSync(resolve(root, "../AGENTS.md"), "utf8");
    const parity = readFileSync(resolve(root, "PARITY.md"), "utf8");
    expect(agent).toContain("src/design-system/README.md");
    expect(frontendAgent).toContain("design-system/README.md");
    expect(parity).toContain("Historical migration reference, not current design authority");
    expect(parity).not.toContain("raw `shared.css` values win");
    expect(parity).not.toContain("NOT `@/components/shared/*` (legacy)");
    const primitives = readFileSync(resolve(root, "primitives/index.ts"), "utf8");
    const patterns = readFileSync(resolve(root, "patterns/index.ts"), "utf8");
    expect(primitives).toContain("Canonical primitive facade");
    expect(patterns).toContain("migration/verification scope varies");
    expect(primitives + patterns).not.toContain("prototype design system adopts");
    expect(patterns).not.toContain("prototype design-system component surface");
  });
  it("maps actual environment owners without presenting future tooling as installed", () => {
    expect(localLinks(readme)).toEqual(expect.arrayContaining([
      "./fonts.css", "./accessibility.css", "./portals.css", "./controls.css",
      "../providers/AccessibilityPreferencesProvider.tsx", "../providers/AccessibilityMotion.tsx",
      "../lib/fontPreferences.ts",
    ]));
    expect(readme).toContain("There is not yet a complete approved component catalog");
    expect(readme).toContain("Ordinary ESLint and the separate source-text design scanner have different scopes");
  });
  it("resolves every linked local entrypoint", () => {
    expect(assertLinks(readme).length).toBeGreaterThanOrEqual(14);
  });
  it("fails on a missing entrypoint rather than silently skipping it", () => {
    expect(() => assertLinks("[missing](./__missing_design_system_entry__.ts)")).toThrow();
  });
  it("fails on empty local-link coverage", () => {
    expect(() => assertLinks("Only prose, no verified entrypoints.")).toThrow("No local documentation-link coverage");
  });
  it("documents the active single CSS graph without obsolete cutover claims", () => {
    expect(readme).toContain("Tokens are imported and affect the application now");
    expect(localLinks(readme)).toEqual(expect.arrayContaining(["../main.tsx", "../index.css", "./tokens.css"]));
    expect(barrel).toContain("main.tsx loads index.css once");
    expect(readme + barrel).not.toMatch(/not yet imported|imported at cutover|93\.65deg/);
  });
  it("distinguishes migration/launch targets from scoped verification", () => {
    expect(readme).toContain("externally authored product/governance document is not included in this frontend-only checkpoint");
    expect(localLinks(readme)).not.toContain("../../docs/product/EDEVISER-LAUNCH-CONTRACT.md");
    expect(readme).toContain("does not certify every component or route");
    expect(readme).toContain("Retirement requires dependency proof");
  });
});
