// @vitest-environment node
// CI source contract only: executed Lighthouse/hosted results are separately recorded.
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "../../..");
const require = createRequire(import.meta.url);
const workflow = readFileSync(
  resolve(root, ".github/workflows/ci.yml"),
  "utf8"
).replace(/\r\n/g, "\n");
const scripts = (
  JSON.parse(readFileSync(resolve(root, "package.json"), "utf8")) as {
    scripts: Record<string, string>;
  }
).scripts;
const config = require(resolve(root, "lighthouserc.cjs")) as {
  ci: {
    collect: { staticDistDir: string; numberOfRuns: number };
    assert: {
      assertions: Record<
        string,
        ["error" | "warn", { minScore?: number; maxNumericValue?: number }]
      >;
    };
  };
};

const lighthouseJob = () => {
  const start = workflow.indexOf("  lighthouse:\n");
  if (start < 0) throw new Error("Missing Lighthouse CI job");
  return (
    workflow
      .slice(start + "  lighthouse:\n".length)
      .split(/\n(?= {2}[A-Za-z][\w-]*:)/)[0] ?? ""
  );
};

describe("V17 Lighthouse evidence is fail-closed", () => {
  it("propagates CLI failure instead of reporting a passing npm command", () => {
    expect(scripts.lighthouse).toBe("lhci autorun");
    expect(scripts.lighthouse).not.toMatch(/\|\||;\s*true|exit\s+0/);
  });

  it("runs the same failing command after a built artifact without CI waivers", () => {
    const job = lighthouseJob();
    expect(job).toContain("needs: [build]");
    expect(job).toContain("name: dist");
    expect(job).toContain("run: npm run lighthouse");
    expect(job).not.toMatch(/\|\|\s*true|continue-on-error:\s*true/);
  });

  it("retains real error-level assertions and labels performance as advisory", () => {
    expect(config.ci.collect).toMatchObject({
      staticDistDir: "./dist",
      numberOfRuns: 3,
    });
    const assertions = config.ci.assert.assertions;
    expect(assertions["categories:accessibility"]).toEqual([
      "error",
      { minScore: 0.9 },
    ]);
    expect(assertions["categories:best-practices"]).toEqual([
      "error",
      { minScore: 0.85 },
    ]);
    expect(assertions["categories:seo"]).toEqual(["error", { minScore: 0.9 }]);
    expect(assertions["total-byte-weight"]).toEqual([
      "error",
      { maxNumericValue: 1228800 },
    ]);
    for (const metric of [
      "categories:performance",
      "largest-contentful-paint",
      "cumulative-layout-shift",
      "max-potential-fid",
      "first-contentful-paint",
    ])
      expect(assertions[metric]?.[0]).toBe("warn");
  });
});
