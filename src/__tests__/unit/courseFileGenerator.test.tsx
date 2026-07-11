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

// The route (`@/pages/coordinator/course-file/CourseFileGenerator`) now
// re-exports the redesigned Accreditation Evidence screen
// (CoordinatorAccreditationNew). This suite verifies the route wiring resolves
// to a working Generate Course File tool and locks in its disabled/pending
// behavior; the full readiness/evidence/workflow surface is covered by
// coordinatorAccreditationNew.test.tsx. i18n is echoed as keys and the
// readiness/approvals + auth hooks are stubbed so the tool renders
// deterministically.
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "en", changeLanguage: () => Promise.resolve() },
  }),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ institutionId: "inst-1" }),
}));

vi.mock("@/hooks/useCoordinatorAccreditation", () => ({
  useCoordinatorAccreditationReadiness: () => ({
    data: undefined,
    isPending: false,
  }),
  useAccreditationApprovals: () => ({ data: [] }),
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

describe("CourseFileGenerator route (redesigned Accreditation Evidence)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsPending = false;
  });

  it("renders the page title and the Generate Course File form elements", () => {
    render(<CourseFileGenerator />, { wrapper: createWrapper() });

    expect(screen.getByText("accreditation.title")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "accreditation.generateTitle" })
    ).toBeInTheDocument();
    expect(screen.getByLabelText("accreditation.course")).toBeInTheDocument();
    expect(screen.getByLabelText("accreditation.semester")).toBeInTheDocument();
  });

  it("shows the generate button", () => {
    render(<CourseFileGenerator />, { wrapper: createWrapper() });

    const btn = screen.getByRole("button", { name: "accreditation.generate" });
    expect(btn).toBeInTheDocument();
  });

  it("disables generate button when no course or semester is selected", () => {
    render(<CourseFileGenerator />, { wrapper: createWrapper() });

    const btn = screen.getByRole("button", { name: "accreditation.generate" });
    expect(btn).toBeDisabled();
  });

  it("does not call mutate when button is clicked while disabled", () => {
    render(<CourseFileGenerator />, { wrapper: createWrapper() });

    const btn = screen.getByRole("button", { name: "accreditation.generate" });
    fireEvent.click(btn);

    expect(mockMutate).not.toHaveBeenCalled();
  });

  it("does not render the result card initially", () => {
    render(<CourseFileGenerator />, { wrapper: createWrapper() });

    expect(screen.queryByText("accreditation.ready")).not.toBeInTheDocument();
    expect(
      screen.queryByText("accreditation.downloadPdf")
    ).not.toBeInTheDocument();
  });

  it("shows the loading spinner text when isPending", () => {
    mockIsPending = true;
    render(<CourseFileGenerator />, { wrapper: createWrapper() });

    expect(
      screen.getByRole("button", { name: "accreditation.generating" })
    ).toBeInTheDocument();
  });
});
