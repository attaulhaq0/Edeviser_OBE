import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

// Feature: QA Round 2026-09-02 (V5) — the assignment create route rendered an
// "unreliable/blank page" during QA. These tests pin the render path: the
// create form must always render its shell, and data-loading failures must
// surface an explicit error (never a silent empty form).

const mockCourses = vi.fn();
vi.mock("@/hooks/useCourses", () => ({
  useTeacherCourses: (...args: unknown[]) => mockCourses(...args),
}));

const mockCLOs = vi.fn();
vi.mock("@/hooks/useCLOs", () => ({
  useCLOs: (...args: unknown[]) => mockCLOs(...args),
}));

vi.mock("@/hooks/useAssignments", () => ({
  useAssignment: () => ({ data: undefined, isLoading: false }),
  useCreateAssignment: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateAssignment: () => ({ mutate: vi.fn(), isPending: false }),
}));

// 7.3(b): the coverage guard uses a react-query hook; mock it so the render
// test does not need a QueryClientProvider (all-covered → banner renders null).
vi.mock("@/hooks/useCourseAssessmentCoverage", () => ({
  useCourseAssessmentCoverage: () => ({
    data: [
      {
        clo_id: "00000000-0000-0000-0000-00000000000a",
        clo_title: "Covered CLO",
        blooms_level: null,
        assignment_count: 1,
        quiz_count: 0,
        covered: true,
      },
    ],
    isLoading: false,
  }),
}));

vi.mock("@/hooks/useAcademicCalendar", () => ({
  useAcademicCalendarEvents: () => ({ data: [] }),
}));

vi.mock("@/lib/supabase", () => ({ supabase: {} }));

import AssignmentForm from "@/pages/teacher/assignments/AssignmentForm";

const renderRoute = () =>
  render(
    <MemoryRouter initialEntries={["/teacher/assignments/new"]}>
      <Routes>
        <Route path="/teacher/assignments/new" element={<AssignmentForm />} />
      </Routes>
    </MemoryRouter>
  );

describe("AssignmentForm create route (QA V5 regression)", () => {
  it("renders the create form shell with the title field and submit button", () => {
    mockCourses.mockReturnValue({
      data: {
        data: [
          {
            id: "11111111-1111-4111-8111-111111111111",
            code: "MATH101",
            name: "Mathematics",
          },
        ],
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });
    mockCLOs.mockReturnValue({
      data: { data: [] },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    renderRoute();

    expect(
      screen.getByRole("heading", { name: "Create Assignment" })
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /create assignment/i })
    ).toBeInTheDocument();
  });

  it("shows an explicit retryable error when courses fail to load", () => {
    mockCourses.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: vi.fn(),
    });
    mockCLOs.mockReturnValue({
      data: { data: [] },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    renderRoute();

    expect(screen.getByText(/couldn’t load your courses/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
  });
});
