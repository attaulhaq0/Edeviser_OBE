import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockUseGradingStats = vi.fn();
vi.mock("@/hooks/useGradingStats", () => ({
  useGradingStats: (...args: unknown[]) => mockUseGradingStats(...args),
}));

// Mock Recharts to avoid rendering SVG in jsdom
vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  LineChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="line-chart">{children}</div>
  ),
  Line: () => <div data-testid="line" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const baseStats = {
  gradedThisWeek: 12,
  avgGradingTimeSeconds: 185,
  pendingCount: 5,
  gradingStreak: 3,
  velocityTrend: [
    { date: "2024-06-10", count: 4 },
    { date: "2024-06-11", count: 6 },
    { date: "2024-06-12", count: 2 },
  ],
};

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

const renderGradingStats = async () => {
  const GradingStats = (await import("@/pages/teacher/dashboard/GradingStats"))
    .default;
  return render(<GradingStats teacherId="teacher-1" />);
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("GradingStats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders shimmer when loading", async () => {
    mockUseGradingStats.mockReturnValue({ data: undefined, isLoading: true });
    const { container } = await renderGradingStats();
    const shimmers = container.querySelectorAll('[class*="animate"]');
    expect(shimmers.length).toBeGreaterThan(0);
  });

  it("renders nothing when data is null", async () => {
    mockUseGradingStats.mockReturnValue({ data: null, isLoading: false });
    const { container } = await renderGradingStats();
    expect(container.firstChild).toBeNull();
  });

  it("renders the section heading", async () => {
    mockUseGradingStats.mockReturnValue({ data: baseStats, isLoading: false });
    await renderGradingStats();
    expect(screen.getByText("Grading Stats")).toBeInTheDocument();
  });

  it("displays graded this week KPI", async () => {
    mockUseGradingStats.mockReturnValue({ data: baseStats, isLoading: false });
    await renderGradingStats();
    expect(screen.getByText("Graded This Week")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
  });

  it("displays pending count KPI", async () => {
    mockUseGradingStats.mockReturnValue({ data: baseStats, isLoading: false });
    await renderGradingStats();
    expect(screen.getByText("Pending")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("displays grading streak KPI", async () => {
    mockUseGradingStats.mockReturnValue({ data: baseStats, isLoading: false });
    await renderGradingStats();
    expect(screen.getByText("Grading Streak")).toBeInTheDocument();
    expect(screen.getByText("3d")).toBeInTheDocument();
  });

  it("formats avg grading time as minutes and seconds", async () => {
    mockUseGradingStats.mockReturnValue({ data: baseStats, isLoading: false });
    await renderGradingStats();
    expect(screen.getByText("Avg Time")).toBeInTheDocument();
    // 185 seconds = 3m 5s
    expect(screen.getByText("3m 5s")).toBeInTheDocument();
  });

  it("shows dash when avg grading time is 0", async () => {
    mockUseGradingStats.mockReturnValue({
      data: { ...baseStats, avgGradingTimeSeconds: 0 },
      isLoading: false,
    });
    await renderGradingStats();
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("formats time as seconds only when under 60s", async () => {
    mockUseGradingStats.mockReturnValue({
      data: { ...baseStats, avgGradingTimeSeconds: 45 },
      isLoading: false,
    });
    await renderGradingStats();
    expect(screen.getByText("45s")).toBeInTheDocument();
  });

  it("formats time as minutes only when no remainder", async () => {
    mockUseGradingStats.mockReturnValue({
      data: { ...baseStats, avgGradingTimeSeconds: 120 },
      isLoading: false,
    });
    await renderGradingStats();
    expect(screen.getByText("2m")).toBeInTheDocument();
  });

  it("renders velocity trend chart when data exists", async () => {
    mockUseGradingStats.mockReturnValue({ data: baseStats, isLoading: false });
    await renderGradingStats();
    expect(
      screen.getByText("Grading Velocity (Last 30 Days)")
    ).toBeInTheDocument();
    expect(screen.getByTestId("line-chart")).toBeInTheDocument();
  });

  it("shows empty message when no velocity trend data", async () => {
    mockUseGradingStats.mockReturnValue({
      data: { ...baseStats, velocityTrend: [] },
      isLoading: false,
    });
    await renderGradingStats();
    expect(
      screen.getByText("No grading activity in the last 30 days.")
    ).toBeInTheDocument();
  });

  it("passes teacherId to the hook", async () => {
    mockUseGradingStats.mockReturnValue({ data: baseStats, isLoading: false });
    await renderGradingStats();
    expect(mockUseGradingStats).toHaveBeenCalledWith("teacher-1");
  });
});
