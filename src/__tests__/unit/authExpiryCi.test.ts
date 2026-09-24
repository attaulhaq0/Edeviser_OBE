// @vitest-environment node
// Source/collection governance, not proof that a Preview actor or hosted CI ran.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "../../..");
const read = (path: string) =>
  readFileSync(resolve(root, path), "utf8").replace(/\r\n/g, "\n");
const config = read("playwright.auth-local.config.ts");
const spec = read("tests/e2e/auth/token-expired.spec.ts");
const workflow = read(".github/workflows/ci.yml");
const scripts = (
  JSON.parse(read("package.json")) as { scripts: Record<string, string> }
).scripts;
const job = (name: string) => {
  const heading = `  ${name}:\n`;
  const start = workflow.indexOf(heading);
  if (start < 0) throw new Error(`Missing CI job ${name}`);
  return (
    workflow
      .slice(start + heading.length)
      .split(/\n(?= {2}[A-Za-z][\w-]*:)/)[0] ?? ""
  );
};

describe("V10 collection and honest local session refresh proof", () => {
  it("has a named isolated project without Preview fixtures, state or webServer", () => {
    expect(config).toContain('testDir: "./tests/e2e/auth"');
    expect(config).toContain('testMatch: "token-expired.spec.ts"');
    expect(config).toContain("storageState: { cookies: [], origins: [] }");
    expect(config).toContain('serviceWorkers: "block"');
    expect(config).not.toMatch(
      /^\s*(?:globalSetup|globalTeardown|webServer)\s*:/m
    );
    expect(config).not.toContain("storageStateFor(");
    expect(scripts["test:auth-expiry"]).toBe(
      "playwright test --config playwright.auth-local.config.ts"
    );
    expect(read("playwright.config.ts")).toContain(
      '"./tests/e2e/_fixtures/seed.ts"'
    );
  });

  it("keeps all network on a fake origin and requires real browser refresh evidence", () => {
    expect(spec).toContain('const FAKE_AUTH_ORIGIN = "http://127.0.0.1:54321"');
    expect(spec).toContain('const STORAGE_KEY = "sb-127-auth-token"');
    expect(spec).toContain('context.route("**/*"');
    expect(spec).toContain('AuthProvider } from "@/providers/AuthProvider"');
    expect(spec).toContain('RouteGuard from "@/router/RouteGuard"');
    expect(spec.match(/expect\(state\.refresh\)\.toBe\(1\)/g)).toHaveLength(2);
    expect(spec).toContain("expect(state.refresh).toBe(0)");
    expect(spec).toContain("expect(state.unexpected).toEqual([])");
    expect(spec).not.toMatch(
      /\.cookies\(|clearCookies\(|waitForTimeout\(|\.catch\(\(\)\s*=>/
    );
  });

  it("runs the dedicated hermetic browser gate before the build without seeding", () => {
    const auth = job("auth-expiry-local");
    expect(auth).toContain("VITE_SUPABASE_URL: http://127.0.0.1:54321");
    expect(auth).toContain("run: npm run test:auth-expiry");
    expect(auth).toContain("run: npx playwright install chromium");
    expect(auth).not.toMatch(
      /seed|SUPABASE_DB_ENV|E2E_FIXTURES_ENABLED|continue-on-error|\|\|\s*true|secrets\./
    );
    expect(job("build")).toContain(
      "needs: [lint, typecheck, test, auth-expiry-local]"
    );
  });
});
