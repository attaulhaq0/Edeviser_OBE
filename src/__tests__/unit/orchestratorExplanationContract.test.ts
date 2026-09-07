// =============================================================================
// 8.9 orchestrator explanation — security contract tests
//
// Feature: continuous-verification — 8.9 AI explanation (fail-closed)
// Pins the `explain_problem_case` channel of the agent-orchestrator to its
// security invariants (same pattern as agentWorkerSecurityContract.test.ts):
//   - role gate: coordinator / teacher / admin only
//   - institution scoping + teacher course-ownership enforced server-side
//   - the evidence packet is derived SERVER-SIDE from
//     classify_problem_cases_v1 (client supplies identifiers only)
//   - the packet is framed UNTRUSTED to the model (OWASP LLM01, check 37)
//   - the run is audited in agent_runs (insert running → completed/failed)
//   - provider failures fail closed (503 provider_unavailable)
// =============================================================================

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const orchestrator = readFileSync(
  "supabase/functions/agent-orchestrator/index.ts",
  "utf8"
);

describe("8.9 explain_problem_case — security contract", () => {
  it("exposes the bounded action channel", () => {
    expect(orchestrator).toContain('body.action === "explain_problem_case"');
  });

  it("gates the channel to coordinator / teacher / admin", () => {
    expect(orchestrator).toMatch(
      /explain_problem_case[\s\S]{0,400}identity\.role !== "coordinator" &&[\s\S]{0,120}identity\.role !== "teacher" &&[\s\S]{0,120}identity\.role !== "admin"/
    );
  });

  it("scopes the course to the caller's institution server-side (via program)", () => {
    // courses has NO institution_id — the institution is reached through
    // program_id → programs.institution_id (edge-fn schema guard enforced).
    expect(orchestrator).toMatch(
      /\.from\("courses"\)[\s\S]{0,120}\.select\("id, program_id"\)/
    );
    expect(orchestrator).toMatch(
      /\.from\("programs"\)[\s\S]{0,80}\.eq\("institution_id", identity\.institutionId\)/
    );
  });

  it("restricts teachers to courses they own", () => {
    expect(orchestrator).toMatch(
      /identity\.role === "teacher"[\s\S]{0,200}\.eq\("teacher_id", identity\.userId\)/
    );
  });

  it("derives the evidence packet SERVER-SIDE from the classifier", () => {
    expect(orchestrator).toMatch(/admin\.rpc\(\s*"classify_problem_cases_v1"/);
  });

  it("frames the packet as UNTRUSTED to the model (OWASP LLM01)", () => {
    expect(orchestrator).toContain("UNTRUSTED_EVIDENCE_PACKET");
    expect(orchestrator).toContain("PROBLEM_CASE_SYSTEM_PROMPT");
    expect(orchestrator).toContain(
      "Never invent students, assessments, causes, or data."
    );
  });

  it("audits the run in agent_runs (running → completed | failed)", () => {
    expect(orchestrator).toMatch(
      /from\("agent_runs"\)\.insert\(\{[\s\S]{0,400}status: "running"[\s\S]{0,200}provider: "deepseek"/
    );
    expect(orchestrator).toMatch(
      /status: "completed",[\s\S]{0,200}model: completion\.model/
    );
    expect(orchestrator).toMatch(
      /status: "failed",[\s\S]{0,200}error_classification: errorCode/
    );
  });

  it("fails closed on provider errors (503, non-invented content)", () => {
    expect(orchestrator).toMatch(
      /explainError instanceof AIProviderError \? 503 : 500/
    );
  });
});
