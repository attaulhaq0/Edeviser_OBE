// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import i18n from "@/lib/i18n";
import type { StudentAssignment } from "@/hooks/useSubmissions";
import type { CourseMaterial, CourseModule } from "@/hooks/useCourseModules";
import type { Announcement } from "@/hooks/useAnnouncements";
import type { EnrolledCourseCard } from "@/lib/studentCourseCards";
import type { Course } from "@/types/app";

const state: {
  course: Course | null;
  modules: CourseModule[];
  materials: CourseMaterial[];
  announcements: Announcement[];
  enrolledCourses: EnrolledCourseCard[];
  assignments: StudentAssignment[];
} = {
  course: null,
  modules: [],
  materials: [],
  announcements: [],
  enrolledCourses: [],
  assignments: [],
};

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "student-1" } }),
}));

vi.mock("@/hooks/useCourses", () => ({
  useCourse: () => ({
    data: state.course,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
}));

vi.mock("@/hooks/useCourseModules", () => ({
  useCourseModules: () => ({
    data: state.modules,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useCourseAllMaterials: () => ({
    data: state.materials,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
}));

vi.mock("@/hooks/useAnnouncements", () => ({
  useAnnouncements: () => ({
    data: state.announcements,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
}));

vi.mock("@/hooks/useStudentCourses", () => ({
  useStudentCourses: () => ({
    data: state.enrolledCourses,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
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

vi.mock("@/hooks/useReadHabitTimer", () => ({
  useReadHabitTimer: () => ({ elapsedSeconds: 12, isCompleted: false }),
}));

import CourseDetailScreen from "@/features/student/courses/CourseDetailScreen";

const renderPage = () =>
  render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter initialEntries={["/student/courses/course-1"]}>
        <Routes>
          <Route
            path="/student/courses/:courseId"
            element={<CourseDetailScreen />}
          />
        </Routes>
      </MemoryRouter>
    </I18nextProvider>
  );

describe("CourseDetailScreen", () => {
  it("renders the course summary, module stack, and tutor action", () => {
    state.course = {
      id: "course-1",
      name: "Database Design",
      code: "CS301",
      program_id: "program-1",
      semester: "Fall",
      semester_id: null,
      teacher_id: "teacher-1",
      academic_year: "2025-2026",
      is_active: true,
      created_at: "2026-07-01T00:00:00Z",
    };
    state.modules = [
      {
        id: "module-1",
        course_id: "course-1",
        title: "Module 1: Intro to DBMS",
        description: "Foundations and key terms",
        sort_order: 1,
        is_published: true,
        created_at: "2026-07-01T00:00:00Z",
      },
    ];
    state.materials = [
      {
        id: "material-1",
        module_id: "module-1",
        title: "Course overview",
        type: "link",
        content_url: "https://example.com/course-overview",
        file_path: null,
        description: "Read first",
        sort_order: 1,
        is_published: true,
        clo_ids: [],
        created_at: "2026-07-01T00:00:00Z",
      },
    ];
    state.announcements = [
      {
        id: "announcement-1",
        course_id: "course-1",
        author_id: "teacher-1",
        title: "Welcome",
        content: "Keep an eye on the course updates.",
        is_pinned: true,
        created_at: "2026-07-02T00:00:00Z",
        updated_at: "2026-07-02T00:00:00Z",
      },
    ];
    state.enrolledCourses = [
      {
        id: "course-1",
        name: "Database Design",
        code: "CS301",
        teacher_name: "Prof. Ahmed",
        attainment_percent: 78,
        progress_percent: 72,
        next_assignment: {
          title: "Assignment 3",
          due_at: "2026-07-29T00:00:00Z",
        },
        color: "#3b82f6",
        assignments_count: 5,
      },
    ];
    state.assignments = [
      {
        id: "assignment-1",
        title: "Assignment 3",
        description: "Normalization practice",
        course_id: "course-1",
        due_date: "2026-07-29T00:00:00Z",
        total_marks: 100,
        late_window_hours: 0,
        prerequisites: null,
        created_at: "2026-07-01T00:00:00Z",
        submissions: [],
      },
    ];

    renderPage();

    expect(
      screen.getByRole("heading", { name: "Database Design" })
    ).toBeTruthy();
    expect(screen.getByText("72%")).toBeTruthy();
    expect(
      screen.getByRole("heading", {
        name: i18n.t("student:courses.detail.modules"),
      })
    ).toBeTruthy();
    expect(screen.getByText("Module 1: Intro to DBMS")).toBeTruthy();
    expect(screen.getByText("Welcome")).toBeTruthy();
    expect(
      screen.getByRole("link", {
        name: /Stuck on this course\?/,
      })
    ).toBeTruthy();
    expect(screen.getByText("Open resource")).toBeTruthy();
  });
});
