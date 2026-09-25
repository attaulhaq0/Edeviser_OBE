import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import "@/lib/i18n";
import AdminAnalyticsPage from "@/pages/admin/analytics/AdminAnalyticsPage";

const state = vi.hoisted(() => ({
  pending: true,
  error: false,
  filtered: undefined as
    | undefined
    | Array<{
        plo_id: string;
        plo_title: string;
        attainment_percent: number;
        derivation: "program";
        contributing_count: number;
      }>,
  retry: vi.fn(),
}));
vi.mock("@/components/ui/select", () => ({
  Select: ({
    value,
    onValueChange,
    children,
  }: {
    value: string;
    onValueChange: (value: string) => void;
    children: React.ReactNode;
  }) => (
    <div data-filter={value}>
      <button type="button" onClick={() => onValueChange("program-a")}>
        Select Program A
      </button>
      {children}
    </div>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SelectValue: () => null,
  SelectContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SelectItem: ({ children }: { children: React.ReactNode }) => (
    <span>{children}</span>
  ),
}));
vi.mock("@/hooks/useAdminAnalytics", () => ({
  MIN_COHORT_THRESHOLD: 3,
  useAdminAnalytics: () => ({
    isLoading: false,
    error: null,
    data: {
      weeklyActiveLearners: [],
      masteryDistribution: {
        excellentPercent: 0,
        satisfactoryPercent: 0,
        developingPercent: 0,
        notYetPercent: 0,
        unmeasuredPercent: 0,
      },
      retentionRisk: { onTrack: 0, watch: 0, atRisk: 0, total: 0 },
      departments: [],
      aiCopilotPerformance: {
        hasSufficientData: false,
        suggestionAcceptanceRate: 0,
        suggestionTotal: 0,
        predictionAccuracyRate: 0,
        predictionTotal: 0,
        draftAcceptanceRate: 0,
        draftTotal: 0,
      },
      ploAttainment: [
        {
          ploId: "global",
          ploCodeTitle: "GLOBAL only PLO",
          meanAttainment: 73,
          statusBand: "satisfactory",
          derivationLabel: "recorded",
        },
      ],
    },
  }),
}));
vi.mock("@/hooks/useAdminPLOHeatmap", () => ({
  useAdminPLOHeatmap: (programId: string | undefined) => ({
    data: programId ? state.filtered : undefined,
    isPending: programId ? state.pending : true,
    isError: programId ? state.error : false,
    refetch: state.retry,
  }),
}));
vi.mock("@/hooks/usePrograms", () => ({
  usePrograms: () => ({
    data: { data: [{ id: "program-a", name: "Program A" }] },
  }),
}));
vi.mock("@/hooks/useAIPerformance", () => ({
  useAIPerformance: () => ({ data: null }),
}));
vi.mock("@/hooks/useAdminDashboard", () => ({
  useDepartmentAnalytics: () => ({ data: [], error: null }),
}));

const show = () =>
  render(
    <MemoryRouter>
      <AdminAnalyticsPage />
    </MemoryRouter>
  );
beforeEach(() => {
  state.pending = true;
  state.error = false;
  state.filtered = undefined;
  state.retry.mockClear();
});

describe("routed admin analytics does not leak all-program PLOs into selected filters", () => {
  it("keeps an all-program source fallback while no program filter is selected", () => {
    show();
    expect(screen.getByText("GLOBAL only PLO")).toBeInTheDocument();
  });
  it("hides global fallback while the chosen program's PLOs are loading", () => {
    show();
    fireEvent.click(screen.getByRole("button", { name: "Select Program A" }));
    expect(screen.queryByText("GLOBAL only PLO")).not.toBeInTheDocument();
    expect(
      screen.getByRole("status", { name: "Loading outcomes for this program…" })
    ).toHaveAttribute("aria-busy", "true");
  });
  it("shows a retryable error rather than unrelated institutional outcomes", () => {
    state.pending = false;
    state.error = true;
    show();
    fireEvent.click(screen.getByRole("button", { name: "Select Program A" }));
    expect(screen.queryByText("GLOBAL only PLO")).not.toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Could not load outcomes for this program"
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Retry filtered outcomes" })
    );
    expect(state.retry).toHaveBeenCalledTimes(1);
  });
  it("shows only the chosen program row when its measurement is available", () => {
    state.pending = false;
    state.filtered = [
      {
        plo_id: "selected",
        plo_title: "SELECTED program PLO",
        attainment_percent: 84.99,
        derivation: "program",
        contributing_count: 2,
      },
    ];
    show();
    fireEvent.click(screen.getByRole("button", { name: "Select Program A" }));
    expect(screen.queryByText("GLOBAL only PLO")).not.toBeInTheDocument();
    expect(screen.getByText("SELECTED program PLO")).toBeInTheDocument();
    expect(screen.getByText("84.99%")).toBeInTheDocument();
  });
});
