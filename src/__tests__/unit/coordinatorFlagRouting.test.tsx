// @vitest-environment happy-dom
// =============================================================================
// Coordinator new-UI flag routing (spec task 3.3 / G.4)
// Proves the wrapper renders the NEW-UI screen when `newUiModules` is on and
// falls back to the UNCHANGED legacy screen when off — i.e. the new UI is
// correctly gated and the older UI is preserved (reversible).
// Uses CourseFileGenerator as the representative wrapper.
// =============================================================================

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

// Controllable feature-flag value (hoisted so the vi.mock factory can read it).
const { flagRef } = vi.hoisted(() => ({ flagRef: { value: true } }));

vi.mock("@/hooks/useFeatureFlag", () => ({
  useFeatureFlag: () => flagRef.value,
}));

// Stub the NEW screen so we can detect it without its full dependency tree.
vi.mock("@/pages/coordinator/course-file/CoordinatorAccreditationNew", () => ({
  default: () => <div>NEW_ACCREDITATION_SCREEN</div>,
}));

// Minimal mocks so the legacy generator renders when the flag is off.
vi.mock("@/hooks/useCourses", () => ({
  useCourses: () => ({ data: { data: [] }, isLoading: false }),
}));
vi.mock("@/hooks/useSemesters", () => ({
  useSemesters: () => ({ data: [], isLoading: false }),
}));
vi.mock("@/hooks/useCourseFile", () => ({
  useGenerateCourseFile: () => ({ mutate: vi.fn(), isPending: false }),
}));

import CourseFileGenerator from "@/pages/coordinator/course-file/CourseFileGenerator";

describe("Coordinator new-UI flag routing (CourseFileGenerator)", () => {
  beforeEach(() => {
    cleanup();
  });

  it("renders the NEW Accreditation screen when newUiModules is ON", () => {
    flagRef.value = true;
    render(<CourseFileGenerator />);
    expect(screen.getByText("NEW_ACCREDITATION_SCREEN")).toBeInTheDocument();
    // Legacy heading must NOT render.
    expect(screen.queryByText("Course File Generator")).not.toBeInTheDocument();
  });

  it("falls back to the legacy screen when newUiModules is OFF", () => {
    flagRef.value = false;
    render(<CourseFileGenerator />);
    // Legacy generator (unchanged) renders its hardcoded heading.
    expect(screen.getByText("Course File Generator")).toBeInTheDocument();
    expect(
      screen.queryByText("NEW_ACCREDITATION_SCREEN")
    ).not.toBeInTheDocument();
  });
});
