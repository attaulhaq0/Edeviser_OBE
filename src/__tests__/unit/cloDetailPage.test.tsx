// @vitest-environment happy-dom
// =============================================================================
// CLODetailPage — read-only CLO drill-down (route /teacher/clos/:id)
//
// Feature: qa-partner-review-remediation — Req 14 (P10)
// Validates: Requirements 14.1
//
// The "View" action on the CLO list opens a read-only CLO detail page showing
// the CLO with its mapped PLOs, linked assignments, and course-scope
// attainment (Req 14.1). This suite mocks the data hooks and the route param so
// no Supabase/network call is made, and drives the three render states:
//   1. data present → CLO title/blooms/course render; mapped PLOs render;
//                      linked assignments render; attainment renders
//   2. loading       → a component-level shimmer is present (no content yet)
//   3. empty/missing → no crash; per-section fallbacks + "not found" fallback
// =============================================================================

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

import type { LearningOutcome, Course } from "@/types/app";
import type {
  CLOMappedPLO,
  CLOLinkedAssignment,
  CLOAttainmentSummary,
} from "@/hooks/useCLOs";

// ---------------------------------------------------------------------------
// Mocks (must precede the component import)
// ---------------------------------------------------------------------------

// Route param: the page reads `:id` via useParams (Req 14.1). Mock the whole
// module so the page resolves `id` without a real router.
vi.mock("react-router-dom", () => ({
  useParams: () => ({ id: "clo-1" }),
  useNavigate: () => vi.fn(),
}));

// The CLO detail page composes four CLO hooks plus the course hook. Each is
// mocked so render state is driven entirely per-test.
const mockUseCLO =
  vi.fn<
    () => { data: LearningOutcome | null | undefined; isLoading: boolean }
  >();
const mockUseCLOMappedPLOs =
  vi.fn<() => { data: CLOMappedPLO[]; isLoading: boolean }>();
const mockUseCLOLinkedAssignments =
  vi.fn<() => { data: CLOLinkedAssignment[]; isLoading: boolean }>();
const mockUseCLOAttainment =
  vi.fn<() => { data: CLOAttainmentSummary | undefined; isLoading: boolean }>();
const mockUseCourse = vi.fn<() => { data: Course | null | undefined }>();

vi.mock("@/hooks/useCLOs", () => ({
  useCLO: () => mockUseCLO(),
  useCLOMappedPLOs: () => mockUseCLOMappedPLOs(),
  useCLOLinkedAssignments: () => mockUseCLOLinkedAssignments(),
  useCLOAttainment: () => mockUseCLOAttainment(),
}));

vi.mock("@/hooks/useCourses", () => ({
  useCourse: () => mockUseCourse(),
}));

import CLODetailPage from "@/pages/teacher/clos/CLODetailPage";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const makeCLO = (overrides?: Partial<LearningOutcome>): LearningOutcome => ({
  id: "clo-1",
  type: "CLO",
  title: "Demonstrate Core Concepts",
  description: "Students explain and apply the core concepts of the course.",
  institution_id: "inst-1",
  program_id: null,
  course_id: "course-1",
  blooms_level: "applying",
  sort_order: 0,
  created_by: "teacher-1",
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
  ...overrides,
});

const makeCourse = (overrides?: Partial<Course>): Course => ({
  id: "course-1",
  name: "Intro to Programming",
  code: "CS101",
  program_id: "prog-1",
  semester: "Fall",
  semester_id: "sem-1",
  teacher_id: "teacher-1",
  academic_year: "2024",
  is_active: true,
  created_at: "2024-01-01T00:00:00Z",
  ...overrides,
});

const MAPPED_PLO: CLOMappedPLO = {
  mapping_id: "map-1",
  plo_id: "plo-1",
  title: "Communicate effectively",
  weight: 0.4,
};

const LINKED_ASSIGNMENT: CLOLinkedAssignment = {
  id: "asg-1",
  title: "Midterm Essay",
  due_date: "2025-06-01",
  weight: 0.3,
};

