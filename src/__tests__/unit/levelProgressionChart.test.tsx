import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { LevelProgressionPoint } from "@/types/habits";

// Mock Recharts to avoid SVG rendering issues in tests
vi.mock("recharts", () => ({
  LineChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="line-chart">{children}</div>
  ),
  Line: () => <div data-testid="recharts-line" />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  Tooltip: () => <div />,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  ReferenceDot: (props: Record<string, unknown>) => (
    <div data-testid={props["data-testid"] as string} />
  ),
}));

import LevelProgressionChart from "@/components/shared/LevelProgressionChart";

describe("LevelProgressionChart", () => {
  it("renders single-level message when data is empty", () => {
    render(<LevelProgressionChart data={[]} currentLevel={3} />);
    expect(screen.getByTestId("level-progression-single")).toBeInTheDocument();
    expect(
      screen.getByText("You've been consistent at Level 3 this semester")
    ).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("renders single-level message when all entries have the same level", () => {
    const data: LevelProgressionPoint[] = [
      { date: "2025-01-01", level: 2 },
      { date: "2025-02-01", level: 2 },
      { date: "2025-03-01", level: 2 },
    ];
    render(<LevelProgressionChart data={data} currentLevel={2} />);
    expect(screen.getByTestId("level-progression-single")).toBeInTheDocument();
    expect(
      screen.getByText("You've been consistent at Level 2 this semester")
    ).toBeInTheDocument();
  });

  it("renders single-level message for a single data point", () => {
    const data: LevelProgressionPoint[] = [{ date: "2025-01-15", level: 1 }];
    render(<LevelProgressionChart data={data} currentLevel={1} />);
    expect(screen.getByTestId("level-progression-single")).toBeInTheDocument();
    expect(
      screen.getByText("You've been consistent at Level 1 this semester")
    ).toBeInTheDocument();
  });

  it("renders step chart when data has multiple levels", () => {
    const data: LevelProgressionPoint[] = [
      { date: "2025-01-01", level: 1 },
      { date: "2025-02-01", level: 2 },
      { date: "2025-03-01", level: 3 },
    ];
    render(<LevelProgressionChart data={data} currentLevel={3} />);
    expect(screen.getByTestId("level-progression-chart")).toBeInTheDocument();
    expect(
      screen.queryByTestId("level-progression-single")
    ).not.toBeInTheDocument();
  });

  it("renders level-up markers at level increase points", () => {
    const data: LevelProgressionPoint[] = [
      { date: "2025-01-01", level: 1 },
      { date: "2025-02-01", level: 2 },
      { date: "2025-03-01", level: 3 },
    ];
    render(<LevelProgressionChart data={data} currentLevel={3} />);
    expect(
      screen.getByTestId("level-up-marker-2025-02-01")
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("level-up-marker-2025-03-01")
    ).toBeInTheDocument();
  });

  it("does not render level-up markers for level decreases", () => {
    const data: LevelProgressionPoint[] = [
      { date: "2025-01-01", level: 3 },
      { date: "2025-02-01", level: 2 },
      { date: "2025-03-01", level: 4 },
    ];
    render(<LevelProgressionChart data={data} currentLevel={4} />);
    expect(screen.getByTestId("level-progression-chart")).toBeInTheDocument();
    // Only the increase from 2→4 should have a marker
    expect(
      screen.queryByTestId("level-up-marker-2025-02-01")
    ).not.toBeInTheDocument();
    expect(
      screen.getByTestId("level-up-marker-2025-03-01")
    ).toBeInTheDocument();
  });

  it("displays the level value and /4 denominator in single-level view", () => {
    render(<LevelProgressionChart data={[]} currentLevel={4} />);
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("/ 4")).toBeInTheDocument();
  });

  it("uses currentLevel as fallback when data is empty", () => {
    render(<LevelProgressionChart data={[]} currentLevel={2} />);
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(
      screen.getByText("You've been consistent at Level 2 this semester")
    ).toBeInTheDocument();
  });

  it("sorts data by date before rendering chart", () => {
    const data: LevelProgressionPoint[] = [
      { date: "2025-03-01", level: 3 },
      { date: "2025-01-01", level: 1 },
      { date: "2025-02-01", level: 2 },
    ];
    render(<LevelProgressionChart data={data} currentLevel={3} />);
    // Chart should render without errors even with unsorted input
    expect(screen.getByTestId("level-progression-chart")).toBeInTheDocument();
  });
});
