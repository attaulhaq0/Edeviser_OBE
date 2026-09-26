import { describe, expect, it } from "vitest";
import { navItems } from "@/lib/navItems";
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

    const primary = new Set(
      getPrimaryNavItems("student").map((item) => item.to)
    );
    expect(getMoreNavItems("student").map((item) => item.to)).toEqual(
      navItems.student
        .filter((item) => !primary.has(item.to))
        .map((item) => item.to)
    );
    // Surveys remain present in the declared MORE set; Sidebar alone gates the
    // actual link with an assigned-survey count.
    expect(getMoreNavItems("student").map((item) => item.to)).toContain(
      "/student/surveys"
    );
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

  it.each(["teacher", "parent", "coordinator", "admin"] as const)(
    "renders every declared %s destination exactly once with canonical ordering",
    (role) => {
      const primary = getPrimaryNavItems(role);
      const more = getMoreNavItems(role);
      const primaryPaths = new Set(primary.map((item) => item.to));
      const presented = [...primary, ...more].map((item) => item.to);
      expect(presented).toHaveLength(navItems[role].length);
      expect(new Set(presented)).toEqual(
        new Set(navItems[role].map((item) => item.to))
      );
      expect(more.map((item) => item.to)).toEqual(
        navItems[role]
          .filter((item) => !primaryPaths.has(item.to))
          .map((item) => item.to)
      );
      for (const tab of getMobileTabItems(role))
        expect(primaryPaths.has(tab.to)).toBe(true);
    }
  );

  it("reaches actual admin configuration without re-adding the DepartmentManager alias", () => {
    const more = getMoreNavItems("admin");
    expect(
      more.find((item) => item.to === "/admin/settings/configuration")?.labelKey
    ).toBe("nav.institutionSettings");
    expect(more.map((item) => item.to)).toContain("/admin/departments");
    expect(more.map((item) => item.to)).not.toContain(
      "/admin/settings/institution"
    );
    expect(
      getMoreNavItems("coordinator").find(
        (item) => item.to === "/coordinator/notifications"
      )?.labelKey
    ).toBe("nav.notifications");
  });
});
