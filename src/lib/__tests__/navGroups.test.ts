import { describe, it, expect } from "vitest";
import {
  NAV_GROUPS,
  NAV_GROUP_META,
  REQUIRED_NAV_GROUPS,
  assertNavGroup,
  getRequiredNavGroup,
  isNavGroup,
  isValidNavGroupAssignment,
  NavGroupAssignmentError,
  type NavGroup,
} from "../navGroups";

describe("navGroups", () => {
  describe("metadata", () => {
    it("defines exactly the four labeled sections (R20.1)", () => {
      expect([...NAV_GROUPS]).toEqual([
        "learn",
        "growth",
        "community",
        "tools",
      ]);
    });

    it("provides bilingual-ready label keys and a stable order for every group (R20.4)", () => {
      const orders = NAV_GROUPS.map((g) => NAV_GROUP_META[g].order);
      expect(orders).toEqual([0, 1, 2, 3]);
      for (const group of NAV_GROUPS) {
        expect(NAV_GROUP_META[group].labelKey).toBe(`nav.groups.${group}`);
        expect(NAV_GROUP_META[group].group).toBe(group);
      }
    });

    it("requires the AI Tutor route to belong to the Learn group (R20.6)", () => {
      expect(REQUIRED_NAV_GROUPS["/student/tutor"]).toBe("learn");
      expect(getRequiredNavGroup("/student/tutor")).toBe("learn");
    });
  });

  describe("isNavGroup", () => {
    it("accepts defined groups and rejects everything else", () => {
      for (const group of NAV_GROUPS) expect(isNavGroup(group)).toBe(true);
      expect(isNavGroup("misc")).toBe(false);
      expect(isNavGroup(undefined)).toBe(false);
      expect(isNavGroup(null)).toBe(false);
      expect(isNavGroup(2)).toBe(false);
    });
  });

  describe("isValidNavGroupAssignment", () => {
    it("returns true when a required-placement route is in its required group", () => {
      expect(
        isValidNavGroupAssignment({ to: "/student/tutor", group: "learn" })
      ).toBe(true);
    });

    it("returns false when a required-placement route is in the wrong group", () => {
      expect(
        isValidNavGroupAssignment({ to: "/student/tutor", group: "tools" })
      ).toBe(false);
    });

    it("returns true for an unconstrained route assigned to any defined group", () => {
      expect(
        isValidNavGroupAssignment({ to: "/student/dashboard", group: "tools" })
      ).toBe(true);
    });

    it("returns false when no group is assigned", () => {
      expect(isValidNavGroupAssignment({ to: "/student/dashboard" })).toBe(
        false
      );
    });
  });

  describe("assertNavGroup", () => {
    it("passes when AI Tutor is in the Learn group (R20.6)", () => {
      expect(() =>
        assertNavGroup({ to: "/student/tutor", group: "learn" })
      ).not.toThrow();
    });

    it("rejects the AI Tutor item placed in an incorrect group (R20.6)", () => {
      expect(() =>
        assertNavGroup({ to: "/student/tutor", group: "community" })
      ).toThrow(NavGroupAssignmentError);
    });

    it("rejects an item with no group", () => {
      expect(() => assertNavGroup({ to: "/student/courses" })).toThrow(
        NavGroupAssignmentError
      );
    });

    it("rejects an item with an undefined/unknown group value", () => {
      expect(() =>
        assertNavGroup({
          to: "/student/courses",
          group: "misc" as unknown as NavGroup,
        })
      ).toThrow(NavGroupAssignmentError);
    });

    it("enforces every required placement listed in REQUIRED_NAV_GROUPS", () => {
      for (const [to, group] of Object.entries(REQUIRED_NAV_GROUPS)) {
        expect(() => assertNavGroup({ to, group })).not.toThrow();
        const wrong = NAV_GROUPS.find((g) => g !== group) as NavGroup;
        expect(() => assertNavGroup({ to, group: wrong })).toThrow(
          NavGroupAssignmentError
        );
      }
    });

    it("allows an unconstrained route in any defined group", () => {
      for (const group of NAV_GROUPS) {
        expect(() =>
          assertNavGroup({ to: "/student/dashboard", group })
        ).not.toThrow();
      }
    });
  });
});
