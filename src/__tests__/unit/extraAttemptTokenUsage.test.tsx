// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import ExtraAttemptTokenUsage from '@/components/shared/ExtraAttemptTokenUsage';
import type { ExtraAttemptTokenUsageRow } from '@/hooks/useExtraAttemptTokenUsage';

// ── Mocks ────────────────────────────────────────────────────────────────────

let mockData: ExtraAttemptTokenUsageRow[] | undefined;
let mockIsLoading = false;

vi.mock('@/hooks/useExtraAttemptTokenUsage', () => ({
  useExtraAttemptTokenUsage: () => ({
    data: mockData,
    isLoading: mockIsLoading,
  }),
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

const makeRow = (overrides: Partial<ExtraAttemptTokenUsageRow> = {}): ExtraAttemptTokenUsageRow => ({
  id: 'purchase-001',
  student_id: 'student-001',
  student_name: 'Alice Johnson',
  consumed_at: '2026-08-15T10:30:00Z',
  xp_cost: 150,
  quiz_id: 'quiz-abc12345-def6-7890',
  ...overrides,
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe('ExtraAttemptTokenUsage', () => {
  beforeEach(() => {
    mockData = undefined;
    mockIsLoading = false;
  });

  it('renders nothing when there are no token usages', () => {
    mockData = [];
    const { container } = render(<ExtraAttemptTokenUsage courseId="course-1" />);
    expect(container.firstElementChild).toBeNull();
  });

  it('renders nothing when data is undefined', () => {
    mockData = undefined;
    const { container } = render(<ExtraAttemptTokenUsage courseId="course-1" />);
    expect(container.firstElementChild).toBeNull();
  });

  it('shows shimmer loading state', () => {
    mockIsLoading = true;
    const { container } = render(<ExtraAttemptTokenUsage courseId="course-1" />);
    const shimmer = container.querySelector('.animate-shimmer');
    expect(shimmer).toBeInTheDocument();
  });

  it('renders section header with total count badge', () => {
    mockData = [makeRow(), makeRow({ id: 'purchase-002', student_name: 'Bob Smith' })];
    render(<ExtraAttemptTokenUsage courseId="course-1" />);

    expect(screen.getByText('Extra Attempt Token Usage')).toBeInTheDocument();
    expect(screen.getByText('2 used')).toBeInTheDocument();
  });

  it('displays student name and formatted date', () => {
    mockData = [makeRow({ student_name: 'Alice Johnson', consumed_at: '2026-08-15T10:30:00Z' })];
    render(<ExtraAttemptTokenUsage courseId="course-1" />);

    expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    // date-fns format: "Aug 15, 2026 10:30 AM" (or similar depending on locale)
    expect(screen.getByText(/Aug 15, 2026/)).toBeInTheDocument();
  });

  it('displays XP cost badge for each row', () => {
    mockData = [makeRow({ xp_cost: 150 })];
    render(<ExtraAttemptTokenUsage courseId="course-1" />);

    expect(screen.getByText('150 XP')).toBeInTheDocument();
  });

  it('groups rows by quiz ID and shows student count per quiz', () => {
    const quizA = 'quiz-aaaa1111-bbbb-2222';
    const quizB = 'quiz-cccc3333-dddd-4444';
    mockData = [
      makeRow({ id: 'p1', quiz_id: quizA, student_name: 'Alice' }),
      makeRow({ id: 'p2', quiz_id: quizA, student_name: 'Bob' }),
      makeRow({ id: 'p3', quiz_id: quizB, student_name: 'Charlie' }),
    ];
    render(<ExtraAttemptTokenUsage courseId="course-1" />);

    expect(screen.getByText('2 students')).toBeInTheDocument();
    expect(screen.getByText('1 student')).toBeInTheDocument();
  });

  it('handles unknown date gracefully', () => {
    mockData = [makeRow({ consumed_at: '' })];
    render(<ExtraAttemptTokenUsage courseId="course-1" />);

    expect(screen.getByText('Unknown date')).toBeInTheDocument();
  });
});
