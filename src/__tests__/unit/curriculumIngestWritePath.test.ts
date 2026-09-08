// =============================================================================
// ingest_curriculum — 7.8 curriculum-ingest write-path contracts
//
// Pins the protected write tool that turns an approved curriculum-ingest
// proposal into official learning_outcomes + outcome_mappings rows:
//   - registry: exact payload keys, per-CLO validation, receipt
//   - contracts: approver = coordinator
//   - orchestrator dispatch → execute_approved_curriculum_ingest_v1
//   - migration contract (SECURITY DEFINER, search_path='', service_role)
// =============================================================================

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  PROTECTED_ACTIONS,
  requiredApproverRole,
} from "../../../supabase/functions/_shared/ai/contracts";
import { PROTECTED_WRITE_REGISTRY } from "../../../supabase/functions/_shared/ai/write-tools/registry";

const orchestrator = readFileSync(
  "supabase/functions/agent-orchestrator/index.ts",
  "utf8"
);

const VALID_PAYLOAD = {
  kind: "curriculum_ingest",
  course_id: "00000000-0000-4000-8000-00000000000c",
  program_id: "00000000-0000-4000-8000-00000000000d",
  syllabus_name: "Mathematics 6 syllabus (term 1)",
  clos: [
    {
      title_en: "Analyze linear equations in one variable",
      title_ar: "تحليل المعادلات الخطية بمتغير واحد",
      description_en: "Students solve and interpret linear equations.",
      blooms: 4,
      plo_id: "00000000-0000-4000-8000-00000000000e",
      plo_weight: 1.0,
      ilo_id: null,
      ilo_weight: null,
    },
  ],
};

describe("7.8 ingest_curriculum — registry contract", () => {
  const tool = PROTECTED_WRITE_REGISTRY["ingest_curriculum@1.0.0"];

  it("is registered as a coordinator-approved protected write", () => {
    expect(tool).toBeDefined();
    expect(tool.approvalRequired).toBe(true);
    expect(tool.allowedApproverRoles).toEqual(["coordinator"]);
  });

  it("accepts a valid payload (bilingual title, tentative mapping)", () => {
    expect(() => tool.validateInput(VALID_PAYLOAD)).not.toThrow();
  });

  it("rejects wrong kind, unsupported fields, and empty clos", () => {
    expect(() =>
      tool.validateInput({ ...VALID_PAYLOAD, kind: "other" })
    ).toThrow(/kind/);
    expect(() =>
      tool.validateInput({ ...VALID_PAYLOAD, extra: 1 })
    ).toThrow(/unsupported field/);
    expect(() =>
      tool.validateInput({ ...VALID_PAYLOAD, clos: [] })
    ).toThrow(/1-30 candidate objects/);
  });

  it("rejects invalid blooms, mapping weights, and ILO-without-PLO", () => {
    expect(() =>
      tool.validateInput({
        ...VALID_PAYLOAD,
        clos: [{ ...VALID_PAYLOAD.clos[0], blooms: 0 }],
      })
    ).toThrow(/integer 1-6/);
    expect(() =>
      tool.validateInput({
        ...VALID_PAYLOAD,
        clos: [{ ...VALID_PAYLOAD.clos[0], plo_weight: 0.7 }],
      })
    ).toThrow();
    expect(() =>
      tool.validateInput({
        ...VALID_PAYLOAD,
        clos: [{ ...VALID_PAYLOAD.clos[0], plo_id: null, ilo_id: "00000000-0000-4000-8000-00000000000f" }],
      })
    ).toThrow(/requires plo_id/);
  });

  it("rejects receipts whose count does not match cloIds", () => {
    const receipt = {
      executionId: "00000000-0000-4000-8000-00000000000a",
      cloIds: ["00000000-0000-4000-8000-00000000000b"],
      mappingIds: ["00000000-0000-4000-8000-00000000000e"],
      count: 2,
      alreadyExecuted: false,
    };
    expect(() => tool.validateOutput(receipt)).toThrow(/invalid receipt/);
    expect(() => tool.validateOutput({ ...receipt, count: 1 })).not.toThrow();
  });
});

describe("7.8 ingest_curriculum — contracts routing", () => {
  it("is a protected action approved by the coordinator", () => {
    expect(PROTECTED_ACTIONS).toContain("ingest_curriculum");
    expect(requiredApproverRole("ingest_curriculum")).toBe("coordinator");
  });

  it("routes execution to the dedicated curriculum-ingest RPC", () => {
    expect(orchestrator).toMatch(
      /ingest_curriculum"\s*\n\s*\? "execute_approved_curriculum_ingest_v1"/
    );
  });

  it("the execution RPC is versioned in the replay chain", () => {
    const sql = readFileSync(
      "supabase/migrations/20260908062316_execute_approved_curriculum_ingest.sql",
      "utf8"
    );
    expect(sql).toContain(
      "CREATE OR REPLACE FUNCTION public.execute_approved_curriculum_ingest_v1"
    );
    expect(sql).toMatch(/SECURITY DEFINER/);
    expect(sql).toMatch(/SET search_path = ''/);
    expect(sql).toMatch(/GRANT EXECUTE[\s\S]*TO service_role/);
    expect(sql).toMatch(/Coordinator scope required/);
    // Weight-sum constraint honored for fresh CLOs.
    expect(sql).toMatch(/single PLO mapping with weight 1\.0/);
  });
});