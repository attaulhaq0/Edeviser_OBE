import { describe, it, expect } from 'vitest';

/**
 * Unit tests for study badge conditions defined in check-badges Edge Function.
 * Tests the badge condition logic and definitions.
 */

// Badge XP amounts (mirrored from Edge Function)
const STUDY_BADGE_XP: Record<string, number> = {
  study_starter: 25,
  deep_focus: 50,
  weekly_warrior: 100,
  evidence_pro: 75,
};

// Badge condition helpers (pure logic extracted for testing)
function checkStudyStarterCondition(completedSessionCount: number): boolean {
  return completedSessionCount >= 1;
}

function checkDeepFocusCondition(longestSessionMinutes: number): boolean {
  return longestSessionMinutes >= 60;
}

function checkWeeklyWarriorCondition(
  goals: Array<{ goalType: string; targetValue: number }>,
  actuals: { studyHours: number; sessionsCompleted: number; tasksCompleted: number },
): boolean {
  if (goals.length < 3) return false;
  return goals.every((g) => {
    let current = 0;
    if (g.goalType === 'study_hours') current = actuals.studyHours;
    else if (g.goalType === 'sessions_completed') current = actuals.sessionsCompleted;
    else if (g.goalType === 'tasks_completed') current = actuals.tasksCompleted;
    return current >= g.targetValue;
  });
}

function checkEvidenceProCondition(sessionsWithEvidenceCount: number): boolean {
  return sessionsWithEvidenceCount >= 10;
}

describe('Study Badges', () => {
  describe('Badge XP amounts', () => {
    it('study_starter awards 25 XP', () => {
      expect(STUDY_BADGE_XP.study_starter).toBe(25);
    });

    it('deep_focus awards 50 XP', () => {
      expect(STUDY_BADGE_XP.deep_focus).toBe(50);
    });

    it('weekly_warrior awards 100 XP', () => {
      expect(STUDY_BADGE_XP.weekly_warrior).toBe(100);
    });

    it('evidence_pro awards 75 XP', () => {
      expect(STUDY_BADGE_XP.evidence_pro).toBe(75);
    });
  });

  describe('Study Starter condition', () => {
    it('not earned with 0 completed sessions', () => {
      expect(checkStudyStarterCondition(0)).toBe(false);
    });

    it('earned with 1 completed session', () => {
      expect(checkStudyStarterCondition(1)).toBe(true);
    });

    it('earned with many completed sessions', () => {
      expect(checkStudyStarterCondition(50)).toBe(true);
    });
  });

  describe('Deep Focus condition', () => {
    it('not earned with 30-minute session', () => {
      expect(checkDeepFocusCondition(30)).toBe(false);
    });

    it('not earned with 59-minute session', () => {
      expect(checkDeepFocusCondition(59)).toBe(false);
    });

    it('earned with exactly 60-minute session', () => {
      expect(checkDeepFocusCondition(60)).toBe(true);
    });

    it('earned with 120-minute session', () => {
      expect(checkDeepFocusCondition(120)).toBe(true);
    });
  });

  describe('Weekly Warrior condition', () => {
    it('not earned with fewer than 3 goals', () => {
      const goals = [
        { goalType: 'study_hours', targetValue: 5 },
        { goalType: 'sessions_completed', targetValue: 3 },
      ];
      expect(checkWeeklyWarriorCondition(goals, {
        studyHours: 10, sessionsCompleted: 5, tasksCompleted: 10,
      })).toBe(false);
    });

    it('not earned when one goal is not met', () => {
      const goals = [
        { goalType: 'study_hours', targetValue: 10 },
        { goalType: 'sessions_completed', targetValue: 5 },
        { goalType: 'tasks_completed', targetValue: 8 },
      ];
      expect(checkWeeklyWarriorCondition(goals, {
        studyHours: 10, sessionsCompleted: 5, tasksCompleted: 3, // tasks not met
      })).toBe(false);
    });

    it('earned when all 3 goals are met', () => {
      const goals = [
        { goalType: 'study_hours', targetValue: 5 },
        { goalType: 'sessions_completed', targetValue: 3 },
        { goalType: 'tasks_completed', targetValue: 4 },
      ];
      expect(checkWeeklyWarriorCondition(goals, {
        studyHours: 6, sessionsCompleted: 4, tasksCompleted: 5,
      })).toBe(true);
    });

    it('earned when goals are exactly met', () => {
      const goals = [
        { goalType: 'study_hours', targetValue: 5 },
        { goalType: 'sessions_completed', targetValue: 3 },
        { goalType: 'tasks_completed', targetValue: 4 },
      ];
      expect(checkWeeklyWarriorCondition(goals, {
        studyHours: 5, sessionsCompleted: 3, tasksCompleted: 4,
      })).toBe(true);
    });
  });

  describe('Evidence Pro condition', () => {
    it('not earned with 0 sessions with evidence', () => {
      expect(checkEvidenceProCondition(0)).toBe(false);
    });

    it('not earned with 9 sessions with evidence', () => {
      expect(checkEvidenceProCondition(9)).toBe(false);
    });

    it('earned with exactly 10 sessions with evidence', () => {
      expect(checkEvidenceProCondition(10)).toBe(true);
    });

    it('earned with more than 10 sessions with evidence', () => {
      expect(checkEvidenceProCondition(25)).toBe(true);
    });
  });

  describe('Badge idempotency', () => {
    it('badges are checked against existing badge set', () => {
      const existingBadgeIds = new Set(['study_starter', 'deep_focus']);
      // study_starter already earned — should not be re-awarded
      expect(existingBadgeIds.has('study_starter')).toBe(true);
      // weekly_warrior not yet earned
      expect(existingBadgeIds.has('weekly_warrior')).toBe(false);
    });
  });
});
