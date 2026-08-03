// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { MemoryRouter } from "react-router-dom";

import i18n from "@/lib/i18n";
import type { StudentAssignment } from "@/hooks/useSubmissions";
import type { EnrolledCourseCard } from "@/lib/studentCourseCards";

const state: {
  assignments: StudentAssignment[];
  courses: EnrolledCourseCard[];
} = {
  assignments: [],
  courses: [],
};

vi.mock("nuqs", () => ({
  parseAsString: { withDefault: () => ({}) },
  useQueryState: () => ["", vi.fn()],
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    profile: { id: "student-1", institution_id: "inst-1" },
  }),
}));

vi.mock("@/hooks/useSubmissions", () => ({
  useStudentAssignments: () => ({
    data: state.assignments,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
}));

vi.mock("@/hooks/useStudentCourses", () => ({
  useStudentCourses: () => ({
    data: state.courses,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
}));

import AssignmentListScreen from "@/features/student/assignments/AssignmentListScreen";

const renderPage = () =>
  render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter>
        <AssignmentListScreen />
      </MemoryRouter>
    </I18nextProvider>
  );

describe("AssignmentListScreen", () => {
  it("renders assignments with real course names", () => {
    state.courses = [
      {
        id: "course-1",
        name: "Database Design",
        code: "CS301",
        teacher_name: "Prof. Ahmed",
        attainment_percent: 78,
        progress_percent: 72,
        next_assignment: null,
        color: "#3b82f6",
        assignments_count: 1,
      },
    ];
    state.assignments = [
      {
        id: "assignment-1",
        title: "Database Assignment 3",
        description: "Design a normalized schema.",
        course_id: "course-1",
        due_date: "2026-07-29T17:00:00Z",
        total_marks: 100,
        late_window_hours: 4,
        prerequisites: null,
        created_at: "2026-07-01T00:00:00Z",
        submissions: [],
      },
    ];

    renderPage();

    expect(screen.getByRole("heading", { name: "Assignments" })).toBeTruthy();
    expect(screen.getByText("Database Assignment 3")).toBeTruthy();
    expect(screen.getByText("Database Design")).toBeTruthy();
    expect(
      screen.getByRole("link", {
        name: /Database Assignment 3/,
      })
    ).toBeTruthy();
  });
});
