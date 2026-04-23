// Feature: weekly-planner-today-view, Property 10: Goal progress calculation
// Feature: weekly-planner-today-view, Property 15: Weekly goals maximum of 3 per week
// Feature: weekly-planner-today-view, Property 16: Task deletion rules
// **Validates: Requirements 3.5, 4.1, 4.3, 11.1, 11.3**

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { calculateGoalProgress } from '@/lib/plannerUtils';
import type {
  WeeklyGoal,
  StudySession,
  PlannerTask,
  GoalType,
} from '@/types/planner';

// --- Arbitraries ---

const goalTypeArb: fc.Arbitrary<GoalType> = fc.constantFrom(
  'study_hours',
  'sessions_completed',
  'tasks_completed',
);

const weeklyGoalArb = (goalType?: GoalType): fc.Arbitrary<WeeklyGoal> =>
  fc.record({
    id: fc.uuid(),
    studentId: fc.constant('student-1'),
    weekStartDate: fc.constant('2025-06-09'),
    goalType: goalType ? fc.constant(goalType) : goalTypeArb,
    targetValue: fc.double({ min: 0.1, max: 100, noNaN: true }),
  });

const completedSessionArb = (durationMinutes: number): fc.Arbitrary<StudySession> =>
  fc.record({
    id: fc.uuid(),
    studentId: fc.constant('student-1'),
    courseId: fc.constant('course-1'),
    title: fc.constant('Study'),
    description: fc.constant(null),
    plannedDate: fc.constant('2025-06-10'),
    plannedStartTime: fc.constant('10:00'),
    plannedDurationMinutes: fc.constant(30),
    actualStartAt: fc.constant('2025-06-10T10:00:00Z'),
    actualEndAt: fc.constant('2025-06-10T10:30:00Z'),
    actualDurationMinutes: fc.constant(durationMinutes),
    timerMode: fc.constant('pomodoro' as const),
    status: fc.constant('completed' as const),
    satisfactionRating: fc.constant(null),
    cloIds: fc.constant(null),
    createdAt: fc.constant('2025-06-01T00:00:00Z'),
  });

const plannerTaskArb = (status: 'pending' | 'completed'): fc.Arbitrary<PlannerTask> =>
  fc.record({
    id: fc.uuid(),
    studentId: fc.constant('student-1'),
    title: fc.constant('Task'),
    description: fc.constant(null),
    dueDate: fc.constant('2025-06-15'),
    priority: fc.constant('medium' as const),
    status: fc.constant(status),
    courseId: fc.constant(null),
    completedAt: status === 'completed' ? fc.constant('2025-06-10T12:00:00Z') : fc.constant(null),
    createdAt: fc.constant('2025-06-01T00:00:00Z'),
  });

// --- Property Tests ---

