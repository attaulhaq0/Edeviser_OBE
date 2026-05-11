// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

// Mock hooks
vi.mock("@/hooks/useCourseSections", () => ({
  useCourseSections: vi.fn(() => ({
    data: [
      {
        id: "sec-1",
        course_id: "course-1",
        section_code: "A",
        teacher_id: "t1",
        capacity: 40,
        is_active: true,
        created_at: "2025-01-01",
        profiles: { id: "t1", full_name: "Dr. Smith", email: "smith@uni.edu" },
      },
      {
        id: "sec-2",
        course_id: "course-1",
        section_code: "B",
        teacher_id: "t2",
        capacity: 35,
        is_active: false,
        created_at: "2025-01-01",
        profiles: { id: "t2", full_name: "Dr. Jones", email: "jones@uni.edu" },
      },
    ],
    isLoading: false,
  })),
  useCreateCourseSection: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useUpdateCourseSection: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useDeleteCourseSection: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
}));

vi.mock("@/hooks/useCourses", () => ({
  useTeachers: vi.fn(() => ({
    data: [
      { id: "t1", full_name: "Dr. Smith" },
      { id: "t2", full_name: "Dr. Jones" },
    ],
  })),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "u1" }, institutionId: "inst-1" }),
}));

import SectionManager from "@/components/shared/SectionManager";

const createWrapper = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
};

describe("SectionManager", () => {
  it("renders section title", () => {
    render(<SectionManager courseId="course-1" courseName="CS101" />, {
      wrapper: createWrapper(),
    });
    expect(screen.getByText("Sections — CS101")).toBeInTheDocument();
  });

  it("renders add section button", () => {
    render(<SectionManager courseId="course-1" />, {
      wrapper: createWrapper(),
    });
    expect(screen.getByText("Add Section")).toBeInTheDocument();
  });

  it("renders section codes", () => {
    render(<SectionManager courseId="course-1" />, {
      wrapper: createWrapper(),
    });
    expect(screen.getByText("A")).toBeInTheDocument();
    expect(screen.getByText("B")).toBeInTheDocument();
  });

  it("renders teacher names", () => {
    render(<SectionManager courseId="course-1" />, {
      wrapper: createWrapper(),
    });
    expect(screen.getByText("Dr. Smith")).toBeInTheDocument();
    expect(screen.getByText("Dr. Jones")).toBeInTheDocument();
  });

  it("renders active/inactive badges", () => {
    render(<SectionManager courseId="course-1" />, {
      wrapper: createWrapper(),
    });
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("Inactive")).toBeInTheDocument();
  });

  it("renders capacity info", () => {
    render(<SectionManager courseId="course-1" />, {
      wrapper: createWrapper(),
    });
    expect(screen.getByText("Capacity: 40")).toBeInTheDocument();
    expect(screen.getByText("Capacity: 35")).toBeInTheDocument();
  });
});
