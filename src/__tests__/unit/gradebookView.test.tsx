// @vitest-environment happy-dom
// =============================================================================
// GradebookView — auto-load, CSV export, class average, empty/loading states
//
// Feature: qa-partner-review-remediation — Req 13 (P9)
// Validates: Requirements 13.1, 13.2, 13.3, 13.4, 13.5
//
// GradebookView renders a students × assessments matrix. Req 13 adds:
//   13.1 — auto-select the course from route/context (the `course` URL param /
//          first available course) so the gradebook loads without a manual pick
//   13.2 — an "Export CSV" button that reuses the shared `downloadCsv` helper
//          from `src/lib/exportCurriculumMatrixCsv.ts`
//   13.3 — a computed class-average row derived from the displayed matrix
//   13.4 — when a course has no grades, still render the matrix structure
//          (headers + student names) with empty grade cells
//   13.5 — while loading, show a shimmer rather than the no-data presentation
//
// The data/mutation hooks are mocked (no Supabase/network). `nuqs` is stubbed
// with a controllable in-memory store + spied setters so the auto-load effect
// is observable. The real `buildGradebookCsv`/`computeClassAverages` business
// logic runs; only `downloadCsv` (the file-download side effect) is spied.
// =============================================================================

import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";

import i18n from "@/lib/i18n";
import type { Course } from "@/types/app";
import type { GradeCategory, GradebookEntry } from "@/hooks/useGradebook";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const COURSES: Course[] = [
  {
    id: "course-1",
    name: "Intro to Computer Science",
    code: "CS101",
    program_id: "prog-1",
    semester: "Fall 2025",
    semester_id: "sem-1",
    teacher_id: "teacher-1",
    academic_year: "2025",
    is_active: true,
    created_at: "2025-01-01",
  },
  {
    id: "course-2",
    name: "Data Structures",
    code: "CS201",
    program_id: "prog-1",
    semester: "Fall 2025",
    semester_id: "sem-1",
    teacher_id: "teacher-1",
    academic_year: "2025",
    is_active: true,
    created_at: "2025-01-02",
  },
];

// A single balanced (100%) category so no "weights don't sum to 100%" banner
// shows and the matrix renders cleanly.
const CATEGORIES: GradeCategory[] = [
  {
    id: "cat-1",
    course_id: "course-1",
    name: "Assignments",
    weight_percent: 100,
    sort_order: 0,
    created_at: "2025-01-01",
  },
];

// Two students with one graded assessment each → class average is computable.
// final grades 80 + 90 → mean = 85 → "85.0%", letter "A".
const GRADEBOOK_WITH_GRADES: GradebookEntry[] = [
  {
    student_id: "s1",
    student_name: "Alice Anderson",
    categories: [
      {
        category_id: "cat-1",
        category_name: "Assignments",
        weight_percent: 100,
        assessments: [
          {
            id: "a1",
            title: "Essay One",
            type: "assignment",
            score: 80,
            max_score: 100,
          },
        ],
        subtotal_percent: 80,
      },
    ],
    final_weighted_grade: 80,
    letter_grade: "",
  },
  {
    student_id: "s2",
    student_name: "Bob Brown",
    categories: [
      {
        category_id: "cat-1",
        category_name: "Assignments",
        weight_percent: 100,
        assessments: [
          {
            id: "a1",
            title: "Essay One",
            type: "assignment",
            score: 90,
            max_score: 100,
          },
        ],
        subtotal_percent: 90,
      },
    ],
    final_weighted_grade: 90,
    letter_grade: "",
  },
];

// Students enrolled, but no scores recorded yet (all assessment scores null).
// Req 13.4: the matrix structure must still render with empty cells.
const GRADEBOOK_NO_GRADES: GradebookEntry[] = [
  {
    student_id: "s1",
    student_name: "Alice Anderson",
    categories: [
      {
        category_id: "cat-1",
        category_name: "Assignments",
        weight_percent: 100,
        assessments: [
          {
            id: "a1",
            title: "Essay One",
            type: "assignment",
            score: null,
            max_score: 100,
          },
        ],
        subtotal_percent: 0,
      },
    ],
    final_weighted_grade: 0,
    letter_grade: "",
  },
];