// ---------------------------------------------------------------------------
// Default wiring — data-present "happy path"; tests override as needed.
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  mockUseCLO.mockReturnValue({ data: makeCLO(), isLoading: false });
  mockUseCLOMappedPLOs.mockReturnValue({
    data: [MAPPED_PLO],
    isLoading: false,
  });
  mockUseCLOLinkedAssignments.mockReturnValue({
    data: [LINKED_ASSIGNMENT],
    isLoading: false,
  });
  mockUseCLOAttainment.mockReturnValue({
    data: { percent: 82.5, sampleCount: 3 },
    isLoading: false,
  });
  mockUseCourse.mockReturnValue({ data: makeCourse() });
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("CLODetailPage — data present (Req 14.1)", () => {
  it("renders the CLO title, Bloom's level, and parent course name", () => {
    render(<CLODetailPage />);

    expect(screen.getByText("Demonstrate Core Concepts")).toBeInTheDocument();
    // Bloom's level "applying" renders as the "Apply" pill.
    expect(screen.getByText("Apply")).toBeInTheDocument();
    // Course name is resolved from the embedded course (no raw UUID).
    expect(screen.getByText("Intro to Programming")).toBeInTheDocument();
    // The outcome description is shown.
    expect(
      screen.getByText(
        "Students explain and apply the core concepts of the course."
      )
    ).toBeInTheDocument();
  });

  it("renders the mapped PLOs with their resolved titles and weights", () => {
    render(<CLODetailPage />);

    expect(screen.getByText("Mapped PLOs")).toBeInTheDocument();
    expect(screen.getByText("Communicate effectively")).toBeInTheDocument();
    expect(screen.getByText("Weight 40%")).toBeInTheDocument();
  });

  it("renders the linked assignments with titles and weights", () => {
    render(<CLODetailPage />);

    expect(screen.getByText("Linked Assignments")).toBeInTheDocument();
    expect(screen.getByText("Midterm Essay")).toBeInTheDocument();
    expect(screen.getByText("Weight 30%")).toBeInTheDocument();
  });

  it("renders the course-scope attainment percentage", () => {
    render(<CLODetailPage />);

    expect(screen.getByText("Course Attainment")).toBeInTheDocument();
    expect(screen.getByText("82.5%")).toBeInTheDocument();
    // The contributing-rollup count copy reflects the sample count.
    expect(screen.getByText(/Across 3 course rollups/)).toBeInTheDocument();
  });
});

describe("CLODetailPage — loading state", () => {
  it("renders a component-level shimmer and no content while the CLO loads", () => {
    mockUseCLO.mockReturnValue({ data: undefined, isLoading: true });

    const { container } = render(<CLODetailPage />);

    expect(
      container.querySelectorAll(".animate-shimmer").length
    ).toBeGreaterThan(0);
    // No CLO content is rendered yet.
    expect(
      screen.queryByText("Demonstrate Core Concepts")
    ).not.toBeInTheDocument();
  });
});

describe("CLODetailPage — empty / missing relations", () => {
  it("renders fallbacks without crashing when relations and course are missing", () => {
    mockUseCLO.mockReturnValue({
      data: makeCLO({ description: null }),
      isLoading: false,
    });
    mockUseCLOMappedPLOs.mockReturnValue({ data: [], isLoading: false });
    mockUseCLOLinkedAssignments.mockReturnValue({ data: [], isLoading: false });
    mockUseCLOAttainment.mockReturnValue({
      data: { percent: null, sampleCount: 0 },
      isLoading: false,
    });
    mockUseCourse.mockReturnValue({ data: null });

    render(<CLODetailPage />);

    // The CLO itself still renders.
    expect(screen.getByText("Demonstrate Core Concepts")).toBeInTheDocument();
    // Each section shows its empty fallback rather than crashing.
    expect(screen.getByText("No description provided.")).toBeInTheDocument();
    expect(
      screen.getByText("This CLO is not mapped to any PLOs yet.")
    ).toBeInTheDocument();
    expect(
      screen.getByText("No assignments assess this CLO yet.")
    ).toBeInTheDocument();
    expect(screen.getByText("No attainment recorded yet.")).toBeInTheDocument();
  });

  it("shows a not-found fallback when the CLO does not exist", () => {
    mockUseCLO.mockReturnValue({ data: null, isLoading: false });

    render(<CLODetailPage />);

    expect(screen.getByText(/This CLO could not be found/)).toBeInTheDocument();
  });
});
