import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import type { AdminPLOHeatmapRow } from "@/hooks/useAdminPLOHeatmap";

// ---------------------------------------------------------------------------
// Mocks — mirror adminDashboardAI.test.tsx so AdminDashboard renders without a
// real QueryClient/Supabase. Every hook the dashboard depends on is mocked; the
// PLO heatmap hook is driven per-test to exercise the four distinct states.
// ---------------------------------------------------------------------------

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => vi.fn() };
});

vi.mock("@/hooks/useAdminDashboard", () => ({
  useAdminKPIs: () => ({
    data: {
      totalUsers: 100,
      activeUsers: 80,
      totalPrograms: 5,
      totalCourses: 20,
      usersByRole: { admin: 2, teacher: 10, student: 68 },
    },
    isLoading: false,
  }),
  useRecentAuditLogs: () => ({ data: [], isLoading: false }),
  useOnboardingAnalytics: () => ({
    data: { totalStudents: 50, completedOnboarding: 50, completionRate: 100 },
  }),
  usePendingOnboardingStudents: () => ({ data: [] }),
}));

// The KPI aggregate is greenfield (Phase 8 Task 35). This suite drives the
// section hooks directly and renders without a QueryClientProvider, so force the
// aggregate into its error/fallback state → the dashboard reads the mocked
// useAdminKPIs (mirrors the coordinator/teacher dashboard test fixes).
vi.mock("@/hooks/useAdminDashboardAggregate", () => ({
  useAdminDashboardAggregate: () => ({
    data: undefined,
    isPending: false,
    isError: true,
    isSuccess: false,
  }),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "admin-1", email: "admin@test.com" },
    profile: {
      id: "admin-1",
      full_name: "Admin User",
      role: "admin",
      institution_id: "inst-1",
      avatar_url: null,
    },
    role: "admin",
    institutionId: "inst-1",
  }),
}));

vi.mock("@/hooks/useAIPerformance", () => ({
  useAIPerformance: () => ({ data: null, isLoading: false }),
}));

// The heatmap hook is the unit under test here — driven per-test.
const mockPLOHeatmap = vi.fn();

vi.mock("@/hooks/useAdminPLOHeatmap", () => ({
  useAdminPLOHeatmap: () => mockPLOHeatmap(),
  PLO_ATTAINMENT_UNMEASURED: -1,
}));

vi.mock("date-fns", () => ({
  formatDistanceToNow: () => "2 hours ago",
}));

import AdminDashboard from "@/pages/admin/AdminDashboard";
import { getAttainmentColor } from "@/lib/attainmentClassifier";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const renderDashboard = () =>
  render(
    <MemoryRouter>
      <AdminDashboard />
    </MemoryRouter>
  );

// A small, realistic set of PLO rows: one program-scope, one CLO roll-up, one
// unmeasured (sentinel). Contributor CLO/course names are unique so they only
// appear inside the drill-down dialog (never in a heatmap cell).
const sampleRows: AdminPLOHeatmapRow[] = [
  {
    plo_id: "plo-1",
    plo_title: "PLO 1 — Critical Thinking",
    program_id: "prog-1",
    attainment_percent: 90,
    contributing_count: 2,
    derivation: "program",
    contributors: [
      {
        clo_id: "clo-1",
        clo_title: "Analyze complex problems",
        course_id: "course-1",
        course_name: "Logic 101",
        attainment_percent: 88,
      },
      {
        clo_id: "clo-2",
        clo_title: "Evaluate competing arguments",
        course_id: "course-2",
        course_name: "Rhetoric 201",
        attainment_percent: 92,
      },
    ],
  },
  {
    plo_id: "plo-2",
    plo_title: "PLO 2 — Communication",
    program_id: "prog-1",
    attainment_percent: 65,
    contributing_count: 1,
    derivation: "clo_rollup",
    contributors: [
      {
        clo_id: "clo-3",
        clo_title: "Write technical reports",
        course_id: "course-3",
        course_name: "Writing 110",
        attainment_percent: 65,
      },
    ],
  },
  {
    plo_id: "plo-3",
    plo_title: "PLO 3 — Teamwork",
    program_id: "prog-1",
    attainment_percent: -1,
    contributing_count: 0,
    derivation: "none",
    contributors: [],
  },
];

