// Feature: student-experience-remediation, Property 11: Navigation group assignment is valid
// For any student navigation item, `assertNavGroup` holds — every item is assigned to one of
// the defined groups (Learn, Growth, Community, Tools) and required placements are enforced
// (in particular the AI Tutor item belongs to the Learn group); an item assigned to an
// incorrect group is rejected by validation.
// **Validates: Requirements 20.6**

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  assertNavGroup,
  isValidNavGroupAssignment,
  isNavGroup,
  getRequiredNavGroup,
  NavGroupAssignmentError,
  NAV_GROUPS,
  REQUIRED_NAV_GROUPS,
  type NavGroup,
  type NavGroupAssignment,
} from "@/lib/navGroups";

// ─── Arbitraries ─────────────────────────────────────────────────────────────

/** Any of the four defined navigation groups. */
const navGroupArb = fc.constantFrom<NavGroup>(...NAV_GROUPS);

/** Routes that carry a mandated placement (keys of REQUIRED_NAV_GROUPS). */
const requiredRouteArb = fc.constantFrom(
  ...(Object.keys(REQUIRED_NAV_GROUPS) as readonly string[])
);

/**
 * Routes with NO mandated placement: arbitrary path-like strings filtered to
 * exclude any route that happens to coincide with a required-placement key.
 */
const unconstrainedRouteArb = fc
  .string()
  .map((s) => `/student/free/${s}`)
  .filter((to) => getRequiredNavGroup(to) === undefined);

/**
 * Values that are NOT a defined NavGroup: undefined/null, the empty string,
 * arbitrary strings that are not one of the four groups, and non-string values.
 * Used to exercise the "missing or non-group" rejection path.
 */
const nonNavGroupArb = fc.oneof(
  fc.constant(undefined),
  fc.constant(null),
  fc.constant(""),
  fc.string().filter((s) => !(NAV_GROUPS as readonly string[]).includes(s)),
  fc.integer(),
  fc.boolean()
);

// ─── P11a: isNavGroup recognizes exactly the four defined groups ──────────────

describe("Property 11 — navigation group assignment is valid", () => {
  it("P11a: isNavGroup is true for exactly the four defined groups", () => {
    fc.assert(
      fc.property(navGroupArb, (group) => {
        expect(isNavGroup(group)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it("P11a: isNavGroup is false for any value that is not a defined group", () => {
    fc.assert(
      fc.property(nonNavGroupArb, (value) => {
        expect(isNavGroup(value)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  // ─── P11b: a valid placement is accepted ────────────────────────────────────

  it("P11b: an item assigned to its required group is accepted (no throw, valid)", () => {
    fc.assert(
      fc.property(requiredRouteArb, (to) => {
        const required = getRequiredNavGroup(to) as NavGroup;
        const item: NavGroupAssignment = { to, group: required };

        expect(isValidNavGroupAssignment(item)).toBe(true);
        expect(() => assertNavGroup(item)).not.toThrow();
      }),
      { numRuns: 100 }
    );
  });

  it("P11b: an unconstrained route is accepted under any defined group", () => {
    fc.assert(
      fc.property(unconstrainedRouteArb, navGroupArb, (to, group) => {
        const item: NavGroupAssignment = { to, group };

        // No mandated placement → any defined group satisfies validation.
        expect(getRequiredNavGroup(to)).toBeUndefined();
        expect(isValidNavGroupAssignment(item)).toBe(true);
        expect(() => assertNavGroup(item)).not.toThrow();
      }),
      { numRuns: 100 }
    );
  });

  // ─── P11c: a missing / non-group assignment is rejected ─────────────────────

  it("P11c: an item with no group (or a non-group value) is rejected for ANY route", () => {
    fc.assert(
      fc.property(
        fc.oneof(requiredRouteArb, unconstrainedRouteArb),
        nonNavGroupArb,
        (to, badGroup) => {
          // Cast through unknown: the input space deliberately includes values
          // outside the NavGroup type to model malformed assignments.
          const item = { to, group: badGroup } as unknown as NavGroupAssignment;

          expect(isValidNavGroupAssignment(item)).toBe(false);
          expect(() => assertNavGroup(item)).toThrow(NavGroupAssignmentError);
        }
      ),
      { numRuns: 100 }
    );
  });

  // ─── P11d: a wrong required placement is rejected ───────────────────────────

  it("P11d: a required-placement route assigned to the WRONG group is rejected", () => {
    fc.assert(
      fc.property(requiredRouteArb, navGroupArb, (to, group) => {
        const required = getRequiredNavGroup(to) as NavGroup;
        // Only consider assignments that differ from the mandated group.
        fc.pre(group !== required);

        const item: NavGroupAssignment = { to, group };

        expect(isValidNavGroupAssignment(item)).toBe(false);
        expect(() => assertNavGroup(item)).toThrow(NavGroupAssignmentError);
      }),
      { numRuns: 100 }
    );
  });

  // ─── P11e: required placement validates ONLY with the correct group ─────────

  it("P11e: each required route validates iff its group equals the mandated group (AI Tutor ∈ learn)", () => {
    fc.assert(
      fc.property(requiredRouteArb, navGroupArb, (to, group) => {
        const required = getRequiredNavGroup(to) as NavGroup;
        const item: NavGroupAssignment = { to, group };

        // Validity holds exactly when the assigned group matches the requirement.
        expect(isValidNavGroupAssignment(item)).toBe(group === required);
      }),
      { numRuns: 100 }
    );
  });

  it("P11e: the AI Tutor route only validates under the 'learn' group", () => {
    fc.assert(
      fc.property(navGroupArb, (group) => {
        const item: NavGroupAssignment = { to: "/student/tutor", group };
        expect(isValidNavGroupAssignment(item)).toBe(group === "learn");
        if (group === "learn") {
          expect(() => assertNavGroup(item)).not.toThrow();
        } else {
          expect(() => assertNavGroup(item)).toThrow(NavGroupAssignmentError);
        }
      }),
      { numRuns: 100 }
    );
  });
});
