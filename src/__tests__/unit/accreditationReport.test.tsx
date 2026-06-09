import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import ReportGeneratorPage from "@/pages/admin/reports/ReportGeneratorPage";

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockMutate = vi.fn();
let mockIsPending = false;

vi.mock("@/hooks/useAccreditationReport", () => ({
  useGenerateReport: () => ({
    mutate: mockMutate,
    isPending: mockIsPending,
  }),
}));

vi.mock("@/hooks/usePrograms", () => ({
  usePrograms: () => ({
    data: {
      data: [
        { id: "prog-1", name: "Computer Science", code: "CS" },
        { id: "prog-2", name: "Electrical Engineering", code: "EE" },
      ],
      count: 2,
      page: 1,
      pageSize: 100,
    },
    isLoading: false,
  }),
}));

// useSemesters is now the real hook (the local stub was removed in the
// audit remediation). Mock it here so the page's `semestersLoading` resolves
// and the form renders instead of the loading shimmer.
vi.mock("@/hooks/useSemesters", () => ({
  useSemesters: () => ({ data: [], isLoading: false }),
}));

// useProgramAccreditations is queried for the selected program; stub it so no
// real network call is attempted in the unit test.
vi.mock("@/hooks/useInstitutionSettings", () => ({
  useProgramAccreditations: () => ({ data: [], isLoading: false }),
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

describe("ReportGeneratorPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsPending = false;
  });

  it("renders the page title and form elements", () => {
    render(<ReportGeneratorPage />, { wrapper: createWrapper() });

    expect(screen.getByText("Accreditation Reports")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Generate Report" })
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Program")).toBeInTheDocument();
    expect(screen.getByLabelText("Report Template")).toBeInTheDocument();
    expect(screen.getByLabelText(/email delivery/i)).toBeInTheDocument();
  });

  it("shows generate button", () => {
    render(<ReportGeneratorPage />, { wrapper: createWrapper() });

    const btn = screen.getByRole("button", { name: /generate report/i });
    expect(btn).toBeInTheDocument();
  });

  it("does not call mutate when button is clicked while disabled (no program)", () => {
    render(<ReportGeneratorPage />, { wrapper: createWrapper() });

    const btn = screen.getByRole("button", { name: /generate report/i });
    // Button is disabled when no program selected, so click is a no-op
    fireEvent.click(btn);

    expect(mockMutate).not.toHaveBeenCalled();
  });

  it("does not render result card initially", () => {
    render(<ReportGeneratorPage />, { wrapper: createWrapper() });

    expect(screen.queryByText("Report Ready")).not.toBeInTheDocument();
    expect(screen.queryByText("Download PDF")).not.toBeInTheDocument();
  });

  it("disables generate button when no program is selected", () => {
    render(<ReportGeneratorPage />, { wrapper: createWrapper() });

    const btn = screen.getByRole("button", { name: /generate report/i });
    expect(btn).toBeDisabled();
  });
});
