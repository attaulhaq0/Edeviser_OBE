import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import StudySessionCard from '@/components/shared/StudySessionCard';
import type { StudySession } from '@/types/planner';

const makeSession = (overrides: Partial<StudySession> = {}): StudySession => ({
  id: 'session-1',
  studentId: 'student-1',
  courseId: 'course-1',
  courseName: 'Math 101',
  title: 'Review Algebra',
  description: null,
  plannedDate: '2026-04-13',
  plannedStartTime: '09:00',
  plannedDurationMinutes: 30,
  actualStartAt: null,
  actualEndAt: null,
  actualDurationMinutes: null,
  timerMode: 'pomodoro',
  status: 'planned',
  satisfactionRating: null,
  cloIds: null,
  createdAt: '2026-01-01T00:00:00Z',
  ...overrides,
});

describe('StudySessionCard', () => {
  it('renders session title and course name', () => {
    render(<StudySessionCard session={makeSession()} />);
    expect(screen.getByText('Review Algebra')).toBeDefined();
    expect(screen.getByText('Math 101')).toBeDefined();
  });

  it('renders time and duration', () => {
    render(<StudySessionCard session={makeSession()} />);
    expect(screen.getByText('09:00 · 30 min')).toBeDefined();
  });

  it('renders status badge', () => {
    render(<StudySessionCard session={makeSession()} />);
    expect(screen.getByText('Planned')).toBeDefined();
  });

  it('shows Start button for planned sessions', () => {
    const onStart = vi.fn();
    render(<StudySessionCard session={makeSession()} onStart={onStart} />);
    const startBtn = screen.getByText('Start');
    expect(startBtn).toBeDefined();
    fireEvent.click(startBtn);
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it('shows Edit button for planned sessions', () => {
    const onEdit = vi.fn();
    render(<StudySessionCard session={makeSession()} onEdit={onEdit} />);
    const editBtn = screen.getByText('Edit');
    expect(editBtn).toBeDefined();
    fireEvent.click(editBtn);
    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it('does not show Start/Edit for completed sessions', () => {
    render(<StudySessionCard session={makeSession({ status: 'completed' })} />);
    expect(screen.queryByText('Start')).toBeNull();
    expect(screen.queryByText('Edit')).toBeNull();
  });

  it('does not show Start/Edit in readOnly mode', () => {
    render(<StudySessionCard session={makeSession()} readOnly />);
    expect(screen.queryByText('Start')).toBeNull();
    expect(screen.queryByText('Edit')).toBeNull();
  });

  it('renders Completed badge for completed sessions', () => {
    render(<StudySessionCard session={makeSession({ status: 'completed' })} />);
    expect(screen.getByText('Completed')).toBeDefined();
  });

  it('renders In Progress badge for in_progress sessions', () => {
    render(<StudySessionCard session={makeSession({ status: 'in_progress' })} />);
    expect(screen.getByText('In Progress')).toBeDefined();
  });
});
