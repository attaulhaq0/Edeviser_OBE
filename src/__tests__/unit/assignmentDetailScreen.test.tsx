// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import i18n from "@/lib/i18n";
import type { AssignmentWithRelations } from "@/hooks/useAssignments";

const state: {
  assignment: AssignmentWithRelations | null;
} = {
  assignment: null,
};

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    profile: {
      id: "student-1",
      institution_id: "inst-1",
    },
  }),
}));

vi.mock("@/hooks/useAssignments", () => ({
  useAssignment: () => ({
    data: state.assignment,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
}));

vi.mock("@/hooks/useStudentCourses", () => ({
  useStudentCourses: () => ({
    data: [
      {
        id: "course-1",
        name: "Database Design",
      },
    ],
    isLoading: false,
    isError: false,
  }),
}));

vi.mock("@/hooks/useSubmissions", () => ({
  useSubmissions: () => ({
    data: { data: [] },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useCreateSubmission: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
  useUploadSubmissionFile: () => ({
    mutateAsync: vi.fn(
      async () => "submissions/student-1/assignment-1/file.pdf"
    ),
    isPending: false,
  }),
}));

vi.mock("@/hooks/useAdaptiveXP", () => ({
  useAssignmentDifficultyBonus: () => ({
    data: { bloomsLevel: "analyzing", multiplier: 1.5 },
  }),
}));

vi.mock("@/hooks/useReadHabitTimer", () => ({
  useReadHabitTimer: () => ({ elapsedSeconds: 12, isCompleted: false }),
}));

vi.mock("@/hooks/useOptimisticXP", () => ({
  useOptimisticXP: () => ({
    awardXPOptimistic: vi.fn(),
  }),
}));

vi.mock("@/lib/storageUrl", () => ({
  getSignedUrl: vi.fn(async () => null),
}));

import AssignmentDetailScreen from "@/features/student/assignments/AssignmentDetailScreen";

const renderPage = () =>
  render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter initialEntries={["/student/assignments/assignment-1"]}>
        <Routes>
          <Route
            path="/student/assignments/:id"
            element={<AssignmentDetailScreen />}
          />
        </Routes>
      </MemoryRouter>
    </I18nextProvider>
  );

describe("AssignmentDetailScreen", () => {
  it("renders the prototype-style assignment summary and submission actions", () => {
    state.assignment = {
      id: "assignment-1",
      title: "Database Assignment 3",
      description:
        "Design a normalized schema for a library management system. Apply 1NF, 2NF, and 3NF.",
      course_id: "course-1",
      due_date: "2026-07-29T17:00:00Z",
      total_marks: 100,
      clo_weights: [{ clo_id: "clo-1", weight: 40 }],
      late_window_hours: 4,
      prerequisites: null,
      created_at: "2026-07-01T00:00:00Z",
      rubrics: { title: "Normalization rubric" },
      courses: { name: "Database Design" },
    };

    renderPage();

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Database Assignment 3",
      })
    ).toBeTruthy();
    expect(screen.getAllByText("Database Design").length).toBeGreaterThan(0);
    expect(screen.getByText("100")).toBeTruthy();
    expect(screen.getByText("Submit your work")).toBeTruthy();
    expect(screen.getByText("Tap to upload your file")).toBeTruthy();
    expect(
      screen.getByRole("link", {
        name: /Need help before submitting\?/,
      })
    ).toBeTruthy();
    expect(screen.getByText("Your submission")).toBeTruthy();
  });

  it("resolves the course name from enrollment data when the detail relation is absent", () => {
    state.assignment = {
      id: "assignment-1",
      title: "Database Assignment 3",
      description: "Design a normalized schema.",
      course_id: "course-1",
      due_date: "2026-07-29T17:00:00Z",
      total_marks: 100,
      clo_weights: [],
      late_window_hours: 4,
      prerequisites: null,
      created_at: "2026-07-01T00:00:00Z",
      rubrics: null,
      courses: null,
    };

    renderPage();

    expect(screen.getAllByText("Database Design").length).toBeGreaterThan(0);
    expect(screen.queryByText("Course")).toBeNull();
  });
});
