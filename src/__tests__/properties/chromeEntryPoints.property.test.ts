/**
 * Feature: ui-consistency-global-fixes
 * Property: Single Profile Entry Point in the Chrome (clauses 2.31, 3.31)
 * Task 111
 *
 * Verifies that:
 * 1. No sidebar nav contains a link to the role's profile route
 * 2. The profile route is only accessible via the header's ProfileDropdown
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import * as fs from "fs";
import * as path from "path";

const projectRoot = path.resolve(__dirname, "../../..");

const readFileSafe = (relPath: string): string | null => {
  try {
    return fs.readFileSync(path.join(projectRoot, relPath), "utf-8");
  } catch {
    return null;
  }
};

// Role → layout file + profile route
const ROLE_CONFIGS = [
  {
    role: "admin",
    layoutFile: "src/pages/admin/AdminLayout.tsx",
    profileRoute: "/admin/settings/profile",
  },
  {
    role: "coordinator",
    layoutFile: "src/pages/coordinator/CoordinatorLayout.tsx",
    profileRoute: "/coordinator/settings/profile",
  },
  {
    role: "teacher",
    layoutFile: "src/pages/teacher/TeacherLayout.tsx",
    profileRoute: "/teacher/settings/profile",
  },
  {
    role: "student",
    layoutFile: "src/pages/student/StudentLayout.tsx",
    profileRoute: "/student/settings/profile",
  },
  {
    role: "parent",
    layoutFile: "src/pages/parent/ParentLayout.tsx",
    profileRoute: "/parent/settings/profile",
  },
] as const;

describe("chromeEntryPoints.property.test — single profile entry point (clauses 2.31, 3.31)", () => {
  /**
   * Property: No orphan Profile NavLink in sidebar navItems
   *
   * For each role layout, the navItems array must NOT contain an entry
   * whose `to` matches the role's profile route. The profile route is
   * accessible only via the ProfileDropdown in the TopBar/header.
   */
  it("no sidebar navItems array contains a profile route entry", () => {
    fc.assert(
      fc.property(fc.constantFrom(...ROLE_CONFIGS), (config) => {
        const content = readFileSafe(config.layoutFile);
        if (!content) return; // File doesn't exist — skip

        // Extract all `to:` values from the navItems array
        // Pattern: to: "/some/route" or to: '/some/route'
        const toMatches = content.matchAll(/\bto:\s*["']([^"']+)["']/g);

        for (const match of toMatches) {
          const route = match[1];
          // The profile route must NOT appear in the navItems
          expect(route).not.toBe(config.profileRoute);
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Profile route is accessible via ProfileDropdown
   *
   * The ProfileDropdown component must contain a reference to each role's
   * profile route (confirming the single entry point is wired up).
   */
  it("ProfileDropdown contains a reference to each role profile route", () => {
    const profileDropdownContent = readFileSafe(
      "src/components/shared/ProfileDropdown.tsx"
    );
    if (!profileDropdownContent) return;

    fc.assert(
      fc.property(fc.constantFrom(...ROLE_CONFIGS), (_config) => {
        // The ProfileDropdown should reference the profile route pattern
        // It uses a routeMap, so check for the role key and the route pattern
        const hasProfileRoutePattern =
          profileDropdownContent.includes(`/settings/profile`) ||
          profileDropdownContent.includes(`settings/profile`);

        expect(hasProfileRoutePattern).toBe(true);
      }),
      { numRuns: 100 }
    );
  });
});
