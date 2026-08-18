import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const workflow = readFileSync(
  resolve(process.cwd(), ".github/workflows/deploy-phase2-edge-functions.yml"),
  "utf8"
);

const affectedFunctions = [
  "chat-with-tutor",
  "embed-course-material",
  "agent-worker",
  "agent-orchestrator",
] as const;

describe("Phase 2 production Edge Function deployment scope", () => {
  it("deploys every affected entrypoint as one protected closure", () => {
    expect(workflow).toContain("environment: production");
    expect(workflow).toContain("persist-credentials: false");
    expect(workflow).toContain('branches: [main]');

    for (const functionName of affectedFunctions) {
      expect(workflow).toContain(`supabase/functions/${functionName}/**`);
      expect(workflow).toContain(functionName);
    }
  });

  it("redeploys all affected functions when shared AI code changes", () => {
    expect(workflow).toContain('supabase/functions/_shared/ai/**');
    const deployLine = workflow
      .split("\n")
      .find((line) => line.includes("supabase functions deploy"));

    expect(deployLine).toBeDefined();
    for (const functionName of affectedFunctions) {
      expect(workflow).toContain(`chat-with-tutor embed-course-material agent-worker agent-orchestrator`);
      expect(workflow).toContain(functionName);
    }
  });
});
