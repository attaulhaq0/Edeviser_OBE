import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ProgressSummaryPanel from '@/components/shared/ProgressSummaryPanel';
import type { WeeklyProgressData, GoalProgress, WeeklyGoal } from '@/types/planner';

const makeSummary = (overrides: Partial<WeeklyProgressData> = {}): WeeklyProgressData => ({
  totalStudyMinutes: 180,
  sessionsCompleted: 5,
  tasksCompleted: 8,
  courseBreakdown: [],
  cloBreakdown: [],
  ...overrides,
});

const makeGoal = (overrides: Partial<WeeklyGoal> = {}): WeeklyGoal => ({
  id: 'g1',
  studentId: 's1',
  weekStartDate: '2026-04-13',
  goalType: 'study_hours',
  targetValue: 5,
  ...overrides,
});

const makeGoalProgress = (overrides: Partial<GoalProgress> = {}): GoalProgress => ({
  goal: makeGoal(),
  currentValue: 3,
  percentage: 60,
  isMet: false,
  ...overrides,
});

describe('ProgressSummaryPanel', () => {
  it('renders KPI cards with correct values', () => {
    render(<ProgressSummaryPanel summary={makeSummary()} goals={[]} />);
    expect(screen.getByText('3h')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
  });

  it('renders study time in hours and minutes', () => {
    render(<ProgressSummaryPanel summary={makeSummary({ totalStudyMinutes: 95 })} goals={[]} />);
    expect(screen.getByText('1h 35m')).toBeInTheDocument();
  });

  it('renders minutes only when less than 60', () => {
    render(<ProgressSummaryPanel summary={makeSummary({ totalStudyMinutes: 45 })} goals={[]} />);
    expect(screen.getByText('45m')).toBeInTheDocument();
  });

  it('renders goal progress bars', () => {
    const goals = [
      makeGoalProgress({ goal: makeGoal({ goalType: 'study_hours' }), percentage: 60, isMet: false }),
      makeGoalProgress({ goal: makeGoal({ id: 'g2', goalType: 'tasks_completed', targetValue: 3 }), currentValue: 3, percentage: 100, isMet: true }),
    ];
    render(<ProgressSummaryPanel summary={makeSummary()} goals={goals} />);
    expect(screen.getByText('Study Hours')).toBeInTheDocument();
    expect(screen.getByText('Tasks')).toBeInTheDocument();
    expect(screen.getByText('✓ Met')).toBeInTheDocument();
  });

  it('does not render goal section when no goals', () => {
    render(<ProgressSummaryPanel summary={makeSummary()} goals={[]} />);
    expect(screen.queryByText('Goal Progress')).not.toBeInTheDocument();
  });
});
