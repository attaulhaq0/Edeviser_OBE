import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { criticalRoutes } from "@/lib/criticalRoutes";
import {
  findCriticalRouteLiterals,
  validateCriticalRouteContracts,
} from "../../../scripts/check-critical-route-contracts";

describe("critical route contracts", () => {
  it("builds the required teacher and student routes", () => {
    expect(criticalRoutes.teacher.dashboard).toBe("/teacher/dashboard");
    expect(criticalRoutes.teacher.assignments).toBe("/teacher/assignments");
    expect(criticalRoutes.teacher.gradingSubmission("submission 1")).toBe(
      "/teacher/grading/submission%201"
    );
    expect(criticalRoutes.student.dashboard).toBe("/student/dashboard");
    expect(criticalRoutes.student.assignments).toBe("/student/assignments");
    expect(criticalRoutes.student.assignmentDetail("assignment 1")).toBe(
      "/student/assignments/assignment%201"
    );
    expect(criticalRoutes.student.xpHistory).toBe("/student/xp-history");
  });

  it("rejects a stale manually typed critical route", () => {
    expect(
      findCriticalRouteLiterals(`
        // @critical-e2e
        await page.goto("/teacher/assignments/audit-1/grade");
      `)
    ).toEqual(["/teacher/assignments/audit-1/grade"]);
  });

  it("binds product router and critical E2E to canonical contracts", () => {
    const router = readFileSync("src/router/AppRouter.tsx", "utf8");
    const spec = readFileSync(
      "tests/e2e/cross-role/teacher-to-student.spec.ts",
      "utf8"
    );
    expect(
      validateCriticalRouteContracts(router, [
        {
          file: "tests/e2e/cross-role/teacher-to-student.spec.ts",
          source: spec,
        },
      ])
    ).toEqual([]);
  });
});
