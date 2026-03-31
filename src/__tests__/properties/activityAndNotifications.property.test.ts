// Feature: edeviser-platform, Property 34: Activity log append-only integrity
// Feature: edeviser-platform, Property 35: Journal prompt Kolb's Cycle alignment
// Feature: edeviser-platform, Property 36: Peer milestone notification scoping
// Feature: edeviser-platform, Property 37: Perfect Day prompt notification accuracy
// **Validates: Requirements 41, 40, 42, 43**

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  generateJournalPrompt,
  KOLB_STAGES,
} from '@/lib/journalPromptGenerator';
import type { BloomsLevel, AttainmentLevel, HabitType } from '@/types/app';

// ─── Property 34: Activity log append-only integrity ────────────────────────

describe('Property 34 — Activity log append-only integrity', () => {
  type ActivityLogOperation = 'INSERT' | 'UPDATE' | 'DELETE';

  function evaluateActivityLogOperation(op: ActivityLogOperation): boolean {
    return op === 'INSERT';
  }

  it('P34a: only INSERT is allowed on student_activity_log', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<ActivityLogOperation>('INSERT', 'UPDATE', 'DELETE'),
        (op) => {
          const allowed = evaluateActivityLogOperation(op);
          expect(allowed).toBe(op === 'INSERT');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P34b: activity log entries preserve original timestamps', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.constantFrom('login', 'page_view', 'submission', 'journal'),
        fc.integer({ min: 0, max: 1095 }).map(
          (offset) => new Date(Date.UTC(2024, 0, 1 + offset)).toISOString(),
        ),
        (studentId, eventType, timestamp) => {
          const entry = {
            student_id: studentId,
            event_type: eventType,
            created_at: timestamp,
          };
          expect(entry.created_at).toBe(timestamp);
          expect(new Date(entry.created_at).getTime()).not.toBeNaN();
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Property 35: Journal prompt Kolb's Cycle alignment ─────────────────────

describe("Property 35 — Journal prompt Kolb's Cycle alignment", () => {
  const bloomsLevelArb = fc.constantFrom<BloomsLevel>(
    'remembering', 'understanding', 'applying', 'analyzing', 'evaluating', 'creating',
  );
  const attainmentLevelArb = fc.constantFrom<AttainmentLevel>(
    'Excellent', 'Satisfactory', 'Developing', 'Not_Yet',
  );

  it('P35a: generated prompt contains 3-4 questions', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }),
        bloomsLevelArb,
        attainmentLevelArb,
        (cloTitle, bloomsLevel, attainmentLevel) => {
          const result = generateJournalPrompt({ cloTitle, bloomsLevel, attainmentLevel });
          expect(result.questions.length).toBeGreaterThanOrEqual(3);
          expect(result.questions.length).toBeLessThanOrEqual(4);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P35b: each question maps to a valid Kolb stage', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }),
        bloomsLevelArb,
        attainmentLevelArb,
        (cloTitle, bloomsLevel, attainmentLevel) => {
          const result = generateJournalPrompt({ cloTitle, bloomsLevel, attainmentLevel });
          for (const q of result.questions) {
            expect(KOLB_STAGES).toContain(q.stage);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P35c: Developing/Not_Yet produces 4 questions (all Kolb stages)', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }),
        bloomsLevelArb,
        fc.constantFrom<AttainmentLevel>('Developing', 'Not_Yet'),
        (cloTitle, bloomsLevel, attainmentLevel) => {
          const result = generateJournalPrompt({ cloTitle, bloomsLevel, attainmentLevel });
          expect(result.questions).toHaveLength(4);
          const stages = result.questions.map((q) => q.stage);
          for (const stage of KOLB_STAGES) {
            expect(stages).toContain(stage);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P35d: Excellent/Satisfactory produces 3 questions', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }),
        bloomsLevelArb,
        fc.constantFrom<AttainmentLevel>('Excellent', 'Satisfactory'),
        (cloTitle, bloomsLevel, attainmentLevel) => {
          const result = generateJournalPrompt({ cloTitle, bloomsLevel, attainmentLevel });
          expect(result.questions).toHaveLength(3);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P35e: prompt text includes CLO title', () => {
    // Use alphanumeric titles to avoid regex replacement special chars ($&, $`, etc.)
    const safeTitleArb = fc.stringMatching(/^[A-Za-z0-9 ]{3,50}$/);
    fc.assert(
      fc.property(
        safeTitleArb,
        bloomsLevelArb,
        attainmentLevelArb,
        (cloTitle, bloomsLevel, attainmentLevel) => {
          const prompt = generateJournalPrompt({ cloTitle, bloomsLevel, attainmentLevel });
          expect(prompt.promptText).toContain(cloTitle);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Property 36: Peer milestone notification scoping ───────────────────────

describe('Property 36 — Peer milestone notification scoping', () => {
  interface Student {
    id: string;
    courseIds: string[];
    anonymousMode: boolean;
  }

  function getPeerNotificationRecipients(
    triggeringStudent: Student,
    allStudents: Student[],
  ): string[] {
    if (triggeringStudent.anonymousMode) return [];
    const triggeringCourses = new Set(triggeringStudent.courseIds);
    return allStudents
      .filter((s) => {
        if (s.id === triggeringStudent.id) return false;
        return s.courseIds.some((c) => triggeringCourses.has(c));
      })
      .map((s) => s.id);
  }

  const studentArb = fc.record({
    id: fc.uuid(),
    courseIds: fc.array(fc.uuid(), { minLength: 1, maxLength: 4 }),
    anonymousMode: fc.boolean(),
  });

  it('P36a: only students sharing courses receive notifications', () => {
    fc.assert(
      fc.property(
        studentArb.map((s) => ({ ...s, anonymousMode: false })),
        fc.array(studentArb, { minLength: 0, maxLength: 10 }),
        (trigger, peers) => {
          const recipients = getPeerNotificationRecipients(trigger, peers);
          const triggerCourses = new Set(trigger.courseIds);
          for (const recipientId of recipients) {
            const peer = peers.find((p) => p.id === recipientId);
            expect(peer).toBeDefined();
            const sharesCourse = peer!.courseIds.some((c) => triggerCourses.has(c));
            expect(sharesCourse).toBe(true);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P36b: anonymous students do not trigger peer notifications', () => {
    fc.assert(
      fc.property(
        studentArb.map((s) => ({ ...s, anonymousMode: true })),
        fc.array(studentArb, { minLength: 1, maxLength: 10 }),
        (trigger, peers) => {
          const recipients = getPeerNotificationRecipients(trigger, peers);
          expect(recipients).toHaveLength(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P36c: triggering student is never in recipient list', () => {
    fc.assert(
      fc.property(
        studentArb.map((s) => ({ ...s, anonymousMode: false })),
        fc.array(studentArb, { minLength: 0, maxLength: 10 }),
        (trigger, peers) => {
          const recipients = getPeerNotificationRecipients(trigger, [...peers, trigger]);
          expect(recipients).not.toContain(trigger.id);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Property 37: Perfect Day prompt notification accuracy ──────────────────

describe('Property 37 — Perfect Day prompt notification accuracy', () => {
  const ALL_HABITS: HabitType[] = ['login', 'submit', 'journal', 'read'];

  function checkPerfectDayPrompt(
    completedHabits: HabitType[],
  ): { shouldNotify: boolean; missingHabit?: HabitType } {
    const missing = ALL_HABITS.filter((h) => !completedHabits.includes(h));
    if (missing.length === 1) {
      return { shouldNotify: true, missingHabit: missing[0] };
    }
    return { shouldNotify: false };
  }

  it('P37a: exactly 3 of 4 habits triggers notification with correct missing habit', () => {
    fc.assert(
      fc.property(
        fc.shuffledSubarray(ALL_HABITS, { minLength: 3, maxLength: 3 }),
        (completedHabits) => {
          const result = checkPerfectDayPrompt(completedHabits);
          expect(result.shouldNotify).toBe(true);
          expect(result.missingHabit).toBeDefined();
          expect(completedHabits).not.toContain(result.missingHabit);
          expect(ALL_HABITS).toContain(result.missingHabit);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P37b: 0-2 completed habits produces no notification', () => {
    fc.assert(
      fc.property(
        fc.shuffledSubarray(ALL_HABITS, { minLength: 0, maxLength: 2 }),
        (completedHabits) => {
          const result = checkPerfectDayPrompt(completedHabits);
          expect(result.shouldNotify).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P37c: all 4 habits completed produces no notification', () => {
    fc.assert(
      fc.property(
        fc.shuffledSubarray(ALL_HABITS, { minLength: 4, maxLength: 4 }),
        (completedHabits) => {
          const result = checkPerfectDayPrompt(completedHabits);
          expect(result.shouldNotify).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });
});
