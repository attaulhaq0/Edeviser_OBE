import { describe, expect, it } from "vitest";
import {
  getMobileTabItems,
  getMoreNavItems,
  getPrimaryNavItems,
} from "@/lib/navPresentation";

describe("navPresentation", () => {
  it("keeps the teacher primary nav and mobile tabs aligned with the prototype shell", () => {
    const primary = getPrimaryNavItems("teacher").map((item) => item.to);
    const mobile = getMobileTabItems("teacher").map((item) => item.labelKey);

    expect(primary).toEqual([
      "/teacher/dashboard",
      "/teacher/students",
      "/teacher/modules",
      "/teacher/grading",
      "/teacher/settings/profile",
    ]);
    expect(mobile).toEqual([
      "nav.mobile.home",
      "nav.mobile.students",
      "nav.mobile.studio",
      "nav.mobile.grade",
      "nav.me",
    ]);
  });

  it("keeps the student sidebar and mobile tabs aligned with the prototype shell", () => {
    expect(getPrimaryNavItems("student").map((item) => item.to)).toEqual([
      "/student/dashboard",
      "/student/learning-path",
      "/student/tutor",
      "/student/progress",
      "/student/profile",
    ]);

    expect(getMoreNavItems("student").map((item) => item.to)).toEqual([
      "/student/courses",
      "/student/today",
      "/student/habits",
      "/student/planner",
      "/student/challenges",
      "/student/leaderboard",
      "/student/team",
      "/student/journal",
      "/student/calendar",
      "/student/marketplace",
      "/student/notifications",
    ]);

    expect(getMobileTabItems("student").map((item) => item.to)).toEqual([
      "/student/dashboard",
      "/student/learning-path",
      "/student/tutor",
      "/student/progress",
      "/student/profile",
    ]);
  });

  it("includes the parent support tab and route", () => {
    const mobile = getMobileTabItems("parent");
    const primary = getPrimaryNavItems("parent");

    expect(mobile).toHaveLength(4);
    expect(mobile.map((item) => item.to)).toEqual([
      "/parent/dashboard",
      "/parent/progress",
      "/parent/support",
      "/parent/profile",
    ]);
    expect(primary.map((item) => item.to)).toEqual([
      "/parent/dashboard",
      "/parent/progress",
      "/parent/support",
      "/parent/profile",
    ]);
  });

  it("uses prototype labels for every staff primary sidebar", () => {
    expect(
      getPrimaryNavItems("coordinator").map((item) => item.labelKey)
    ).toEqual([
      "nav.mobile.home",
      "nav.mobile.outcomes",
      "nav.mobile.curriculum",
      "nav.mobile.accredit",
      "nav.me",
    ]);
    expect(getPrimaryNavItems("admin").map((item) => item.labelKey)).toEqual([
      "nav.mobile.home",
      "nav.mobile.analytics",
      "nav.mobile.aiGov",
      "nav.mobile.people",
      "nav.me",
    ]);
  });

  it("uses the prototype emoji artwork for every desktop primary role", () => {
    expect(getPrimaryNavItems("student").map((item) => item.emoji)).toEqual([
      "🏠",
      "🗺️",
      "🤖",
      "📈",
      "🙂",
    ]);
    expect(getPrimaryNavItems("teacher").map((item) => item.emoji)).toEqual([
      "🏠",
      "🧑‍🎓",
      "🧬",
      "✍️",
      "🙂",
    ]);
    expect(getPrimaryNavItems("coordinator").map((item) => item.emoji)).toEqual(
      ["🏠", "🎯", "🗂️", "📋", "🙂"]
    );
  });

  it("keeps staff MORE links in the approved prototype order", () => {
    expect(getMoreNavItems("teacher").map((item) => item.labelKey)).toEqual([
      "nav.curriculumStudio",
      "nav.questionBank",
      "nav.rubricBuilder",
      "nav.courseMaterials",
      "nav.tutorHandoffs",
      "nav.gradingQueue",
      "nav.gradebook",
      "nav.attendance",
      "nav.discussions",
      "nav.announcements",
      "nav.notifications",
    ]);
    expect(getMoreNavItems("parent").map((item) => item.labelKey)).toEqual([
      "nav.attendance",
      "nav.gradesReports",
      "nav.feesPayments",
      "nav.announcements",
      "nav.settings",
    ]);
    expect(getMoreNavItems("coordinator").map((item) => item.labelKey)).toEqual(
      [
        "nav.outcomeAttainment",
        "nav.curriculumMatrix",
        "nav.cqiPlans",
        "nav.courseFileGenerator",
        "nav.teamHealthReport",
        "nav.competencyFrameworks",
        "nav.accreditation",
        "nav.discussions",
        "nav.announcements",
        "nav.notifications",
      ]
    );
    expect(
      getMoreNavItems("coordinator").find(
        (item) => item.labelKey === "nav.accreditation"
      )?.to
    ).toBe("/coordinator/accreditation");
    expect(getMoreNavItems("admin").map((item) => item.labelKey)).toEqual([
      "nav.marketplace",
      "nav.institutionStructure",
      "nav.bulkImport",
      "nav.badgeDefinitions",
      "nav.security",
      "nav.feesManagement",
      "nav.announcements",
      "nav.notifications",
    ]);
  });
});
