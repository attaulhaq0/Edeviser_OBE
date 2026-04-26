import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PomodoroIndicator from '@/components/shared/PomodoroIndicator';
import type { PomodoroIntervalType } from '@/types/planner';

// ---------------------------------------------------------------------------
// Helper: default props factory
// ---------------------------------------------------------------------------

interface PomodoroIndicatorTestProps {
  currentInterval: number;
  totalIntervals: number;
  intervalType: PomodoroIntervalType;
}

const makeProps = (overrides: Partial<PomodoroIndicatorTestProps> = {}): PomodoroIndicatorTestProps => ({
  currentInterval: 2,
  totalIntervals: 4,
  intervalType: 'work',
  ...overrides,
});

// ---------------------------------------------------------------------------
// Tests — PomodoroIndicator component
// ---------------------------------------------------------------------------

describe('PomodoroIndicator', () => {
  it('renders current interval number and type', () => {
    render(<PomodoroIndicator {...makeProps({ currentInterval: 2, totalIntervals: 4, intervalType: 'work' })} />);
    expect(screen.getByText('Work 2 of 4')).toBeDefined();
  });

  it('shows correct label for work interval', () => {
    render(<PomodoroIndicator {...makeProps({ intervalType: 'work' })} />);
    expect(screen.getByText('Work 2 of 4')).toBeDefined();
  });

  it('shows correct label for break interval', () => {
    render(<PomodoroIndicator {...makeProps({ intervalType: 'break' })} />);
    expect(screen.getByText('Break 2 of 4')).toBeDefined();
  });

  it('shows correct label for long_break interval', () => {
    render(<PomodoroIndicator {...makeProps({ intervalType: 'long_break' })} />);
    expect(screen.getByText('Long Break 2 of 4')).toBeDefined();
  });

  it('renders progress dots matching totalIntervals count', () => {
    const { container } = render(
      <PomodoroIndicator {...makeProps({ currentInterval: 1, totalIntervals: 4 })} />,
    );
    const dots = container.querySelectorAll('.rounded-full');
    expect(dots.length).toBe(4);
  });

  it('highlights completed intervals with the active color', () => {
    const { container } = render(
      <PomodoroIndicator {...makeProps({ currentInterval: 3, totalIntervals: 4, intervalType: 'work' })} />,
    );
    const dots = container.querySelectorAll('.rounded-full');
    // First 3 dots should have the active color (bg-blue-500 for work)
    const activeDots = Array.from(dots).filter((dot) => dot.classList.contains('bg-blue-500'));
    const inactiveDots = Array.from(dots).filter((dot) => dot.classList.contains('bg-gray-200'));
    expect(activeDots.length).toBe(3);
    expect(inactiveDots.length).toBe(1);
  });

  it('highlights completed intervals with green for break type', () => {
    const { container } = render(
      <PomodoroIndicator {...makeProps({ currentInterval: 2, totalIntervals: 4, intervalType: 'break' })} />,
    );
    const dots = container.querySelectorAll('.rounded-full');
    const activeDots = Array.from(dots).filter((dot) => dot.classList.contains('bg-green-500'));
    const inactiveDots = Array.from(dots).filter((dot) => dot.classList.contains('bg-gray-200'));
    expect(activeDots.length).toBe(2);
    expect(inactiveDots.length).toBe(2);
  });

  it('highlights completed intervals with teal for long_break type', () => {
    const { container } = render(
      <PomodoroIndicator {...makeProps({ currentInterval: 4, totalIntervals: 4, intervalType: 'long_break' })} />,
    );
    const dots = container.querySelectorAll('.rounded-full');
    const activeDots = Array.from(dots).filter((dot) => dot.classList.contains('bg-teal-500'));
    const inactiveDots = Array.from(dots).filter((dot) => dot.classList.contains('bg-gray-200'));
    expect(activeDots.length).toBe(4);
    expect(inactiveDots.length).toBe(0);
  });

  it('shows no highlighted dots when currentInterval is 0', () => {
    const { container } = render(
      <PomodoroIndicator {...makeProps({ currentInterval: 0, totalIntervals: 4, intervalType: 'work' })} />,
    );
    const dots = container.querySelectorAll('.rounded-full');
    const activeDots = Array.from(dots).filter((dot) => dot.classList.contains('bg-blue-500'));
    const inactiveDots = Array.from(dots).filter((dot) => dot.classList.contains('bg-gray-200'));
    expect(activeDots.length).toBe(0);
    expect(inactiveDots.length).toBe(4);
  });
});
