import { describe, it, expect } from "vitest";
import {
  buildSubCLOInsertPayload,
  buildSubCLOUpdatePayload,
} from "@/lib/subCLOWrite";
import type { SubCLOFormData } from "@/lib/schemas/subCLO";

// Feature: QA Round 2026-09-02 (V3) — Sub-CLO weights must persist.
// The hook previously stripped code/weight on write, so the DB had no weight
// and the manager showed "0% total" despite the UI accepting weights.

const baseForm: SubCLOFormData = {
  title: "Solve linear equations",
  description: "One-variable equations",
  code: "S-CLO-1.1",
  weight: 0.4,
  parent_outcome_id: "11111111-1111-1111-1111-111111111111",
};

describe("buildSubCLOInsertPayload", () => {
  it("carries code and weight through to the insert (QA V3 regression)", () => {
    const payload = buildSubCLOInsertPayload(baseForm);
    expect(payload).toEqual({
      title: baseForm.title,
      description: baseForm.description,
      clo_id: baseForm.parent_outcome_id,
      code: "S-CLO-1.1",
      weight: 0.4,
    });
  });

  it("normalizes missing description to null", () => {
    const payload = buildSubCLOInsertPayload({
      ...baseForm,
      description: undefined,
    });
    expect(payload.description).toBeNull();
  });
});

describe("buildSubCLOUpdatePayload", () => {
  it("includes weight and code when provided (QA V3 regression)", () => {
    const payload = buildSubCLOUpdatePayload({
      weight: 0.6,
      code: "S-CLO-1.2",
    });
    expect(payload).toEqual({ weight: 0.6, code: "S-CLO-1.2" });
  });

  it("emits only the fields that are defined", () => {
    expect(buildSubCLOUpdatePayload({ title: "Renamed" })).toEqual({
      title: "Renamed",
    });
    expect(buildSubCLOUpdatePayload({})).toEqual({});
  });
});
