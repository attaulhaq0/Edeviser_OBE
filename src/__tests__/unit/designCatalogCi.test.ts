// @vitest-environment node
// Source wiring contracts, not a claim that hosted CI or branch protection ran.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "../../..");
const workflow = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8").replace(/\r\n/g, "\n");
const packageJson = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8")) as { scripts: Record<string, string> };
const job = (name: string) => {
  const heading = `  ${name}:\n`;
  const start = workflow.indexOf(heading);
  if (start < 0) throw new Error(`Missing CI job: ${name}`);
  return workflow.slice(start + heading.length).split(/\n(?= {2}[A-Za-z][\w-]*:)/)[0] ?? "";
};

describe("source-derived catalog CI wiring", () => {
  it("separates readonly validation from explicit artifact generation", () => {
    expect(packageJson.scripts["check:design-catalog"]).toBe("node scripts/design-catalog/generate.mjs --check");
    expect(packageJson.scripts["generate:design-catalog"]).toBe("node scripts/design-catalog/generate.mjs --write");
  });
  it("runs the readonly check after typechecking in the existing required job", () => {
    const typecheck = job("typecheck");
    expect(typecheck).toContain("run: npx tsc --noEmit");
    expect(typecheck).toContain("run: npm run check:design-catalog");
    expect(typecheck.indexOf("npm run check:design-catalog")).toBeGreaterThan(typecheck.indexOf("npx tsc --noEmit"));
    expect(typecheck).not.toMatch(/--write|generate:design-catalog|continue-on-error|\|\|\s*true/);
    expect(job("build")).toContain("needs: [lint, typecheck, test]");
  });
  it("keeps fast unit tests on fake credentials, apart from Preview validation", () => {
    const unit = job("test");
    expect(unit).toContain("VITE_SUPABASE_URL: http://localhost:54321");
    expect(unit).toContain("VITE_SUPABASE_ANON_KEY: fake-unit-test-key");
    expect(unit).not.toContain("secrets.");
    expect(unit).toContain("run: npm run test:coverage");
    expect(workflow).toContain("  rls-smoke:");
  });
});
