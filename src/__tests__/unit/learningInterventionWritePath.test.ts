// =============================================================================
// create_learning_intervention — 8.9 closed-loop write-path contracts
//
// Pins the protected write tool that turns an approved problem-case draft
// into official learning_interventions rows:
//   - registry: exact payload keys, UUID/array bounds, duplicate rejection
//   - contracts: PROTECTED_ACTIONS includes the action; approver = coordinator
//   - executor dispatch: the orchestrator routes the action to its dedicated
//     execution RPC (execute_approved_learning_intervention_v1)
// =============================================================================

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  PROTECTED_ACTIONS,
  isProtectedActionType,
  requiredApproverRole,
} from "../../../supabase/functions/_shared/ai/contracts";
import { PROTECTED_WRITE_REGISTRY } from "../../../supabase/functions/_shared/ai/write-tools/registry";

const orchestrator = readFileSync(
  "supabase/functions/agent-orchestrator/index.ts",
  "utf8"
);

const VALID_PAYLOAD = {
  courseId: "1f0e6c1e-9c1d-4a9a-9a9a-000000000001",
  interventionType: "targeted_support",
  plan: "Small-group remediation on the listed sub-outcomes, two weeks.",
  studentIds: [
    "00000000-0000-4000-8000-000000000001",
    "00000000-0000-4000-8000-000000000002",
  ],
  recommendedOwner: "student_support",
};

describe("8.9 create_learning_intervention — registry contract", () => {
  const tool =
    PROTECTED_WRITE_REGISTRY["create_learning_intervention@1.0.0"];

  it("is registered as a coordinator-approved protected write", () => {
    expect(tool).toBeDefined();
    expect(tool.approvalRequired).toBe(true);
    expect(tool.allowedApproverRoles).toEqual(["coordinator"]);
  });

  it("accepts a valid payload (exact keys, bounded)", () => {
    expect(() => tool.validateInput(VALID_PAYLOAD)).not.toThrow();
  });

  it("rejects unsupported payload fields (exact-keys boundary)", () => {
    expect(() =>
      tool.validateInput({ ...VALID_PAYLOAD, extra: "nope" })
    ).toThrow(/unsupported field/);
  });

  it("rejects duplicate, empty, oversized or non-UUID studentIds", () => {
    expect(() =>
      tool.validateInput({ ...VALID_PAYLOAD, studentIds: [] })
    ).toThrow(/1-50 UUIDs/);
    expect(() =>
      tool.validateInput({ ...VALID_PAYLOAD, studentIds: [VALID_PAYLOAD.studentIds[0], VALID_PAYLOAD.studentIds[0]] })
    ).toThrow(/duplicates/);
    expect(() =>
      tool.validateInput({ ...VALID_PAYLOAD, studentIds: ["not-a-uuid"] })
    ).toThrow(/1-50 UUIDs/);
  });

  it("rejects invalid receipts (count must match interventionIds)", () => {
    const receipt = {
      executionId: "00000000-0000-4000-8000-00000000000a",
      interventionIds: ["00000000-0000-4000-8000-00000000000b"],
      count: 2,
      alreadyExecuted: false,
    };
    expect(() => tool.validateOutput(receipt)).toThrow(/invalid receipt/);
    expect(() =>
      tool.validateOutput({ ...receipt, count: 1 })
    ).not.toThrow();
  });
});

describe("8.9 create_learning_intervention — contracts routing", () => {
  it("is a protected action approved by the coordinator", () => {
    expect(PROTECTED_ACTIONS).toContain("create_learning_intervention");
    expect(isProtectedActionType("create_learning_intervention")).toBe(true);
    expect(requiredApproverRole("create_learning_intervention")).toBe(
      "coordinator"
    );
  });

  it("routes execution to the dedicated SQL RPC", () => {
    expect(orchestrator).toMatch(
      /create_learning_intervention"\s*\n\s*\? "execute_approved_learning_intervention_v1"/
    );
  });

  it("the execution RPC is versioned in the replay chain", () => {
    const sql = readFileSync(
      "supabase/migrations/20260907222635_create_learning_intervention_execution.sql",
      "utf8"
    );
    expect(sql).toContain(
      "CREATE OR REPLACE FUNCTION public.execute_approved_learning_intervention_v1"
    );
    expect(sql).toMatch(/SECURITY DEFINER/);
    expect(sql).toMatch(/SET search_path = ''/);
    expect(sql).toMatch(/GRANT EXECUTE[\s\S]*TO service_role/);
    // Coordinator-only at execution time, re-validated per student.
    expect(sql).toMatch(/Coordinator scope required/);
    expect(sql).toMatch(/no longer actively enrolled/);
  });
});