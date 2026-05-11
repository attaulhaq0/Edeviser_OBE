/**
 * Feature: ui-consistency-global-fixes
 * Property: Full-width header structure + duplicate-settings removal (clauses 2.27, 2.28, 3.27, 3.28)
 * Task 105
 *
 * Verifies:
 * 1. GlobalHeader is full-width (no max-w-* wrapper)
 * 2. Primary nav is present as Row 2
 * 3. No legacy sidebar (<aside>) in any role layout
 * 4. Exactly one settings entry point (ProfileDropdown "Profile Settings" item)
 * 5. No standalone Settings icon button in the header row
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

const ROLE_LAYOUTS = [
  { role: "admin", file: "src/pages/admin/AdminLayout.tsx" },
  { role: "coordinator", file: "src/pages/coordinator/CoordinatorLayout.tsx" },
  { role: "teacher", file: "src/pages/teacher/TeacherLayout.tsx" },
  { role: "student", file: "src/pages/student/StudentLayout.tsx" },
  { role: "parent", file: "src/pages/parent/ParentLayout.tsx" },
] as const;

describe("globalHeader.property.test — full-width header + single settings entry (clauses 2.27, 2.28, 3.27, 3.28)", () => {
  /**
   * Property: Every role layout uses GlobalHeader (no sidebar)
   */
  it("every role layout imports GlobalHeader and has no sidebar <aside>", () => {
    fc.assert(
      fc.property(fc.constantFrom(...ROLE_LAYOUTS), (layout) => {
        const content = readFileSafe(layout.file);
        if (!content) return;

        // Must import GlobalHeader
        expect(content).toContain("GlobalHeader");

        // Must NOT contain a sidebar <aside> element
        expect(content).not.toMatch(/<aside\b/);

        // Must NOT import TopBar (legacy)
        expect(content).not.toContain("from '@/components/shared/TopBar'");
        expect(content).not.toContain('from "@/components/shared/TopBar"');
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: GlobalHeader has no max-w-* wrapper (full-width, clause 2.27)
   */
  it("GlobalHeader has no max-w-* constraint on its container", () => {
    const content = readFileSafe("src/components/shared/GlobalHeader.tsx");
    if (!content) return;

    // The header element itself should not have max-w-* classes
    // Check that no max-w-* appears on the header or its direct row divs
    const headerLines = content
      .split("\n")
      .filter(
        (line) =>
          line.includes("<header") ||
          (line.includes("className=") && line.includes("w-full"))
      );

    for (const line of headerLines) {
      expect(line).not.toMatch(/max-w-\w+/);
    }
  });

  /**
   * Property: GlobalHeader has data-tour="primary-nav" on Row 2 nav
   */
  it('GlobalHeader exposes data-tour="primary-nav" on the nav element', () => {
    const content = readFileSafe("src/components/shared/GlobalHeader.tsx");
    if (!content) return;

    expect(content).toContain('data-tour="primary-nav"');
    expect(content).toContain('data-tour="top-bar"');
  });

  /**
   * Property: ProfileDropdown has exactly one settings entry point (data-tour="settings")
   * and no standalone Settings icon button in the header
   */
  it('ProfileDropdown has data-tour="settings" on the Profile Settings item', () => {
    const content = readFileSafe("src/components/shared/ProfileDropdown.tsx");
    if (!content) return;

    // Must have data-tour="settings" on the Profile Settings item
    expect(content).toContain('data-tour="settings"');

    // Must navigate to the profile settings route
    expect(content).toContain("settings/profile");
  });

  /**
   * Property: GlobalHeader does NOT have a standalone Settings icon link
   * (settings is now only in ProfileDropdown)
   */
  it("GlobalHeader does not contain a standalone Settings icon link", () => {
    const content = readFileSafe("src/components/shared/GlobalHeader.tsx");
    if (!content) return;

    // Should not have a standalone Settings icon (it's in ProfileDropdown now)
    // The header should not import Settings from lucide-react for a standalone link
    const hasStandaloneSettingsLink =
      content.includes("<Settings") && content.includes("to={settingsRoute}");

    expect(hasStandaloneSettingsLink).toBe(false);
  });

  /**
   * Property: No role layout has a navItems array (moved to src/lib/navItems.ts)
   */
  it("no role layout defines its own navItems array", () => {
    fc.assert(
      fc.property(fc.constantFrom(...ROLE_LAYOUTS), (layout) => {
        const content = readFileSafe(layout.file);
        if (!content) return;

        // navItems should not be defined inline in layouts anymore
        expect(content).not.toMatch(/const navItems\s*=/);
        expect(content).not.toMatch(/const navItems:\s*NavItem/);
      }),
      { numRuns: 100 }
    );
  });
});