// ---------------------------------------------------------------------------
// Mocks (must precede the component import)
// ---------------------------------------------------------------------------

// nuqs — controllable in-memory store + spied setters. Defined via vi.hoisted
// so it is available inside the hoisted vi.mock factory below.
const nuqs = vi.hoisted(() => ({
  store: new Map<string, string>(),
  setCourse: vi.fn<(value: string) => void>(),
  setSection: vi.fn<(value: string) => void>(),
}));

vi.mock("nuqs", () => ({
  parseAsString: { withDefault: (def: string) => def },
  useQueryState: (key: string, defaultVal: string) => {
    const value =
      nuqs.store.get(key) ?? (typeof defaultVal === "string" ? defaultVal : "");
    const setter = key === "course" ? nuqs.setCourse : nuqs.setSection;
    return [value, setter] as const;
  },
}));

// Gradebook data hooks — driven per-test.
const mockGradebookMatrix =
  vi.fn<() => { data: GradebookEntry[]; isLoading: boolean }>();

vi.mock("@/hooks/useGradebook", () => ({
  useGradebookMatrix: () => mockGradebookMatrix(),
  useGradeCategories: () => ({ data: CATEGORIES }),
  // GradeCategoryManager (imported by GradebookView, rendered only in the
  // non-default "Categories" tab) destructures these — provide inert stubs.
  useCreateGradeCategory: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateGradeCategory: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteGradeCategory: () => ({ mutate: vi.fn(), isPending: false }),
}));

const mockUseCourses =
  vi.fn<() => { data: { data: Course[] }; isLoading: boolean }>();

vi.mock("@/hooks/useCourses", () => ({
  useCourses: () => mockUseCourses(),
}));

vi.mock("@/hooks/useCourseSections", () => ({
  useCourseSections: () => ({ data: [] }),
}));

vi.mock("@/hooks/useInstitutionSettings", () => ({
  // null settings → component falls back to DEFAULT_GRADE_SCALES.
  useInstitutionSettings: () => ({ data: null }),
}));

// Spy only on the file-download side effect; keep the rest of the module real
// so `buildGradebookCsv` (which depends on `escapeCsvField` from this module)
// continues to work (Req 13.2/13.6 — the export reuses this shared helper).
// Defined via vi.hoisted so it is initialized before the hoisted vi.mock factory.
const { mockDownloadCsv } = vi.hoisted(() => ({
  mockDownloadCsv: vi.fn<(csv: string, filename: string) => void>(),
}));
vi.mock("@/lib/exportCurriculumMatrixCsv", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/exportCurriculumMatrixCsv")
  >("@/lib/exportCurriculumMatrixCsv");
  return { ...actual, downloadCsv: mockDownloadCsv };
});

// happy-dom lacks ResizeObserver + the pointer/scroll APIs Radix Select needs.
class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal("ResizeObserver", MockResizeObserver);

beforeAll(() => {
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = () => false;
  }
  if (!Element.prototype.releasePointerCapture) {
    Element.prototype.releasePointerCapture = () => {};
  }
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => {};
  }
});

import GradebookView from "@/pages/teacher/gradebook/GradebookView";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const renderView = () =>
  render(
    <I18nextProvider i18n={i18n}>
      <GradebookView />
    </I18nextProvider>
  );

