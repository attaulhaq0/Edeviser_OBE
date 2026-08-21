import { describe, expect, it } from "vitest";
import { analyzeCriticalE2ESource } from "../../../scripts/check-critical-e2e";

const rulesFor = (source: string): string[] =>
  analyzeCriticalE2ESource(source).map((finding) => finding.rule);

describe("critical E2E no-swallow guard", () => {
  it("rejects a propagation catch that logs and passes", () => {
    const rules = rulesFor(`
      // @critical-e2e
      test("loop", async () => {
        try { await waitForPropagation(); }
        catch { console.log("not detected"); }
      });
    `);
    expect(rules).toContain("no-swallowed-catch");
  });

  it("rejects a required action hidden behind isVisible", () => {
    const rules = rulesFor(`
      // @critical-e2e
      if (await submit.isVisible()) { await submit.click(); }
    `);
    expect(rules).toContain("no-conditional-required-action");
  });

  it("rejects a required locator fallback compatible with success", () => {
    const rules = rulesFor(`
      // @critical-e2e
      const value = await page.getByTestId("xp").textContent().catch(() => "0");
    `);
    expect(rules).toContain("no-success-compatible-fallback");
  });

  it("rejects skipping a critical scenario when setup is missing", () => {
    const rules = rulesFor(`
      // @critical-e2e
      test.skip(true, "fixture missing");
    `);
    expect(rules).toContain("no-critical-skip");
  });

  it("rejects a missing declared critical grading control", () => {
    const rules = rulesFor(`
      // @critical-e2e
      // @critical-control Submit Grade
      await page.goto("somewhere");
    `);
    expect(rules).toContain("missing-critical-control");
  });

  it("allows polling conversion outside tagged critical scenarios", () => {
    expect(
      analyzeCriticalE2ESource(
        `const visible = locator.isVisible().catch(() => false);`
      )
    ).toEqual([]);
  });

  it("accepts an unconditional declared control and assertion", () => {
    expect(
      analyzeCriticalE2ESource(`
        // @critical-e2e
        // @critical-control Submit Grade
        await page.getByRole("button", { name: "Submit Grade" }).click();
        await expect(page).toHaveURL(/grading/);
      `)
    ).toEqual([]);
  });
});
