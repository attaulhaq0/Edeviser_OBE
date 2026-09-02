import { describe, expect, it } from "vitest";
import {
  computeCurriculumReadiness,
  readinessFromCounts,
} from "@/lib/curriculumReadiness";

describe("computeCurriculumReadiness (E2.B)", () => {
  it("returns ready=false with percent 0 when a course has no CLOs", () => {
    expect(computeCurriculumReadiness([])).toEqual({
      confirmed: 0,
      inReview: 0,
      draft: 0,
      total: 0,
      percent: 0,
      ready: false,
    });
  });

  it("counts each status bucket and is not ready while any CLO is unconfirmed", () => {
    const r = computeCurriculumReadiness([
      "confirmed",
      "confirmed",
      "in_review",
      "draft",
      "draft",
    ]);
    expect(r).toMatchObject({
      confirmed: 2,
      inReview: 1,
      draft: 2,
      total: 5,
      percent: 40,
      ready: false,
    });
  });

  it("is ready only when every CLO is confirmed", () => {
    const r = computeCurriculumReadiness([
      "confirmed",
      "confirmed",
      "confirmed",
    ]);
    expect(r.ready).toBe(true);
    expect(r.percent).toBe(100);
  });

  it("rounds percent to the nearest integer", () => {
    const r = computeCurriculumReadiness(["confirmed", "draft", "draft"]);
    expect(r.percent).toBe(33);
  });

  it("readinessFromCounts matches the status-array rollup", () => {
    expect(readinessFromCounts(0, 0, 0)).toMatchObject({
      percent: 0,
      ready: false,
    });
    expect(readinessFromCounts(2, 1, 5)).toMatchObject({
      confirmed: 2,
      inReview: 1,
      draft: 2,
      total: 5,
      percent: 40,
      ready: false,
    });
    expect(readinessFromCounts(4, 0, 4).ready).toBe(true);
  });
});
