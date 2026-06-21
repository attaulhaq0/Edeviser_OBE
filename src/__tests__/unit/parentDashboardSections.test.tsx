// =============================================================================
// ParentDashboard — Children Overview section states
// Feature: dashboard-and-ux-performance — Task 32 (per-section error/retry)
// -----------------------------------------------------------------------------
// Verifies the Children Overview section: renders children on success, and on a
// failed load shows a distinct, RETRYABLE error instead of the misleading
// "no children" empty state. i18n is mocked to echo keys for stable assertions.
// =============================================================================
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      if (opts) {
        let result = key;
        for (const [k, v] of Object.entries(opts)) {
          result = result.replace(`{{${k}}}`, String(v));
        }
        return result;
      }
      return key;
    },
    i18n: { language: "en", changeLanguage: vi.fn() },
  }),
  Trans: ({ children }: { children: React.ReactNode }) => children,
}));

const mockAggregate = vi.fn();
const mockParentKPIs = vi.fn();
const mockLinkedChildren = vi.fn();

vi.mock("@/hooks/useParentDashboardAggregate", () => ({
  useParentDashboardAggregate: () => mockAggregate(),
}));

vi.mock("@/hooks/useParentDashboard", () => ({
  useParentKPIs: () => mockParentKPIs(),
  useLinkedChildren: () => mockLinkedChildren(),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "parent-1" }, profile: { full_name: "Pat" } }),
}));

import ParentDashboard from "@/pages/parent/ParentDashboard";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const renderDashboard = () =>
  render(
    <MemoryRouter>
      <ParentDashboard />
    </MemoryRouter>
  );

const CHILD = {
  student_id: "s1",
  student_name: "Yusuf Ahmadi",
  current_level: 11,
  xp_total: 1986,
  current_streak: 3,
  enrolled_courses: 3,
  avg_attainment: 92,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ParentDashboard — Children Overview (Task 32)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockParentKPIs.mockReturnValue({ data: undefined, isLoading: false });
  });

  it("renders the linked children when the aggregate succeeds", () => {
    mockAggregate.mockReturnValue({
      data: {
        kpis: {
          linkedChildren: 1,
          totalCourses: 3,
          avgAttainment: 92,
          upcomingDeadlines: 0,
        },
        children: [CHILD],
      },
      isPending: false,
      isError: false,
      isSuccess: true,
      refetch: vi.fn(),
    });
    mockLinkedChildren.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });
    renderDashboard();
    expect(screen.getByText("Yusuf Ahmadi")).toBeInTheDocument();
    expect(
      screen.queryByText("parentDashboard.noChildren")
    ).not.toBeInTheDocument();
  });

  it("shows a retryable error (not the 'no children' empty state) when the load fails", () => {
    const childRefetch = vi.fn();
    mockAggregate.mockReturnValue({
      data: undefined,
      isPending: false,
      isError: true,
      isSuccess: false,
      refetch: vi.fn(),
    });
    mockLinkedChildren.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: childRefetch,
    });
    renderDashboard();
    expect(screen.getByText("errors.generic")).toBeInTheDocument();
    const retry = screen.getByRole("button", { name: "actions.retry" });
    retry.click();
    expect(childRefetch).toHaveBeenCalledTimes(1);
    // The "no children" empty state must NOT be shown for an error condition.
    expect(
      screen.queryByText("parentDashboard.noChildren")
    ).not.toBeInTheDocument();
  });
});
