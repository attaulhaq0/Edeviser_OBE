import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// ---------------------------------------------------------------------------
// nuqs mock — must be before component import
// ---------------------------------------------------------------------------

let mockFilter = "all";
const mockSetFilter = vi.fn((val: string) => {
  mockFilter = val;
});

vi.mock("nuqs", () => ({
  parseAsString: {
    withDefault: (def: string) => def,
  },
  useQueryState: (_key: string, _defaultVal: string) => {
    return [mockFilter, mockSetFilter] as const;
  },
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import HeatmapFilters from "@/components/shared/HeatmapFilters";
import HeatmapSummaryStats from "@/components/shared/HeatmapSummaryStats";

// ---------------------------------------------------------------------------
// HeatmapFilters Tests
// ---------------------------------------------------------------------------

describe("HeatmapFilters", () => {
  beforeEach(() => {
    mockFilter = "all";
    mockSetFilter.mockClear();
  });

  it("renders default academic filter options", () => {
    render(<HeatmapFilters enabledWellnessHabits={[]} />);

    expect(screen.getByTestId("filter-all")).toHaveTextContent("All Habits");
    expect(screen.getByTestId("filter-login")).toHaveTextContent("Login");
    expect(screen.getByTestId("filter-submit")).toHaveTextContent("Submit");
    expect(screen.getByTestId("filter-journal")).toHaveTextContent("Journal");
    expect(screen.getByTestId("filter-read")).toHaveTextContent("Read");
  });

  it("renders enabled wellness habits as additional filters", () => {
    render(
      <HeatmapFilters enabledWellnessHabits={["meditation", "exercise"]} />
    );

    expect(screen.getByTestId("filter-meditation")).toHaveTextContent(
      "Meditation"
    );
    expect(screen.getByTestId("filter-exercise")).toHaveTextContent("Exercise");
    // Not enabled
    expect(screen.queryByTestId("filter-hydration")).not.toBeInTheDocument();
    expect(screen.queryByTestId("filter-sleep")).not.toBeInTheDocument();
  });

  it("renders all 4 wellness habits when all enabled", () => {
    render(
      <HeatmapFilters
        enabledWellnessHabits={["meditation", "hydration", "exercise", "sleep"]}
      />
    );

    expect(screen.getByTestId("filter-meditation")).toBeInTheDocument();
    expect(screen.getByTestId("filter-hydration")).toBeInTheDocument();
    expect(screen.getByTestId("filter-exercise")).toBeInTheDocument();
    expect(screen.getByTestId("filter-sleep")).toBeInTheDocument();
  });

  it("renders the active filter based on current query state", () => {
    mockFilter = "login";
    render(<HeatmapFilters enabledWellnessHabits={[]} />);

    const loginTrigger = screen.getByTestId("filter-login");
    expect(loginTrigger).toHaveAttribute("data-state", "active");

    const allTrigger = screen.getByTestId("filter-all");
    expect(allTrigger).toHaveAttribute("data-state", "inactive");
  });

  it("has 5 base filters with no wellness habits", () => {
    render(<HeatmapFilters enabledWellnessHabits={[]} />);

    const list = screen.getByTestId("heatmap-filter-list");
    const triggers = list.querySelectorAll('[data-slot="tabs-trigger"]');
    expect(triggers).toHaveLength(5);
  });

  it("has 7 filters with 2 wellness habits enabled", () => {
    render(<HeatmapFilters enabledWellnessHabits={["meditation", "sleep"]} />);

    const list = screen.getByTestId("heatmap-filter-list");
    const triggers = list.querySelectorAll('[data-slot="tabs-trigger"]');
    expect(triggers).toHaveLength(7);
  });
});

// ---------------------------------------------------------------------------
// HeatmapSummaryStats Tests
// ---------------------------------------------------------------------------

describe("HeatmapSummaryStats", () => {
  it("renders 3 KPI cards", () => {
    render(
      <HeatmapSummaryStats
        currentStreak={12}
        longestStreak={30}
        totalActiveDays={45}
      />
    );

    expect(screen.getByTestId("kpi-current-streak")).toBeInTheDocument();
    expect(screen.getByTestId("kpi-longest-streak")).toBeInTheDocument();
    expect(screen.getByTestId("kpi-total-active-days")).toBeInTheDocument();
  });

  it("displays correct values", () => {
    render(
      <HeatmapSummaryStats
        currentStreak={7}
        longestStreak={21}
        totalActiveDays={60}
      />
    );

    expect(screen.getByTestId("kpi-current-streak-value")).toHaveTextContent(
      "7"
    );
    expect(screen.getByTestId("kpi-longest-streak-value")).toHaveTextContent(
      "21"
    );
    expect(screen.getByTestId("kpi-total-active-days-value")).toHaveTextContent(
      "60"
    );
  });

  it("displays zero values correctly", () => {
    render(
      <HeatmapSummaryStats
        currentStreak={0}
        longestStreak={0}
        totalActiveDays={0}
      />
    );

    expect(screen.getByTestId("kpi-current-streak-value")).toHaveTextContent(
      "0"
    );
    expect(screen.getByTestId("kpi-longest-streak-value")).toHaveTextContent(
      "0"
    );
    expect(screen.getByTestId("kpi-total-active-days-value")).toHaveTextContent(
      "0"
    );
  });

  it("renders in a 3-column grid", () => {
    render(
      <HeatmapSummaryStats
        currentStreak={5}
        longestStreak={10}
        totalActiveDays={20}
      />
    );

    const container = screen.getByTestId("heatmap-summary-stats");
    expect(container.className).toContain("grid-cols-3");
  });
});
