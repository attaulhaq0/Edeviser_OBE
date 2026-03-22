import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import HeatmapGrid from '@/components/shared/HeatmapGrid';
import HeatmapTooltip from '@/components/shared/HeatmapTooltip';
import type { HeatmapDay, DateRange, StreakMilestone } from '@/types/habits';
import { detectStreakMilestones } from '@/lib/streakMilestones';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeDay(date: string, totalCount: number, academicCount?: number): HeatmapDay {
  return {
    date,
    academicCount: academicCount ?? Math.min(totalCount, 4),
    wellnessCount: Math.max(totalCount - 4, 0),
    totalCount,
    habits: [],
  };
}

function buildDays(start: string, end: string, countFn: (d: string) => number = () => 0): HeatmapDay[] {
  const days: HeatmapDay[] = [];
  const cursor = new Date(start + 'T00:00:00');
  const endDate = new Date(end + 'T00:00:00');
  while (cursor <= endDate) {
    const dateStr =
      cursor.getFullYear() +
      '-' +
      String(cursor.getMonth() + 1).padStart(2, '0') +
      '-' +
      String(cursor.getDate()).padStart(2, '0');
    days.push(makeDay(dateStr, countFn(dateStr)));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

// Stub ResizeObserver
class MockResizeObserver {
  callback: ResizeObserverCallback;
  constructor(cb: ResizeObserverCallback) { this.callback = cb; }
  observe() {
    this.callback(
      [{ contentRect: { width: 900 } } as unknown as ResizeObserverEntry],
      this as unknown as ResizeObserver,
    );
  }
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal('ResizeObserver', MockResizeObserver);

// ---------------------------------------------------------------------------
// detectStreakMilestones unit tests
// ---------------------------------------------------------------------------

describe('detectStreakMilestones', () => {
  it('returns empty array for no data', () => {
    expect(detectStreakMilestones([])).toEqual([]);
  });

  it('returns empty array for streak shorter than 30 days', () => {
    const days = buildDays('2025-01-01', '2025-01-29', () => 1);
    expect(detectStreakMilestones(days)).toEqual([]);
  });

  it('detects 30-day milestone', () => {
    const days = buildDays('2025-01-01', '2025-01-31', () => 1);
    const milestones = detectStreakMilestones(days);
    expect(milestones).toHaveLength(1);
    expect(milestones[0]).toEqual({ days: 30, achievedDate: '2025-01-30' });
  });

  it('detects 30 and 60-day milestones', () => {
    const days = buildDays('2025-01-01', '2025-03-15', () => 1);
    const milestones = detectStreakMilestones(days);
    expect(milestones.length).toBeGreaterThanOrEqual(2);
    expect(milestones[0]!.days).toBe(30);
    expect(milestones[1]!.days).toBe(60);
  });

  it('detects all three milestones (30, 60, 100)', () => {
    const days = buildDays('2025-01-01', '2025-04-15', () => 1);
    const milestones = detectStreakMilestones(days);
    expect(milestones.length).toBeGreaterThanOrEqual(3);
    expect(milestones.map(m => m.days)).toContain(30);
    expect(milestones.map(m => m.days)).toContain(60);
    expect(milestones.map(m => m.days)).toContain(100);
  });

  it('resets streak on zero-count day', () => {
    // 29 active days, then 1 zero, then 29 more — no milestone
    const days: HeatmapDay[] = [];
    for (let i = 1; i <= 29; i++) {
      days.push(makeDay(`2025-01-${String(i).padStart(2, '0')}`, 1));
    }
    days.push(makeDay('2025-01-30', 0)); // break
    for (let i = 1; i <= 28; i++) {
      days.push(makeDay(`2025-02-${String(i).padStart(2, '0')}`, 1));
    }
    expect(detectStreakMilestones(days)).toEqual([]);
  });

  it('milestone achievedDate corresponds to the Nth consecutive active day', () => {
    const days = buildDays('2025-01-01', '2025-02-05', () => 1);
    const milestones = detectStreakMilestones(days);
    // 30th consecutive day starting from Jan 1 is Jan 30
    expect(milestones[0]!.achievedDate).toBe('2025-01-30');
  });
});

// ---------------------------------------------------------------------------
// Milestone Marker on HeatmapGrid
// ---------------------------------------------------------------------------

describe('Milestone Marker on HeatmapGrid', () => {
  const range: DateRange = { start: '2025-01-06', end: '2025-01-19' };

  it('renders star marker at milestone cell', () => {
    const milestones: StreakMilestone[] = [
      { days: 30, achievedDate: '2025-01-10' },
    ];
    const days = buildDays('2025-01-06', '2025-01-19', () => 1);

    render(
      <HeatmapGrid
        data={days}
        semesterRange={range}
        milestones={milestones}
      />,
    );

    expect(screen.getByTestId('milestone-marker-2025-01-10')).toBeInTheDocument();
  });

  it('does not render marker on non-milestone cells', () => {
    const milestones: StreakMilestone[] = [
      { days: 30, achievedDate: '2025-01-10' },
    ];
    const days = buildDays('2025-01-06', '2025-01-19', () => 1);

    render(
      <HeatmapGrid
        data={days}
        semesterRange={range}
        milestones={milestones}
      />,
    );

    expect(screen.queryByTestId('milestone-marker-2025-01-06')).not.toBeInTheDocument();
    expect(screen.queryByTestId('milestone-marker-2025-01-09')).not.toBeInTheDocument();
  });

  it('does not render markers when milestones prop is not provided', () => {
    const days = buildDays('2025-01-06', '2025-01-19');

    render(<HeatmapGrid data={days} semesterRange={range} />);

    expect(screen.queryByTestId('milestone-marker-2025-01-10')).not.toBeInTheDocument();
  });

  it('milestone marker has correct ARIA label', () => {
    const milestones: StreakMilestone[] = [
      { days: 60, achievedDate: '2025-01-12' },
    ];
    const days = buildDays('2025-01-06', '2025-01-19', () => 1);

    render(
      <HeatmapGrid
        data={days}
        semesterRange={range}
        milestones={milestones}
      />,
    );

    const marker = screen.getByTestId('milestone-marker-2025-01-12');
    expect(marker).toHaveAttribute('aria-label', '60-Day Streak Milestone');
  });

  it('renders multiple milestone markers', () => {
    const milestones: StreakMilestone[] = [
      { days: 30, achievedDate: '2025-01-08' },
      { days: 60, achievedDate: '2025-01-15' },
    ];
    const days = buildDays('2025-01-06', '2025-01-19', () => 1);

    render(
      <HeatmapGrid
        data={days}
        semesterRange={range}
        milestones={milestones}
      />,
    );

    expect(screen.getByTestId('milestone-marker-2025-01-08')).toBeInTheDocument();
    expect(screen.getByTestId('milestone-marker-2025-01-15')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// HeatmapTooltip — Milestone label
// ---------------------------------------------------------------------------

describe('HeatmapTooltip — Milestone label', () => {
  it('shows milestone label with emoji when milestone is provided', () => {
    render(
      <HeatmapTooltip
        date="2025-01-30"
        habits={[]}
        xpEarned={0}
        streakActive={true}
        milestone={{ days: 30, achievedDate: '2025-01-30' }}
      />,
    );

    expect(screen.getByTestId('tooltip-milestone-label')).toHaveTextContent(
      '30-Day Streak Milestone 🎉',
    );
  });

  it('shows 100-day milestone label', () => {
    render(
      <HeatmapTooltip
        date="2025-04-10"
        habits={[]}
        xpEarned={0}
        streakActive={true}
        milestone={{ days: 100, achievedDate: '2025-04-10' }}
      />,
    );

    expect(screen.getByTestId('tooltip-milestone-label')).toHaveTextContent(
      '100-Day Streak Milestone 🎉',
    );
  });

  it('does not show milestone label when milestone is not provided', () => {
    render(
      <HeatmapTooltip
        date="2025-01-30"
        habits={[]}
        xpEarned={0}
        streakActive={false}
      />,
    );

    expect(screen.queryByTestId('tooltip-milestone-label')).not.toBeInTheDocument();
  });
});
