/**
 * Feature: ui-consistency-global-fixes
 * Feature: prototype-frontend-rebuild
 * Property: Every role exposes the prototype's primary "Me" destination.
 *
 * Verifies that:
 * 1. Every role sidebar contains its profile route
 * 2. The header ProfileDropdown continues to expose profile access
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

// Role → prototype profile route
const ROLE_CONFIGS = [
  {
    role: "admin",
    profileRoute: "/admin/settings/profile",
  },
  {
    role: "coordinator",
    profileRoute: "/coordinator/settings/profile",
  },
  {
    role: "teacher",
    profileRoute: "/teacher/settings/profile",
  },
  {
    role: "student",
    profileRoute: "/student/profile",
  },
  {
    role: "parent",
    profileRoute: "/parent/profile",
  },
] as const;

describe("chromeEntryPoints.property.test — prototype profile entry points", () => {
  /**
   * Property: every role has a primary Me route in the unified nav source.
   *
   * The rebuilt prototype makes Me one of the main role destinations. Keeping
   * it in navItems also makes the desktop sidebar and mobile tab bar agree.
   */
  it("the unified sidebar source contains every role profile route", () => {
    const content = readFileSafe("src/lib/navItems.ts");
    if (!content) return;

    fc.assert(
      fc.property(fc.constantFrom(...ROLE_CONFIGS), (config) => {
        expect(content).toContain(`to: "${config.profileRoute}"`);
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
        expect(profileDropdownContent).toContain(
          `${_config.role}: "${_config.profileRoute}"`
        );
      }),
      { numRuns: 100 }
    );
  });
});
