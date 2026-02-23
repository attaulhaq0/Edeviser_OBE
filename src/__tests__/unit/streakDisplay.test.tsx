import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import StreakDisplay from '@/components/shared/StreakDisplay';
import {
  getNextMilestone,
  getMilestoneProgress,
} from '@/lib/streakMilestones';

// ---------------------------------------------------------------------------
// Pure function tests
// ---------------------------------------------------------------------------
describe('getNextMilestone', () => {
  it('returns 7 for a streak of 0', () => {
    expect(getNextMilestone(0)).toBe(7);
  });

  it('returns 7 for a streak of 5', () => {
    expect(getNextMilestone(5)).toBe(7);
  });

  it('returns 14 when streak equals 7', () => {
    expect(getNextMilestone(7)).toBe(14);
  });

  it('returns 100 for a streak of 61', () => {
    expect(getNextMilestone(61)).toBe(100);
  });

  it('returns null when all milestones are passed', () => {
    expect(getNextMilestone(100)).toBeNull();
    expect(getNextMilestone(150)).toBeNull();
  });
});

describe('getMilestoneProgress', () => {
  it('returns 0 for streak of 0', () => {
    expect(getMilestoneProgress(0)).toBe(0);
  });

  it('returns 100 when all milestones passed', () => {
    expect(getMilestoneProgress(100)).toBe(100);
    expect(getMilestoneProgress(200)).toBe(100);
  });

  it('calculates progress within first milestone range (0-7)', () => {
    // 3 out of 7 = ~43%
    expect(getMilestoneProgress(3)).toBe(43);
  });

  it('calculates progress within second milestone range (7-14)', () => {
    // 10 is 3 out of 7 into the 7-14 range = ~43%
    expect(getMilestoneProgress(10)).toBe(43);
  });

  it('calculates progress within 30-60 range', () => {
    // 45 is 15 out of 30 into the 30-60 range = 50%
    expect(getMilestoneProgress(45)).toBe(50);
  });
});

// ---------------------------------------------------------------------------
// Component rendering tests
// ---------------------------------------------------------------------------
describe('StreakDisplay', () => {
  it('renders streak count in full mode', () => {
    render(<StreakDisplay streakCount={12} />);

    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('day streak')).toBeInTheDocument();
  });

  it('renders compact mode with just count', () => {
    render(<StreakDisplay streakCount={5} compact />);

    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.queryByText('day streak')).not.toBeInTheDocument();
    expect(screen.getByLabelText('5 day streak')).toBeInTheDocument();
  });

  it('shows milestone progress bar in full mode', () => {
    render(<StreakDisplay streakCount={5} />);

    expect(screen.getByText('Next milestone: 7 days')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('shows "All milestones reached" when past all milestones', () => {
    render(<StreakDisplay streakCount={100} />);

    expect(screen.getByText('All milestones reached!')).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('renders streak freeze indicators when available', () => {
    render(<StreakDisplay streakCount={10} streakFreezesAvailable={2} />);

    expect(
      screen.getByLabelText('2 streak freezes available'),
    ).toBeInTheDocument();
  });

  it('does not render freeze indicators when none available', () => {
    render(<StreakDisplay streakCount={10} streakFreezesAvailable={0} />);

    expect(screen.queryByLabelText(/streak freeze/)).not.toBeInTheDocument();
  });

  it('caps freeze indicators at 2', () => {
    const { container } = render(
      <StreakDisplay streakCount={10} streakFreezesAvailable={5} />,
    );

    // Should only render 2 snowflake icons even though 5 are available
    const snowflakes = container.querySelectorAll('.text-blue-400');
    expect(snowflakes).toHaveLength(2);
  });
});
