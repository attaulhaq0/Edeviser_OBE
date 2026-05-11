import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import CourseFileGenerator from "@/pages/coordinator/course-file/CourseFileGenerator";

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockMutate = vi.fn();
let mockIsPending = false;

vi.mock("@/hooks/useCourseFile", () => ({
  useGenerateCourseFile: () => ({
    mutate: mockMutate,
    isPending: mockIsPending,
  }),
}));

vi.mock("@/hooks/useCourses", () => ({
  useCourses: () => ({
    data: {
      data: [
        { id: "course-1", name: "Data Structures", code: "CS201" },
        { id: "course-2", name: "Algorithms", code: "CS301" },
      ],
      count: 2,
      page: 1,
      pageSize: 200,
    },
    isLoading: false,
  }),
}));

vi.mock("@/hooks/useSemesters", () => ({
  useSemesters: () => ({
    data: [
      {
        id: "sem-1",
        name: "Fall 2025",
        code: "F25",
        start_date: "2025-09-01",
        end_date: "2025-12-31",
        is_active: true,
      },
      {
        id: "sem-2",
        name: "Spring 2026",
        code: "S26",
        start_date: "2026-01-15",
        end_date: "2026-05-31",
        is_active: false,
      },
    ],
    isLoading: false,
  }),
}));

const mockToastError = vi.fn();
const mockToastSuccess = vi.fn();

vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

// ─── Helpers ────────────────────────────────────────────────────────────────

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
};

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("CourseFileGenerator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsPending = false;
  });

  it("renders the page title and form elements", () => {
    render(<CourseFileGenerator />, { wrapper: createWrapper() });

    expect(screen.getByText("Course File Generator")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Generate Course File" })
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Course")).toBeInTheDocument();
    expect(screen.getByLabelText("Semester")).toBeInTheDocument();
  });

  it("shows generate button", () => {
    render(<CourseFileGenerator />, { wrapper: createWrapper() });

    const btn = screen.getByRole("button", { name: /generate course file/i });
    expect(btn).toBeInTheDocument();
  });

  it("disables generate button when no course or semester is selected", () => {
    render(<CourseFileGenerator />, { wrapper: createWrapper() });

    const btn = screen.getByRole("button", { name: /generate course file/i });
    expect(btn).toBeDisabled();
  });

  it("does not call mutate when button is clicked while disabled", () => {
    render(<CourseFileGenerator />, { wrapper: createWrapper() });

    const btn = screen.getByRole("button", { name: /generate course file/i });
    fireEvent.click(btn);

    expect(mockMutate).not.toHaveBeenCalled();
  });

  it("does not render result card initially", () => {
    render(<CourseFileGenerator />, { wrapper: createWrapper() });

    expect(screen.queryByText("Course File Ready")).not.toBeInTheDocument();
    expect(screen.queryByText("Download PDF")).not.toBeInTheDocument();
  });

  it("shows loading spinner text when isPending", () => {
    mockIsPending = true;
    render(<CourseFileGenerator />, { wrapper: createWrapper() });

    expect(
      screen.getByRole("button", { name: /generating/i })
    ).toBeInTheDocument();
  });
});
