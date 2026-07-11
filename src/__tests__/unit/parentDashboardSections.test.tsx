// =============================================================================
// ParentDashboard — Children Overview section
// -----------------------------------------------------------------------------
// The redesigned ParentDashboard (ParentDashboardNew) sources its KPIs and
// linked children from a single aggregate query and renders the Children
// Overview on success. i18n is mocked to echo keys for stable assertions.
//
// NOTE: the legacy per-section error/retry behavior (a distinct retryable error
// instead of the "no children" empty state) is not part of the redesigned
// component, so that case is no longer asserted here.
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

describe("ParentDashboard — Children Overview", () => {
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
});
