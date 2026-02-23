import { describe, it, expect } from 'vitest';
import { XP_SCHEDULE, LATE_SUBMISSION_XP, LATE_QUIZ_XP } from '@/lib/xpSchedule';
import type { XPSource } from '@/types/app';

describe('XP Schedule', () => {
  it('defines XP amounts for all XPSource types', () => {
    const expectedSources: XPSource[] = [
      'login',
      'submission',
      'grade',
      'journal',
      'streak_milestone',
      'perfect_day',
      'first_attempt_bonus',
      'perfect_rubric',
      'badge_earned',
      'level_up',
      'streak_freeze_purchase',
      'discussion_question',
      'discussion_answer',
      'survey_completion',
      'quiz_completion',
    ];

    for (const source of expectedSources) {
      expect(XP_SCHEDULE).toHaveProperty(source);
      expect(typeof XP_SCHEDULE[source]).toBe('number');
    }
  });

  it('matches requirement 21.1 XP amounts', () => {
    expect(XP_SCHEDULE.login).toBe(10);
    expect(XP_SCHEDULE.submission).toBe(50);
    expect(XP_SCHEDULE.grade).toBe(25);
    expect(XP_SCHEDULE.journal).toBe(20);
    expect(XP_SCHEDULE.streak_milestone).toBe(100);
    expect(XP_SCHEDULE.perfect_day).toBe(50);
    expect(XP_SCHEDULE.first_attempt_bonus).toBe(25);
    expect(XP_SCHEDULE.perfect_rubric).toBe(75);
    expect(XP_SCHEDULE.discussion_question).toBe(10);
    expect(XP_SCHEDULE.discussion_answer).toBe(15);
    expect(XP_SCHEDULE.survey_completion).toBe(15);
    expect(XP_SCHEDULE.quiz_completion).toBe(50);
  });

  it('has late submission XP less than on-time submission XP', () => {
    expect(LATE_SUBMISSION_XP).toBeLessThan(XP_SCHEDULE.submission);
    expect(LATE_SUBMISSION_XP).toBe(25);
  });

  it('has late quiz XP less than on-time quiz XP', () => {
    expect(LATE_QUIZ_XP).toBeLessThan(XP_SCHEDULE.quiz_completion);
    expect(LATE_QUIZ_XP).toBe(25);
  });

  it('has non-negative XP for all sources', () => {
    for (const [, amount] of Object.entries(XP_SCHEDULE)) {
      expect(amount).toBeGreaterThanOrEqual(0);
    }
  });

  it('has zero XP for variable-amount sources', () => {
    expect(XP_SCHEDULE.badge_earned).toBe(0);
    expect(XP_SCHEDULE.level_up).toBe(0);
    expect(XP_SCHEDULE.streak_freeze_purchase).toBe(0);
  });
});
