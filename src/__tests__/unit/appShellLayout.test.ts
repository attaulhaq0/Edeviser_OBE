import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(__dirname, path), "utf8");

describe("prototype application shell layout", () => {
  it("allows the middle feed to use the wide prototype content area", () => {
    const tokens = source("../../design-system/tokens.css");
    const shell = source("../../app/RoleAppShell.tsx");

    expect(tokens).toContain("--app-content-max: 82.5rem");
    expect(tokens).not.toContain("--app-content-max: 48rem");
    // max-width is only applied when a rail is present
    expect(shell).toContain("max-w-[var(--app-content-max)] mx-auto");
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

  it("centers laptop search independently of the right-side controls", () => {
    const header = source("../../components/shared/GlobalHeader.tsx");
    const styles = source("../../index.css");

    expect(header).toContain("absolute left-1/2 -translate-x-1/2");
    expect(header).toContain("hidden min-[1280px]:block");
    expect(styles).toContain("@media (min-width: 900px)");
  });
});
