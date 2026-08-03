// =============================================================================
// ParentDashboard — growth & wellbeing story (prototype rebuild P2.3)
// -----------------------------------------------------------------------------
// The rebuilt ParentDashboard (features/parent/dashboard/ParentDashboardScreen)
// sources KPIs + linked children from a single aggregate query and renders a
// single-child growth & wellbeing STORY (not a gradebook / children list):
// AI story banner, "in plain words" summary, growth + wellbeing, "one way to
// help", and a celebrate card. It maps avg_attainment to an OBE band rather than
// a raw score. i18n is mocked to echo keys for stable assertions, so the tests
// assert on the section-title keys and the empty-state key.
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
      if (opts && typeof opts === "object") {
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

vi.mock("@/hooks/useParentDashboardAggregate", () => ({
  useParentDashboardAggregate: () => mockAggregate(),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "parent-1" }, profile: { full_name: "Pat" } }),
}));

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ParentDashboard from "@/pages/parent/ParentDashboard";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const createTestQueryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } });

const renderDashboard = () =>
  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <MemoryRouter>
        <ParentDashboard />
      </MemoryRouter>
    </QueryClientProvider>
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

const success = (children: (typeof CHILD)[]) => ({
  data: {
    kpis: {
      linkedChildren: children.length,
      totalCourses: 3,
      avgAttainment: 92,
      upcomingDeadlines: 0,
    },
    children,
  },
  isPending: false,
  isError: false,
  isSuccess: true,
  refetch: vi.fn(),
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ParentDashboard — growth & wellbeing story", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the growth story when the aggregate succeeds", () => {
    mockAggregate.mockReturnValue(success([CHILD]));
    renderDashboard();

    // The "in plain words" summary + wellbeing sections render on success…
    expect(
      screen.getByText("parentDashboard.plainWords.title")
    ).toBeInTheDocument();
    expect(
      screen.getByText("parentDashboard.wellbeing.title")
    ).toBeInTheDocument();
    // …and the empty state is not shown.
    expect(
      screen.queryByText("parentDashboard.noChildren")
    ).not.toBeInTheDocument();
  });

  it("shows the link-a-child empty state when there are no linked children", () => {
    mockAggregate.mockReturnValue(success([]));
    renderDashboard();

    expect(screen.getByText("parentDashboard.noChildren")).toBeInTheDocument();
  });

  it("renders a child selector when more than one child is linked", () => {
    const second = { ...CHILD, student_id: "s2", student_name: "Layla Ahmadi" };
    mockAggregate.mockReturnValue(success([CHILD, second]));
    renderDashboard();

    // Selector uses first names for each linked child.
    expect(screen.getByText("Yusuf")).toBeInTheDocument();
    expect(screen.getByText("Layla")).toBeInTheDocument();
  });
});
