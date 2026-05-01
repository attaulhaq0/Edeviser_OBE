// =============================================================================
// Unit tests for StudyTimeChart
// =============================================================================

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import StudyTimeChart from "@/components/shared/StudyTimeChart";
import type { WeeklyStudyData } from "@/types/planner";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeTrendData(weekCount = 4): WeeklyStudyData[] {
  const data: WeeklyStudyData[] = [];
  for (let i = 0; i < weekCount; i++) {
    const d = new Date(2025, 5, 2 + i * 7); // June 2, 9, 16, 23
    data.push({
      weekStartDate: d.toISOString().split("T")[0] as string,
      totalMinutes: 120 + i * 30,
    });
  }
  return data;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("StudyTimeChart", () => {
  it("renders the chart container with correct test id", () => {
    render(
      <StudyTimeChart data={makeTrendData()} averageMinutesPerWeek={150} />
    );
    expect(screen.getByTestId("study-time-chart")).toBeInTheDocument();
  });

  it("shows empty state when no data is provided", () => {
    render(<StudyTimeChart data={[]} averageMinutesPerWeek={0} />);
    expect(screen.getByText("No study data available")).toBeInTheDocument();
  });

  it("renders the chart title", () => {
    render(
      <StudyTimeChart data={makeTrendData()} averageMinutesPerWeek={150} />
    );
    expect(screen.getByText("Study Time Trends")).toBeInTheDocument();
  });

  it("displays the legend with weekly hours label", () => {
    render(
      <StudyTimeChart data={makeTrendData()} averageMinutesPerWeek={150} />
    );
    expect(screen.getByText("Weekly Hours")).toBeInTheDocument();
  });

  it("displays average line legend when average is > 0", () => {
    render(
      <StudyTimeChart data={makeTrendData()} averageMinutesPerWeek={150} />
    );
    // 150 min = 2.5h
    expect(screen.getByText("Average (2.5h/week)")).toBeInTheDocument();
  });

  it("does not display average legend when average is 0", () => {
    render(<StudyTimeChart data={makeTrendData()} averageMinutesPerWeek={0} />);
    expect(screen.queryByText(/Average/)).not.toBeInTheDocument();
  });

  it("renders course filter toggles when courseOptions are provided", () => {
    const courseOptions = [
      { id: "c1", name: "Math 101" },
      { id: "c2", name: "Physics 201" },
    ];
    render(
      <StudyTimeChart
        data={makeTrendData()}
        averageMinutesPerWeek={150}
        courseOptions={courseOptions}
      />
    );
    expect(screen.getByTestId("course-filter-toggles")).toBeInTheDocument();
    expect(screen.getByText("All Courses")).toBeInTheDocument();
    expect(screen.getByText("Math 101")).toBeInTheDocument();
    expect(screen.getByText("Physics 201")).toBeInTheDocument();
  });

  it("does not render course filter toggles when no courseOptions", () => {
    render(
      <StudyTimeChart data={makeTrendData()} averageMinutesPerWeek={150} />
    );
    expect(
      screen.queryByTestId("course-filter-toggles")
    ).not.toBeInTheDocument();
  });

  it("calls onCourseFilterChange when a course filter is clicked", () => {
    const onFilterChange = vi.fn();
    const courseOptions = [{ id: "c1", name: "Math 101" }];
    render(
      <StudyTimeChart
        data={makeTrendData()}
        averageMinutesPerWeek={150}
        courseOptions={courseOptions}
        onCourseFilterChange={onFilterChange}
      />
    );
    fireEvent.click(screen.getByText("Math 101"));
    expect(onFilterChange).toHaveBeenCalledWith("c1");
  });

  it("calls onCourseFilterChange with null when All Courses is clicked", () => {
    const onFilterChange = vi.fn();
    const courseOptions = [{ id: "c1", name: "Math 101" }];
    render(
      <StudyTimeChart
        data={makeTrendData()}
        averageMinutesPerWeek={150}
        courseOptions={courseOptions}
        onCourseFilterChange={onFilterChange}
        courseFilter="c1"
      />
    );
    fireEvent.click(screen.getByText("All Courses"));
    expect(onFilterChange).toHaveBeenCalledWith(null);
  });
});