// Rendered text resolved from the `admin` i18n namespace (English).
const ERROR_TEXT = "Unable to load PLO attainment data. Please try again.";
const EMPTY_TITLE = "No Data Available";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("AdminDashboard — PLO Attainment Heatmap", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the PLO heatmap section header", () => {
    mockPLOHeatmap.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    });
    renderDashboard();
    expect(screen.getByText("PLO Attainment Heatmap")).toBeInTheDocument();
  });

  // State 1 — loading
  it("shows a shimmer/placeholder while heatmap data is loading", () => {
    mockPLOHeatmap.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    });
    const { container } = renderDashboard();

    // The loading branch renders a grid of shimmer placeholders.
    const shimmers = container.querySelectorAll(".animate-shimmer");
    expect(shimmers.length).toBeGreaterThanOrEqual(8);

    // While loading, neither the error message nor the empty state shows.
    expect(screen.queryByText(ERROR_TEXT)).not.toBeInTheDocument();
    expect(screen.queryByText(EMPTY_TITLE)).not.toBeInTheDocument();
  });

  // State 2 — error (distinct from no-data)
  it("shows an error message distinct from the no-data empty state on error", () => {
    mockPLOHeatmap.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    });
    renderDashboard();

    expect(screen.getByText(ERROR_TEXT)).toBeInTheDocument();
    // The error state must NOT be the no-data empty state.
    expect(screen.queryByText(EMPTY_TITLE)).not.toBeInTheDocument();
  });

  // State 3 — empty (no data, no error)
  it("shows a no-data empty state (not the error message) when data is empty", () => {
    mockPLOHeatmap.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    });
    renderDashboard();

    expect(screen.getByText(EMPTY_TITLE)).toBeInTheDocument();
    // The empty state must NOT be the error message.
    expect(screen.queryByText(ERROR_TEXT)).not.toBeInTheDocument();
  });

  // State 4 — data renders a color-coded grid of cells
  it("renders a color-coded grid of cells when attainment data exists", () => {
    mockPLOHeatmap.mockReturnValue({
      data: sampleRows,
      isLoading: false,
      isError: false,
    });
    renderDashboard();

    // Neither the loading, error, nor empty states are shown.
    expect(screen.queryByText(ERROR_TEXT)).not.toBeInTheDocument();
    expect(screen.queryByText(EMPTY_TITLE)).not.toBeInTheDocument();

    // Each PLO is rendered as a cell with its rounded attainment value.
    expect(screen.getByText("90%")).toBeInTheDocument();
    expect(screen.getByText("65%")).toBeInTheDocument();
    expect(screen.getByText("PLO 1 — Critical Thinking")).toBeInTheDocument();
    expect(screen.getByText("PLO 2 — Communication")).toBeInTheDocument();
    expect(screen.getByText("PLO 3 — Teamwork")).toBeInTheDocument();

    // Color-coding: each measured cell carries an attainment-derived background
    // color, and distinct attainment levels produce distinct colors.
    const excellentCell = screen.getByTitle("PLO 1 — Critical Thinking");
    const developingCell = screen.getByTitle("PLO 2 — Communication");
    const unmeasuredCell = screen.getByTitle("PLO 3 — Teamwork");

    for (const cell of [excellentCell, developingCell, unmeasuredCell]) {
      expect((cell as HTMLElement).style.backgroundColor).not.toBe("");
    }
    const colors = new Set(
      [excellentCell, developingCell, unmeasuredCell].map(
        (cell) => (cell as HTMLElement).style.backgroundColor
      )
    );
    // 90% (excellent), 65% (developing), and the unmeasured sentinel are all
    // expected to map to different colors.
    expect(colors.size).toBeGreaterThanOrEqual(2);

    // The excellent cell's color matches the platform attainment color helper.
    const expectedExcellent = document.createElement("div");
    expectedExcellent.style.backgroundColor = getAttainmentColor(90);
    expect((excellentCell as HTMLElement).style.backgroundColor).toBe(
      expectedExcellent.style.backgroundColor
    );
  });

  // Cell click → opens the drill-down dialog
  it("opens the PLO drill-down dialog when a heatmap cell is clicked", async () => {
    const user = userEvent.setup();
    mockPLOHeatmap.mockReturnValue({
      data: sampleRows,
      isLoading: false,
      isError: false,
    });
    renderDashboard();

    // Contributor details live only inside the dialog — absent before the click.
    expect(
      screen.queryByText("Analyze complex problems")
    ).not.toBeInTheDocument();

    await user.click(screen.getByTitle("PLO 1 — Critical Thinking"));

    // The dialog opens and renders the contributing CLO/course breakdown.
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(
      await screen.findByText("Analyze complex problems")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Evaluate competing arguments")
    ).toBeInTheDocument();
    expect(screen.getByText("Logic 101")).toBeInTheDocument();
    expect(screen.getByText("Rhetoric 201")).toBeInTheDocument();
  });
});