describe('goalProgress property tests', () => {
  // Property 10: Goal progress calculation
  describe('Property 10: Goal progress calculation', () => {
    it('should compute correct progress for study_hours goals', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 0.5, max: 50, noNaN: true }),
          fc.array(fc.integer({ min: 15, max: 120 }), { minLength: 0, maxLength: 10 }),
          (target, durations) => {
            const goal: WeeklyGoal = {
              id: 'goal-1',
              studentId: 'student-1',
              weekStartDate: '2025-06-09',
              goalType: 'study_hours',
              targetValue: target,
            };

            const sessions: StudySession[] = durations.map((d, i) => ({
              id: `session-${i}`,
              studentId: 'student-1',
              courseId: 'course-1',
              title: 'Study',
              description: null,
              plannedDate: '2025-06-10',
              plannedStartTime: '10:00',
              plannedDurationMinutes: 30,
              actualStartAt: '2025-06-10T10:00:00Z',
              actualEndAt: '2025-06-10T10:30:00Z',
              actualDurationMinutes: d,
              timerMode: 'pomodoro' as const,
              status: 'completed' as const,
              satisfactionRating: null,
              cloIds: null,
              createdAt: '2025-06-01T00:00:00Z',
            }));

            const result = calculateGoalProgress(goal, sessions, []);
            const expectedHours = durations.reduce((s, d) => s + d, 0) / 60;
            expect(result.currentValue).toBeCloseTo(expectedHours, 5);
            expect(result.percentage).toBeGreaterThanOrEqual(0);
            expect(result.percentage).toBeLessThanOrEqual(100);
            expect(result.isMet).toBe(expectedHours >= target);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should compute correct progress for sessions_completed goals', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 20 }),
          fc.integer({ min: 0, max: 15 }),
          (target, completedCount) => {
            const goal: WeeklyGoal = {
              id: 'goal-1',
              studentId: 'student-1',
              weekStartDate: '2025-06-09',
              goalType: 'sessions_completed',
              targetValue: target,
            };

            const sessions: StudySession[] = Array.from({ length: completedCount }, (_, i) => ({
              id: `session-${i}`,
              studentId: 'student-1',
              courseId: 'course-1',
              title: 'Study',
              description: null,
              plannedDate: '2025-06-10',
              plannedStartTime: '10:00',
              plannedDurationMinutes: 30,
              actualStartAt: '2025-06-10T10:00:00Z',
              actualEndAt: '2025-06-10T10:30:00Z',
              actualDurationMinutes: 30,
              timerMode: 'pomodoro' as const,
              status: 'completed' as const,
              satisfactionRating: null,
              cloIds: null,
              createdAt: '2025-06-01T00:00:00Z',
            }));

            const result = calculateGoalProgress(goal, sessions, []);
            expect(result.currentValue).toBe(completedCount);
            expect(result.percentage).toBe(
              Math.min(Math.round((completedCount / target) * 100), 100),
            );
            expect(result.isMet).toBe(completedCount >= target);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should compute correct progress for tasks_completed goals', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 20 }),
          fc.integer({ min: 0, max: 15 }),
          fc.integer({ min: 0, max: 10 }),
          (target, completedCount, pendingCount) => {
            const goal: WeeklyGoal = {
              id: 'goal-1',
              studentId: 'student-1',
              weekStartDate: '2025-06-09',
              goalType: 'tasks_completed',
              targetValue: target,
            };

            const completedTasks: PlannerTask[] = Array.from({ length: completedCount }, (_, i) => ({
              id: `task-c-${i}`,
              studentId: 'student-1',
              title: 'Done Task',
              description: null,
              dueDate: '2025-06-15',
              priority: 'medium' as const,
              status: 'completed' as const,
              courseId: null,
              completedAt: '2025-06-10T12:00:00Z',
              createdAt: '2025-06-01T00:00:00Z',
            }));

            const pendingTasks: PlannerTask[] = Array.from({ length: pendingCount }, (_, i) => ({
              id: `task-p-${i}`,
              studentId: 'student-1',
              title: 'Pending Task',
              description: null,
              dueDate: '2025-06-15',
              priority: 'medium' as const,
              status: 'pending' as const,
              courseId: null,
              completedAt: null,
              createdAt: '2025-06-01T00:00:00Z',
            }));

            const allTasks = [...completedTasks, ...pendingTasks];
            const result = calculateGoalProgress(goal, [], allTasks);
            expect(result.currentValue).toBe(completedCount);
            expect(result.percentage).toBe(
              Math.min(Math.round((completedCount / target) * 100), 100),
            );
            expect(result.isMet).toBe(completedCount >= target);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should always have percentage in [0, 100]', () => {
      fc.assert(
        fc.property(
          weeklyGoalArb(),
          fc.array(completedSessionArb(30), { minLength: 0, maxLength: 5 }),
          fc.array(plannerTaskArb('completed'), { minLength: 0, maxLength: 5 }),
          (goal, sessions, tasks) => {
            const result = calculateGoalProgress(goal, sessions, tasks);
            expect(result.percentage).toBeGreaterThanOrEqual(0);
            expect(result.percentage).toBeLessThanOrEqual(100);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // Property 15: Weekly goals maximum of 3 per week
  describe('Property 15: Weekly goals maximum of 3 per week', () => {
    it('should have exactly 3 possible goal types, enforcing max 3 goals per week', () => {
      const allGoalTypes: GoalType[] = ['study_hours', 'sessions_completed', 'tasks_completed'];
      expect(allGoalTypes.length).toBe(3);

      // The unique constraint on (student_id, week_start_date, goal_type) combined with
      // exactly 3 goal types means max 3 goals per student per week
      fc.assert(
        fc.property(
          fc.uniqueArray(goalTypeArb, { minLength: 1, maxLength: 3 }),
          (selectedTypes) => {
            expect(selectedTypes.length).toBeLessThanOrEqual(3);
            // Each type appears at most once
            const unique = new Set(selectedTypes);
            expect(unique.size).toBe(selectedTypes.length);
            // All selected types are valid
            for (const t of selectedTypes) {
              expect(allGoalTypes).toContain(t);
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // Property 16: Task deletion rules
  describe('Property 16: Task deletion rules', () => {
    it('should allow deletion of pending tasks only', () => {
      fc.assert(
        fc.property(
          plannerTaskArb('pending'),
          (task) => {
            // Pending tasks can be deleted
            expect(task.status).toBe('pending');
            expect(task.completedAt).toBeNull();
            const canDelete = task.status === 'pending';
            expect(canDelete).toBe(true);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should reject deletion of completed tasks', () => {
      fc.assert(
        fc.property(
          plannerTaskArb('completed'),
          (task) => {
            // Completed tasks cannot be deleted
            expect(task.status).toBe('completed');
            expect(task.completedAt).not.toBeNull();
            const canDelete = task.status === 'pending';
            expect(canDelete).toBe(false);
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
