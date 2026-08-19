import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  extractPlaywrightProjectNames,
  findMissingPlaywrightProjects,
} from "../../../scripts/check-playwright-contracts";

describe("Playwright workflow project contract", () => {
  it("detects a workflow project absent from configuration", () => {
    expect(
      findMissingPlaywrightProjects(`projects: [{ name: "legacy-smoke" }]`, [
        `run: npx playwright test --project=chromium`,
      ])
    ).toEqual(["chromium"]);
  });

  it("recognizes every configured project", () => {
    const config = readFileSync("playwright.config.ts", "utf8");
    expect([...extractPlaywrightProjectNames(config)]).toEqual(
      expect.arrayContaining([
        "legacy-smoke",
        "admin",
        "coordinator",
        "teacher",
        "student",
        "parent",
        "cross-role",
        "rtl-ar",
      ])
    );
  });

  it("keeps workflow references aligned with current configuration", () => {
    const config = readFileSync("playwright.config.ts", "utf8");
    const ci = readFileSync(".github/workflows/ci.yml", "utf8");
    expect(findMissingPlaywrightProjects(config, [ci])).toEqual([]);
  });

  it("isolates product tests from nested dependencies, scratch trees, and legacy overlap", () => {
    const config = readFileSync("playwright.config.ts", "utf8");
    expect(config).toContain('"**/node_modules/**"');
    expect(config).toContain('"runtime-governance-scratch/**"');
    expect(config).toContain('"tests/e2e/**"');
  });
});
