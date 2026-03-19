import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import HeatmapGrid from '@/components/shared/HeatmapGrid';
import HeatmapTooltip from '@/components/shared/HeatmapTooltip';
import HeatmapSummaryStats from '@/components/shared/HeatmapSummaryStats';
import type { HeatmapDay, DateRange } from '@/types/habits';

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
// Tests
// ---------------------------------------------------------------------------

describe('Sabbatical Rest Day Overlay', () => {
  // 2025-01-06 is Monday, 2025-01-11 is Saturday, 2025-01-12 is Sunday
  const range: DateRange = { start: '2025-01-06', end: '2025-01-19' };

  it('renders diagonal stripe overlay on Saturday and Sunday when sabbatical is enabled', () => {
    const days = buildDays('2025-01-06', '2025-01-19');

    render(
      <HeatmapGrid
        data={days}
        semesterRange={range}
        sabbaticalEnabled={true}
      />,
    );

    // Saturday Jan 11 and Sunday Jan 12 should have sabbatical overlay
    expect(screen.getByTestId('sabbatical-overlay-2025-01-11')).toBeInTheDocument();
    expect(screen.getByTestId('sabbatical-overlay-2025-01-12')).toBeInTheDocument();

    // Saturday Jan 18 and Sunday Jan 19 should also have overlay
    expect(screen.getByTestId('sabbatical-overlay-2025-01-18')).toBeInTheDocument();
    expect(screen.getByTestId('sabbatical-overlay-2025-01-19')).toBeInTheDocument();

    // Weekday should NOT have overlay
    expect(screen.queryByTestId('sabbatical-overlay-2025-01-06')).not.toBeInTheDocument();
    expect(screen.queryByTestId('sabbatical-overlay-2025-01-07')).not.toBeInTheDocument();
  });

  it('does not render sabbatical overlay when sabbaticalEnabled is false', () => {
    const days = buildDays('2025-01-06', '2025-01-19');

    render(
      <HeatmapGrid
        data={days}
        semesterRange={range}
        sabbaticalEnabled={false}
      />,
    );

    expect(screen.queryByTestId('sabbatical-overlay-2025-01-11')).not.toBeInTheDocument();
    expect(screen.queryByTestId('sabbatical-overlay-2025-01-12')).not.toBeInTheDocument();
  });

  it('does not render sabbatical overlay when prop is not provided', () => {
    const days = buildDays('2025-01-06', '2025-01-19');

    render(<HeatmapGrid data={days} semesterRange={range} />);

    expect(screen.queryByTestId('sabbatical-overlay-2025-01-11')).not.toBeInTheDocument();
  });

  it('sabbatical overlay has correct ARIA label', () => {
    const days = buildDays('2025-01-06', '2025-01-19');

    render(
      <HeatmapGrid
        data={days}
        semesterRange={range}
        sabbaticalEnabled={true}
      />,
    );

    const overlay = screen.getByTestId('sabbatical-overlay-2025-01-11');
    expect(overlay).toHaveAttribute('aria-label', 'Rest Day (Sabbatical)');
  });
});

describe('HeatmapTooltip — Sabbatical Rest Day label', () => {
  it('shows "Rest Day (Sabbatical)" label when isSabbaticalRestDay is true', () => {
    render(
      <HeatmapTooltip
        date="2025-01-11"
        habits={[]}
        xpEarned={0}
        streakActive={false}
        isSabbaticalRestDay={true}
      />,
    );

    expect(screen.getByTestId('tooltip-sabbatical-label')).toHaveTextContent('Rest Day (Sabbatical)');
  });

  it('does not show "No habits completed" when sabbatical rest day with no habits', () => {
    render(
      <HeatmapTooltip
        date="2025-01-11"
        habits={[]}
        xpEarned={0}
        streakActive={false}
        isSabbaticalRestDay={true}
      />,
    );

    expect(screen.queryByTestId('tooltip-empty')).not.toBeInTheDocument();
  });

  it('does not show sabbatical label when isSabbaticalRestDay is false', () => {
    render(
      <HeatmapTooltip
        date="2025-01-11"
        habits={[]}
        xpEarned={0}
        streakActive={false}
        isSabbaticalRestDay={false}
      />,
    );

    expect(screen.queryByTestId('tooltip-sabbatical-label')).not.toBeInTheDocument();
  });
});

describe('HeatmapSummaryStats — Sabbatical day exclusion', () => {
  it('shows "Active Days (excl. rest)" label when sabbaticalDayCount > 0', () => {
    render(
      <HeatmapSummaryStats
        currentStreak={5}
        longestStreak={10}
        totalActiveDays={20}
        sabbaticalDayCount={8}
      />,
    );

    const card = screen.getByTestId('kpi-total-active-days');
    expect(card).toHaveTextContent('Active Days (excl. rest)');
  });

  it('shows "Total Active Days" label when sabbaticalDayCount is 0', () => {
    render(
      <HeatmapSummaryStats
        currentStreak={5}
        longestStreak={10}
        totalActiveDays={20}
        sabbaticalDayCount={0}
      />,
    );

    const card = screen.getByTestId('kpi-total-active-days');
    expect(card).toHaveTextContent('Total Active Days');
  });

  it('shows "Total Active Days" label when sabbaticalDayCount is not provided', () => {
    render(
      <HeatmapSummaryStats
        currentStreak={5}
        longestStreak={10}
        totalActiveDays={20}
      />,
    );

    const card = screen.getByTestId('kpi-total-active-days');
    expect(card).toHaveTextContent('Total Active Days');
  });

  it('displays the correct totalActiveDays value', () => {
    render(
      <HeatmapSummaryStats
        currentStreak={5}
        longestStreak={10}
        totalActiveDays={42}
        sabbaticalDayCount={8}
      />,
    );

    expect(screen.getByTestId('kpi-total-active-days-value')).toHaveTextContent('42');
  });
});
