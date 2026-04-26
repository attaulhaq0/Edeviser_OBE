import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import WeeklyCalendarGrid from '@/components/shared/WeeklyCalendarGrid';
import type { WeekDay } from '@/types/planner';

const makeWeekData = (todayStr: string): WeekDay[] => {
  const days: WeekDay[] = [];
  const start = new Date(todayStr);
  // Go to Monday of the week
  const day = start.getDay();
  const diff = start.getDate() - day + (day === 0 ? -6 : 1);
  start.setDate(diff);

  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const dateStr = d.toISOString().split('T')[0] as string;
    days.push({
      date: dateStr,
      sessions: i === 0 ? [{
        id: 'session-1',
        studentId: 'student-1',
        courseId: 'course-1',
        courseName: 'Math 101',
        title: 'Review Algebra',
        description: null,
        plannedDate: dateStr,
        plannedStartTime: '09:00',
        plannedDurationMinutes: 30,
        actualStartAt: null,
        actualEndAt: null,
        actualDurationMinutes: null,
        timerMode: 'pomodoro' as const,
        status: 'planned' as const,
        satisfactionRating: null,
        cloIds: null,
        createdAt: '2026-01-01T00:00:00Z',
      }] : [],
      tasks: i === 2 ? [{
        id: 'task-1',
        studentId: 'student-1',
        title: 'Read Chapter 5',
        description: null,
        dueDate: dateStr,
        priority: 'high' as const,
        status: 'pending' as const,
        courseId: null,
        completedAt: null,
        createdAt: '2026-01-01T00:00:00Z',
      }] : [],
      deadlines: [],
      isToday: dateStr === todayStr,
    });
  }
  return days;
};

describe('WeeklyCalendarGrid', () => {
  const today = '2026-04-13';

  it('renders 7 day columns on desktop', () => {
    const weekData = makeWeekData(today);
    render(
      <WeeklyCalendarGrid weekData={weekData} today={today} />,
    );
    // Check day labels are present (desktop + mobile both render them)
    expect(screen.getAllByText('Mon').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Tue').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Wed').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Thu').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Fri').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Sat').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Sun').length).toBeGreaterThanOrEqual(1);
  });

  it('renders session cards in the correct day', () => {
    const weekData = makeWeekData(today);
    render(
      <WeeklyCalendarGrid weekData={weekData} today={today} />,
    );
    expect(screen.getAllByText('Review Algebra').length).toBeGreaterThanOrEqual(1);
  });

  it('renders task items in the correct day', () => {
    const weekData = makeWeekData(today);
    render(
      <WeeklyCalendarGrid weekData={weekData} today={today} />,
    );
    expect(screen.getAllByText('Read Chapter 5').length).toBeGreaterThanOrEqual(1);
  });

  it('shows loading shimmer when isLoading is true', () => {
    const weekData = makeWeekData(today);
    const { container } = render(
      <WeeklyCalendarGrid weekData={weekData} today={today} isLoading />,
    );
    const shimmers = container.querySelectorAll('.animate-shimmer');
    expect(shimmers.length).toBeGreaterThan(0);
  });

  it('calls onAddSession when add session button is clicked', () => {
    const weekData = makeWeekData(today);
    const onAddSession = vi.fn();
    render(
      <WeeklyCalendarGrid
        weekData={weekData}
        today={today}
        onAddSession={onAddSession}
      />,
    );
    // Find all "Session" add buttons (desktop + mobile)
    const sessionButtons = screen.getAllByText('Session');
    fireEvent.click(sessionButtons[0]!);
    expect(onAddSession).toHaveBeenCalled();
  });

  it('does not show add buttons in readOnly mode', () => {
    const weekData = makeWeekData(today);
    render(
      <WeeklyCalendarGrid weekData={weekData} today={today} readOnly />,
    );
    const sessionButtons = screen.queryAllByText('Session');
    // In readOnly mode, the "+ Session" buttons should not appear
    // (they only render when !readOnly)
    const addButtons = sessionButtons.filter((el) =>
      el.closest('button')?.textContent?.includes('Session'),
    );
    expect(addButtons.length).toBe(0);
  });
});