const NO_STUDENTS_TITLE = i18n.t("common:empty.noStudents.title");

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("GradebookView — auto-load, export, class average, empty/loading (Req 13.1–13.5)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    nuqs.store.clear();
    // Default: courses available, not loading.
    mockUseCourses.mockReturnValue({
      data: { data: COURSES },
      isLoading: false,
    });
    // Default: grades present and resolved.
    mockGradebookMatrix.mockReturnValue({
      data: GRADEBOOK_WITH_GRADES,
      isLoading: false,
    });
  });

  // --- Req 13.5: loading -----------------------------------------------------
  it("shows a shimmer while the gradebook is loading (Req 13.5)", () => {
    nuqs.store.set("course", "course-1"); // past the "select a course" guard
    mockGradebookMatrix.mockReturnValue({ data: [], isLoading: true });

    const { container } = renderView();

    // Component-level shimmer placeholders are present while loading.
    expect(
      container.querySelectorAll(".animate-shimmer").length
    ).toBeGreaterThan(0);

    // The loading state is NOT the no-data empty state, and no student rows render.
    expect(screen.queryByText(NO_STUDENTS_TITLE)).not.toBeInTheDocument();
    expect(screen.queryByText("Alice Anderson")).not.toBeInTheDocument();
  });

  // --- Req 13.1: auto-load ---------------------------------------------------
  it("auto-selects the course from context when none is selected (Req 13.1)", async () => {
    // No `course` URL state set → the auto-load effect should pick the first course.
    renderView();

    await waitFor(() => {
      expect(nuqs.setCourse).toHaveBeenCalledWith("course-1");
    });
  });

  it("does not override an already-selected course (Req 13.1)", () => {
    nuqs.store.set("course", "course-2");
    renderView();
    // The course is already chosen → no auto-selection occurs.
    expect(nuqs.setCourse).not.toHaveBeenCalled();
  });

  // --- Req 13.3: data present + class-average row ----------------------------
  it("renders student names, grades, and a class-average row with the correct average (Req 13.3)", () => {
    nuqs.store.set("course", "course-1");
    renderView();

    // Student names + their grades render.
    expect(screen.getByText("Alice Anderson")).toBeInTheDocument();
    expect(screen.getByText("Bob Brown")).toBeInTheDocument();

    // The class-average row exists and shows the computed average ((80+90)/2 = 85).
    const avgRow = screen.getByText("Class Average").closest("tr");
    expect(avgRow).not.toBeNull();
    const row = avgRow as HTMLElement;
    // Final-average and category-average cells both read "85.0%".
    expect(within(row).getAllByText("85.0%").length).toBeGreaterThanOrEqual(1);
    // The per-assessment average cell reads the mean score "85".
    expect(within(row).getByText("85")).toBeInTheDocument();
    // The class-average letter grade (85% → "A" on the default scale).
    expect(within(row).getByText("A")).toBeInTheDocument();
  });

  // --- Req 13.4: empty (no grades) → matrix structure still renders ----------
  it("renders the matrix structure with empty cells when a course has no grades (Req 13.4)", () => {
    nuqs.store.set("course", "course-1");
    mockGradebookMatrix.mockReturnValue({
      data: GRADEBOOK_NO_GRADES,
      isLoading: false,
    });

    renderView();

    // Column headers + student name still render (matrix is not hidden).
    expect(screen.getByText("Student")).toBeInTheDocument();
    expect(screen.getByText("Assignments")).toBeInTheDocument();
    expect(screen.getByText("Essay One")).toBeInTheDocument();
    expect(screen.getByText("Alice Anderson")).toBeInTheDocument();

    // Empty grade cells are shown as the em-dash placeholder.
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);

    // The no-students empty state is NOT used in this "has students, no grades" case.
    expect(screen.queryByText(NO_STUDENTS_TITLE)).not.toBeInTheDocument();
  });

  // --- Req 13.2 / 13.6: Export CSV reuses the shared download helper ----------
  it("invokes the shared CSV download helper when Export CSV is clicked (Req 13.2)", async () => {
    const user = userEvent.setup();
    nuqs.store.set("course", "course-1");
    renderView();

    const exportButton = screen.getByRole("button", { name: /export csv/i });
    expect(exportButton).toBeEnabled();

    await user.click(exportButton);

    // The component delegates the file download to `downloadCsv` (Req 13.6).
    expect(mockDownloadCsv).toHaveBeenCalledTimes(1);
    const [csvContent, filename] = mockDownloadCsv.mock.calls[0]!;
    expect(typeof csvContent).toBe("string");
    expect(csvContent).toContain("Class Average");
    expect(filename).toBe("gradebook-CS101.csv");
  });

  it("disables the Export CSV button when there are no grades to export (Req 13.2)", () => {
    nuqs.store.set("course", "course-1");
    mockGradebookMatrix.mockReturnValue({ data: [], isLoading: false });

    renderView();

    expect(screen.getByRole("button", { name: /export csv/i })).toBeDisabled();
  });
});
