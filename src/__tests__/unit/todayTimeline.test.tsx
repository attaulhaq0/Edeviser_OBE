import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import TodayTimeline from '@/components/shared/TodayTimeline';
import type { TimelineItem, HabitStatus, StudySession, PlannerTask, UpcomingDeadline } from '@/types/planner';

const makeSession = (overrides: Partial<StudySession> = {}): StudySession => ({
  id: 'session-1',
  studentId: 'student-1',
  courseId: 'course-1',
  courseName: 'Math 101',
  title: 'Morning Study',
  description: null,
  plannedDate: '2026-04-15',
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

const makeTask = (overrides: Partial<PlannerTask> = {}): PlannerTask => ({
  id: 'task-1',
  studentId: 'student-1',
  title: 'Read Chapter 5',
  description: null,
  dueDate: '2026-04-15',
  priority: 'high',
  status: 'pending',
  courseId: null,
  completedAt: null,
  createdAt: '2026-01-01T00:00:00Z',
  ...overrides,
});

const makeDeadline = (): UpcomingDeadline => ({
  id: 'deadline-1',
  title: 'Assignment Due',
  courseName: 'Physics 201',
  dueDate: '2026-04-15T14:00:00Z',
  urgency: 'red',
});

const defaultHabits: HabitStatus = {
  login: true,
  submit: false,
  journal: false,
  read: false,
};

describe('TodayTimeline', () => {
  it('renders habit status indicators', () => {
    render(
      <TodayTimeline items={[]} habits={defaultHabits} />,
    );
    expect(screen.getByText('Login')).toBeDefined();
    expect(screen.getByText('Submit')).toBeDefined();
    expect(screen.getByText('Journal')).toBeDefined();
    expect(screen.getByText('Read')).toBeDefined();
  });

  it('shows empty state when no items', () => {
    render(
      <TodayTimeline items={[]} habits={defaultHabits} />,
    );
    expect(screen.getByText('Nothing scheduled for today')).toBeDefined();
  });

  it('renders morning section for morning sessions', () => {
    const items: TimelineItem[] = [
      {
        id: 'session-1',
        type: 'session',
        time: '09:00',
        timeOfDay: 'morning',
        data: makeSession(),
      },
    ];
    render(
      <TodayTimeline items={items} habits={defaultHabits} />,
    );
    expect(screen.getByText('Morning')).toBeDefined();
    expect(screen.getByText('Morning Study')).toBeDefined();
  });

  it('renders afternoon section for afternoon deadlines', () => {
    const items: TimelineItem[] = [
      {
        id: 'deadline-1',
        type: 'deadline',
        time: '14:00',
        timeOfDay: 'afternoon',
        data: makeDeadline(),
      },
    ];
    render(
      <TodayTimeline items={items} habits={defaultHabits} />,
    );
    expect(screen.getByText('Afternoon')).toBeDefined();
    expect(screen.getByText('Assignment Due')).toBeDefined();
  });

  it('renders tasks in the To Do section', () => {
    const items: TimelineItem[] = [
      {
        id: 'task-1',
        type: 'task',
        time: null,
        timeOfDay: null,
        data: makeTask(),
      },
    ];
    render(
      <TodayTimeline items={items} habits={defaultHabits} />,
    );
    expect(screen.getByText('To Do')).toBeDefined();
    expect(screen.getByText('Read Chapter 5')).toBeDefined();
  });

  it('renders multiple sections when items span different times', () => {
    const items: TimelineItem[] = [
      {
        id: 'session-1',
        type: 'session',
        time: '09:00',
        timeOfDay: 'morning',
        data: makeSession(),
      },
      {
        id: 'task-1',
        type: 'task',
        time: null,
        timeOfDay: null,
        data: makeTask(),
      },
    ];
    render(
      <TodayTimeline items={items} habits={defaultHabits} />,
    );
    expect(screen.getByText('Morning')).toBeDefined();
    expect(screen.getByText('To Do')).toBeDefined();
  });
});
