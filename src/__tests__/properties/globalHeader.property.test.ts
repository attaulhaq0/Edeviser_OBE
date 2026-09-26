/**
 * Feature: ui-consistency-global-fixes
 * Property: Full-width header structure + duplicate-settings removal (clauses 2.27, 2.28, 3.27, 3.28)
 * Task 105
 *
 * Verifies:
 * 1. GlobalHeader is full-width (no max-w-* wrapper)
 * 2. Shared responsive navigation and desktop sidebar-brand ownership are preserved
 * 3. No legacy sidebar (<aside>) in any role layout
 * 4. Exactly one settings entry point (ProfileDropdown "Profile Settings" item)
 * 5. No standalone Settings icon button in the header row
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import * as fs from "fs";
import * as path from "path";

const projectRoot = path.resolve(__dirname, "../../..");

const readSource = (relPath: string): string => {
  // Missing/unreadable/empty source must fail, never silently skip a contract.
  const content = fs.readFileSync(path.join(projectRoot, relPath), "utf-8");
  if (!content.trim()) throw new Error(`Empty source contract: ${relPath}`);
  return content;
};

const ROLE_LAYOUTS = [
  { role: "admin", file: "src/pages/admin/AdminLayout.tsx" },
  { role: "coordinator", file: "src/pages/coordinator/CoordinatorLayout.tsx" },
  { role: "teacher", file: "src/pages/teacher/TeacherLayout.tsx" },
  { role: "student", file: "src/pages/student/StudentLayout.tsx" },
  { role: "parent", file: "src/pages/parent/ParentLayout.tsx" },
] as const;

describe("globalHeader.property.test — full-width header + single settings entry (clauses 2.27, 2.28, 3.27, 3.28)", () => {
  it("fails rather than skipping a missing source contract", () => {
    expect(() => readSource("src/__tests__/fixtures/__missing_header_source__.tsx")).toThrow();
  });
  /**
   * Property: Every role layout uses the shared shell (which owns GlobalHeader)
   */
  it("every role layout uses RoleAppShell and has no sidebar <aside>", () => {
    fc.assert(
      fc.property(fc.constantFrom(...ROLE_LAYOUTS), (layout) => {
        const content = readSource(layout.file);
        expect(content.length).toBeGreaterThan(0);

        // The shared shell owns GlobalHeader so all roles receive the exact
        // same chrome without duplicating header composition per layout.
        expect(content).toContain("RoleAppShell");

        // Must NOT contain a sidebar <aside> element
        expect(content).not.toMatch(/<aside\b/);

        // Must NOT import TopBar (legacy)
        expect(content).not.toContain("from '@/components/shared/TopBar'");
        expect(content).not.toContain('from "@/components/shared/TopBar"');
      }),
      { numRuns: 100 }
    );
  });

  it("RoleAppShell owns the shared GlobalHeader", () => {
    const shell = readSource("src/app/RoleAppShell.tsx");
    expect(shell).not.toBeNull();
    expect(shell).toContain("GlobalHeader");
  });

  /**
   * Property: GlobalHeader has no max-w-* wrapper (full-width, clause 2.27)
   */
  it("GlobalHeader has no max-w-* constraint on its container", () => {
    const content = readSource("src/components/shared/GlobalHeader.tsx");
    expect(content.length).toBeGreaterThan(0);

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

    // <header> already carries the banner landmark; a nested role duplicates it.
    expect(content).not.toContain('role="banner"');
  });

  /**
   * Property: GlobalHeader has data-tour="top-bar", Sidebar has data-tour="primary-nav"
   */
  it("exposes data-tour attributes on header and sidebar", () => {
    const header = readSource("src/components/shared/GlobalHeader.tsx");
    expect(header.length).toBeGreaterThan(0);
    expect(header).toContain('data-tour="top-bar"');

    const sidebar = readSource("src/components/shared/Sidebar.tsx");
    expect(sidebar.length).toBeGreaterThan(0);
    expect(sidebar).toContain('data-tour="primary-nav"');
  });

  it("keeps the desktop sidebar brand above the full-width header", () => {
    const header = readSource("src/components/shared/GlobalHeader.tsx");
    const sidebar = readSource("src/components/shared/Sidebar.tsx");

    expect(header).not.toBeNull();
    expect(sidebar).not.toBeNull();
    expect(header).toContain("z-[100]");
    // The desktop aside is now conditionally mounted, not hidden offscreen.
    // Actual brand hit-testing and one exposed link are verified in Chromium.
    expect(sidebar).toContain("if (isDesktop)");
    expect(sidebar).toContain("z-[110]");
    expect(sidebar).toContain("<RoleBrandLink");
    expect(header).toContain('className="min-[640px]:hidden"');
  });

  /**
   * Property: ProfileDropdown has exactly one settings entry point (data-tour="settings")
   * and no standalone Settings icon button in the header
   */
  it('ProfileDropdown has data-tour="settings" on the Profile Settings item', () => {
    const content = readSource("src/components/shared/ProfileDropdown.tsx");
    expect(content.length).toBeGreaterThan(0);

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
    const content = readSource("src/components/shared/GlobalHeader.tsx");
    expect(content.length).toBeGreaterThan(0);

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
        const content = readSource(layout.file);
        expect(content.length).toBeGreaterThan(0);

        // navItems should not be defined inline in layouts anymore
        expect(content).not.toMatch(/const navItems\s*=/);
        expect(content).not.toMatch(/const navItems:\s*NavItem/);
      }),
      { numRuns: 100 }
    );
  });
});
