import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(__dirname, path), "utf8");

describe("shared application shell layout", () => {
  it("adopts actual shared menu/select slots without role paint or primitive edits", () => {
    const controls = source("../../design-system/controls.css");
    const entry = source("../../index.css");
    const dropdown = source("../../components/ui/dropdown-menu.tsx");
    const select = source("../../components/ui/select.tsx");
    expect(entry).toContain('@import "./design-system/controls.css"');
    for (const slot of ["dropdown-menu-item", "dropdown-menu-checkbox-item", "dropdown-menu-radio-item", "dropdown-menu-sub-trigger"]) {
      expect(dropdown).toContain(`data-slot="${slot}"`);
      expect(controls).toContain(`[data-slot="${slot}"]`);
    }
    expect(select).toContain('data-slot="select-item"');
    expect(controls).toContain("min-block-size: max(44px, 2.75rem)");
    expect(controls).toContain("outline: 3px solid var(--ring)");
    expect(controls).toContain("outline-offset: -3px");
    expect(controls).toContain("padding-inline-start: 2rem");
    expect(controls).toContain("inset-inline-start: 0.5rem");
    expect(dropdown).toContain('<span className="pointer-events-none absolute left-2');
    expect(controls).not.toMatch(/!important|background(?:-color)?:|\.(?:student|teacher|admin|parent|coordinator)/);
  });
  it("uses compact chrome while preserving a wide content area", () => {
    const tokens = source("../../design-system/tokens.css");
    const shell = source("../../app/RoleAppShell.tsx");

    expect(tokens).toContain("--app-header-h: 3.25rem");
    // Same 52px default, but root20 controls55px plus a3px ring fit inside65px.
    expect(3.25 * 16).toBe(52);
    expect(3.25 * 20).toBeGreaterThanOrEqual(2.75 * 20 + 6);
    expect(tokens).toContain("--app-sidebar-w: 13.5rem");
    expect(tokens).toContain("--app-rail-w: 16.5rem");
    expect(tokens).toContain("--app-content-max: 96rem");
    expect(tokens).toContain("--app-gutter: 0.875rem");
    expect(tokens).not.toContain("--app-content-max: 48rem");
    // max-width is only applied when a rail is present
    expect(shell).toContain("max-w-(--app-content-max) mx-auto");
    expect(shell).toContain(
      "grid-cols-[var(--app-sidebar-w)_minmax(0,1fr)_var(--app-rail-w)]"
    );
    expect(shell).toContain(
      "xl:grid-cols-[var(--app-sidebar-w)_minmax(0,1fr)_var(--app-rail-w)]"
    );
    expect(shell).not.toContain("min-[1100px]");
  });

  it("keeps the right rail hidden throughout laptop widths", () => {
    const rail = source(
      "../../features/teacher/dashboard/TeacherDashboardRail.tsx"
    );

    expect(rail).toContain("xl:block");
    expect(rail).not.toContain("min-[1100px]:block");
  });

  it("renders the Learning Path without the app shell rail (own internal layout)", () => {
    const studentLayout = source("../../pages/student/StudentLayout.tsx");

    // The learning path route has a dedicated no-rail code path
    expect(studentLayout).toContain(
      'location.pathname === "/student/learning-path"'
    );
    // It renders without a rail prop
    expect(studentLayout).toContain('<RoleAppShell userRole="student">');
    // It does NOT use the StudentLearningPathRail in the STUDENT_RAILS array
    expect(studentLayout).not.toContain("StudentLearningPathRail");
  });

  it("owns page-view logging once in the shared shell", () => {
    const shell = source("../../app/RoleAppShell.tsx");
    const studentLayout = source("../../pages/student/StudentLayout.tsx");

    expect(shell).toContain("usePageViewLogger();");
    expect(studentLayout).not.toContain("usePageViewLogger");
  });

  it("maps prototype student learning-profile and settings rails", () => {
    const studentLayout = source("../../pages/student/StudentLayout.tsx");

    expect(studentLayout).toContain("StudentLearningProfileRail");
    expect(studentLayout).toContain("StudentSettingsRail");
    expect(studentLayout).toContain("/^\\/student\\/learning-profile$/");
    expect(studentLayout).toContain("/^\\/student\\/settings(?:\\/|$)/");
  });

  it("reserves native focus-scroll space at the document and actual page consumers", () => {
    const styles = source("../../index.css");
    // Source ownership only; zero-clipping/ring/occlusion checks run in Chromium.
    expect(styles).toContain("--app-focus-scroll-gap: 0.5rem");
    expect(styles).toMatch(/html\s*\{\s*scroll-padding-block: var\(--app-focus-scroll-gap\)/);
    expect(styles).toContain("scroll-padding-block-start: calc(var(--app-header-h) + var(--app-focus-scroll-gap))");
    expect(styles).toContain("scroll-margin-block: var(--app-focus-scroll-gap)");
    expect(styles).toContain(".role-app-shell #main-content :where(a[href], button, input, select, textarea, [tabindex])");
    expect(styles).toContain("scroll-margin-block-end: calc(var(--app-mobile-nav-clearance) + var(--app-focus-scroll-gap))");
    // Clearance is read inside its shell, not from an undefined descendant var on html.
    expect(styles).not.toMatch(/html[^{}]*\{[^}]*var\(--app-mobile-nav-clearance\)/);
  });

  it("centers wide-screen search without a direction-sensitive translation", () => {
    const header = source("../../components/shared/GlobalHeader.tsx");
    const styles = source("../../index.css");

    // Source contract only; real English/Arabic centering is checked in Chromium.
    expect(header).toContain("absolute inset-x-0 mx-auto");
    expect(header).not.toContain("-translate-x-1/2");
    expect(header).toContain("hidden min-[1280px]:block");
    expect(styles).toContain("@media (min-width: 900px)");
  });
});
