import { describe, it, expect } from "vitest";
import { createAssignmentSchema } from "@/lib/schemas/assignment";

// Feature: QA Round 2026-09-02 (V4) — assignment creation was blocked because
// `z.iso.datetime()` rejected the datetime-local value the form produces.
const base = {
  title: "QA Assignment",
  description: "Desc",
  course_id: "11111111-1111-4111-8111-111111111111",
  total_marks: 100,
  clo_weights: [
    { clo_id: "22222222-2222-4222-8222-222222222222", weight: 100 },
  ],
};

describe("createAssignmentSchema due_date (QA V4 regression)", () => {
  it("accepts a datetime-local value (no seconds, no Z)", () => {
    const r = createAssignmentSchema.safeParse({
      ...base,
      due_date: "2026-09-10T23:59",
    });
    expect(r.success).toBe(true);
  });

  it("accepts a full UTC ISO string (edit-mode hydration)", () => {
    const r = createAssignmentSchema.safeParse({
      ...base,
      due_date: "2026-09-10T20:59:00.000Z",
    });
    expect(r.success).toBe(true);
  });

  it("accepts a date-only value (input fallback)", () => {
    const r = createAssignmentSchema.safeParse({
      ...base,
      due_date: "2026-09-10",
    });
    expect(r.success).toBe(true);
  });

  it("rejects an empty due date", () => {
    const r = createAssignmentSchema.safeParse({ ...base, due_date: "" });
    expect(r.success).toBe(false);
  });

  it("rejects an unparseable due date", () => {
    const r = createAssignmentSchema.safeParse({
      ...base,
      due_date: "not-a-date",
    });
    expect(r.success).toBe(false);
  });
});
