import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import HeatmapGrid from "@/components/shared/HeatmapGrid";
import HeatmapTooltip from "@/components/shared/HeatmapTooltip";
import type {
  HeatmapDay,
  DateRange,
  ComebackChallengeStatus,
} from "@/types/habits";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeDay(date: string, totalCount: number): HeatmapDay {
  return {
    date,
    academicCount: Math.min(totalCount, 4),
    wellnessCount: Math.max(totalCount - 4, 0),
    totalCount,
    habits: [],
  };
}

function buildDays(
  start: string,
  end: string,
  countFn: (d: string) => number = () => 0
): HeatmapDay[] {
  const days: HeatmapDay[] = [];
  const cursor = new Date(start + "T00:00:00");
  const endDate = new Date(end + "T00:00:00");
  while (cursor <= endDate) {
    const dateStr =
      cursor.getFullYear() +
      "-" +
      String(cursor.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(cursor.getDate()).padStart(2, "0");
    days.push(makeDay(dateStr, countFn(dateStr)));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

// Stub ResizeObserver
class MockResizeObserver {
  callback: ResizeObserverCallback;
  constructor(cb: ResizeObserverCallback) {
    this.callback = cb;
  }
  observe() {
    this.callback(
      [{ contentRect: { width: 900 } } as unknown as ResizeObserverEntry],
      this as unknown as ResizeObserver
    );
  }
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal("ResizeObserver", MockResizeObserver);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Comeback Challenge Overlay", () => {
  const range: DateRange = { start: "2025-01-06", end: "2025-01-19" };

  it("renders dashed teal border overlay on comeback challenge days", () => {
    const challenge: ComebackChallengeStatus = {
      active: true,
      currentDay: 1,
      totalDays: 3,
      startDate: "2025-01-08",
    };
    const days = buildDays("2025-01-06", "2025-01-19");

    render(
      <HeatmapGrid
        data={days}
        semesterRange={range}
        comebackChallenge={challenge}
      />
    );

    // Days 8, 9, 10 should have comeback overlay
    expect(
      screen.getByTestId("comeback-overlay-2025-01-08")
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("comeback-overlay-2025-01-09")
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("comeback-overlay-2025-01-10")
    ).toBeInTheDocument();

    // Day 7 and 11 should NOT have overlay
    expect(
      screen.queryByTestId("comeback-overlay-2025-01-07")
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("comeback-overlay-2025-01-11")
    ).not.toBeInTheDocument();
  });

  it("comeback overlay has dashed stroke in teal-500", () => {
    const challenge: ComebackChallengeStatus = {
      active: true,
      currentDay: 1,
      totalDays: 3,
      startDate: "2025-01-08",
    };
    const days = buildDays("2025-01-06", "2025-01-19");

    render(
      <HeatmapGrid
        data={days}
        semesterRange={range}
        comebackChallenge={challenge}
      />
    );

    const overlay = screen.getByTestId("comeback-overlay-2025-01-08");
    expect(overlay).toHaveAttribute("stroke", "#14b8a6");
    expect(overlay).toHaveAttribute("stroke-dasharray", "3 2");
    expect(overlay).toHaveAttribute("fill", "none");
  });

  it("does not render overlay when comeback challenge is inactive", () => {
    const challenge: ComebackChallengeStatus = {
      active: false,
      currentDay: 0,
      totalDays: 3,
      startDate: null,
    };
    const days = buildDays("2025-01-06", "2025-01-19");

    render(
      <HeatmapGrid
        data={days}
        semesterRange={range}
        comebackChallenge={challenge}
      />
    );

    expect(
      screen.queryByTestId("comeback-overlay-2025-01-08")
    ).not.toBeInTheDocument();
  });

  it("does not render overlay when no comebackChallenge prop is provided", () => {
    const days = buildDays("2025-01-06", "2025-01-19");

    render(<HeatmapGrid data={days} semesterRange={range} />);

    expect(
      screen.queryByTestId("comeback-overlay-2025-01-08")
    ).not.toBeInTheDocument();
  });

  it("comeback overlay has correct ARIA label", () => {
    const challenge: ComebackChallengeStatus = {
      active: true,
      currentDay: 2,
      totalDays: 3,
      startDate: "2025-01-08",
    };
    const days = buildDays("2025-01-06", "2025-01-19");

    render(
      <HeatmapGrid
        data={days}
        semesterRange={range}
        comebackChallenge={challenge}
      />
    );

    const overlay1 = screen.getByTestId("comeback-overlay-2025-01-08");
    expect(overlay1).toHaveAttribute("aria-label", "Comeback Day 1/3");

    const overlay2 = screen.getByTestId("comeback-overlay-2025-01-09");
    expect(overlay2).toHaveAttribute("aria-label", "Comeback Day 2/3");

    const overlay3 = screen.getByTestId("comeback-overlay-2025-01-10");
    expect(overlay3).toHaveAttribute("aria-label", "Comeback Day 3/3");
  });
});

describe("HeatmapTooltip — Comeback Day label", () => {
  it('shows "Comeback Day N/3" label when isComebackDay is true', () => {
    render(
      <HeatmapTooltip
        date="2025-01-08"
        habits={[]}
        xpEarned={0}
        streakActive={false}
        isComebackDay={true}
        comebackDayNumber={2}
      />
    );

    expect(screen.getByTestId("tooltip-comeback-label")).toHaveTextContent(
      "Comeback Day 2/3"
    );
  });

  it("does not show comeback label when isComebackDay is false", () => {
    render(
      <HeatmapTooltip
        date="2025-01-08"
        habits={[]}
        xpEarned={0}
        streakActive={false}
        isComebackDay={false}
      />
    );

    expect(
      screen.queryByTestId("tooltip-comeback-label")
    ).not.toBeInTheDocument();
  });

  it("does not show comeback label when prop is not provided", () => {
    render(
      <HeatmapTooltip
        date="2025-01-08"
        habits={[]}
        xpEarned={0}
        streakActive={false}
      />
    );

    expect(
      screen.queryByTestId("tooltip-comeback-label")
    ).not.toBeInTheDocument();
  });
});
