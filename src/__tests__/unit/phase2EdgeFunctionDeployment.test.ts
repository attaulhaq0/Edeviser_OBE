import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const workflow = readFileSync(
  resolve(process.cwd(), ".github/workflows/deploy-phase2-edge-functions.yml"),
  "utf8"
);
const manifest = JSON.parse(
  readFileSync(
    resolve(process.cwd(), "scripts/runtime-dependency-manifest.json"),
    "utf8"
  )
) as {
  runtimeGroups: Array<{ name: string; functions: Array<{ slug: string }> }>;
};
const tutorFunctions =
  manifest.runtimeGroups.find((group) => group.name === "tutor-intelligence")
    ?.functions ?? [];

describe("Phase 2 production Edge Function deployment scope", () => {
  it("derives every affected entrypoint as one protected closure", () => {
    expect(workflow).toContain("environment: production");
    expect(workflow).toContain("persist-credentials: false");
    expect(workflow).toContain("branches: [main]");

    expect(workflow).toContain("resolve-runtime-deployment-impact.mjs");
    expect(workflow).toContain("$DEPLOYMENT_CLOSURE");
    expect(
      tutorFunctions.map((functionDefinition) => functionDefinition.slug)
    ).toEqual(
      manifest.runtimeGroups
        .find((group) => group.name === "tutor-intelligence")
        ?.functions.map((functionDefinition) => functionDefinition.slug)
    );
  });

  it("redeploys all affected functions when shared AI code changes", () => {
    expect(workflow).toContain("resolve-runtime-deployment-impact.mjs");
    expect(workflow).toContain("Deploy exact manifest-derived closure");
    expect(
      manifest.runtimeGroups.find(
        (group) => group.name === "tutor-intelligence"
      )?.functions
      // Manifest evolved 6 → 7 when agent-evaluation-jobs and
      // intervention-jobs joined the tutor-intelligence runtime group
      // (commit 74685a4), and 7 → 8 when generate-quiz-questions joined
      // (commit 6aa4e8c); the closure contract tracks the live manifest.
    ).toHaveLength(8);
  });

  it("does not treat frontend-only changes as a production function trigger", () => {
    expect(workflow).not.toMatch(/-\s*["']?(?:src|api)\/\*\*["']?\s*$/m);
    expect(workflow).not.toMatch(
      /paths:\s*\[[^\]]*(?:["']?\*\*["']?)[^\]]*\]/s
    );
    expect(workflow).not.toMatch(/^\s*-\s*["']?\*\*["']?\s*$/m);
  });
});
