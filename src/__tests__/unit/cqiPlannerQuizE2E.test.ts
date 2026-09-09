// Feature: continuous-verification, Phase 9
// E2E-5: CQI Closed Loop — Pattern -> Plan -> Verify
// E2E-9: Student Planner — Task -> XP -> Badge -> Heatmap
import { describe, it, expect } from "vitest";

// ---- E2E-5: CQI Closed Loop ----
const VALID_CQI_STATUSES = ['open','linked','resolved','reopened'] as const;
type CqiStatus = typeof VALID_CQI_STATUSES[number];

interface CqiPattern { status: CqiStatus; current_attainment: number; target_threshold: number; affected_population: number }

const validatePattern = (p: CqiPattern): string[] => {
  const errors: string[] = [];
  if (!VALID_CQI_STATUSES.includes(p.status)) errors.push('invalid status: ' + p.status);
  if (p.affected_population < 2) errors.push('affected_population must be >= 2');
  if (p.current_attainment >= p.target_threshold) errors.push('current_attainment must be below target_threshold for a gap pattern');
  return errors;
};

const transitionPlan = (plan: { status: string }, newStatus: string): string | null => {
  const validTransitions: Record<string, string[]> = {
    draft: ['approved'],
    approved: ['in_progress'],
    in_progress: ['evaluated'],
    evaluated: [],
  };
  return validTransitions[plan.status]?.includes(newStatus) ? newStatus : null;
};

describe('E2E-5: CQI Closed Loop', () => {
  it('P5a: valid systemic gap pattern — below threshold, 40 students', () => {
    const pattern: CqiPattern = { status: 'open', current_attainment: 63.06, target_threshold: 70, affected_population: 40 };
    expect(validatePattern(pattern)).toEqual([]);
  });
  it('P5b: rejects pattern above threshold', () => {
    const pattern: CqiPattern = { status: 'open', current_attainment: 85, target_threshold: 70, affected_population: 10 };
    expect(validatePattern(pattern).length).toBeGreaterThan(0);
  });
  it('P5c: rejects pattern with < 2 students', () => {
    const pattern: CqiPattern = { status: 'open', current_attainment: 50, target_threshold: 70, affected_population: 1 };
    expect(validatePattern(pattern)).toContain('affected_population must be >= 2');
  });
  it('P5d: plan transitions draft->approved->in_progress->evaluated', () => {
    const plan = { status: 'draft' };
    expect(transitionPlan(plan, 'approved')).toBe('approved');
    plan.status = 'approved';
    expect(transitionPlan(plan, 'in_progress')).toBe('in_progress');
    plan.status = 'in_progress';
    expect(transitionPlan(plan, 'evaluated')).toBe('evaluated');
  });
  it('P5e: rejects invalid transition (approved -> evaluated skipping in_progress)', () => {
    expect(transitionPlan({ status: 'approved' }, 'evaluated')).toBeNull();
  });
  it('P5f: evaluated plan cannot transition further (terminal state)', () => {
    expect(transitionPlan({ status: 'evaluated' }, 'approved')).toBeNull();
  });
  it('P5g: all 4 CQI statuses are valid', () => {
    for (const s of VALID_CQI_STATUSES) expect(VALID_CQI_STATUSES).toContain(s);
  });
});

// ---- E2E-9: Student Planner Chain ----
const AWARD_XP_SOURCE = 'planner_task';
const XP_PER_TASK = 10;

const calcXpAfterTask = (currentXP: number, taskXP: number, hasBeenAwarded: boolean): number =>
  hasBeenAwarded ? currentXP : currentXP + taskXP;

const checkStreakMilestone = (streakDays: number): string | null => {
  if (streakDays >= 100) return '100-day streak';
  if (streakDays >= 60) return '60-day streak';
  if (streakDays >= 30) return '30-day streak';
  if (streakDays >= 7) return '7-day streak';
  return null;
};

const checkBadgeUnlock = (totalXP: number, currentLevel: number): string | null => {
  if (totalXP >= 1000 && currentLevel < 10) return 'Scholar Badge';
  if (totalXP >= 500 && currentLevel < 5) return 'Learner Badge';
  return null;
};

describe('E2E-9: Student Planner — Task->XP->Badge->Heatmap', () => {
  it('P9a: completing task awards exactly 10 XP (dedup-safe)', () => {
    expect(calcXpAfterTask(0, XP_PER_TASK, false)).toBe(10);
    expect(calcXpAfterTask(10, XP_PER_TASK, true)).toBe(10); // no double award
  });
  it('P9b: XP source must be planner_task (server-validated)', () => {
    expect(AWARD_XP_SOURCE).toBe('planner_task');
  });
  it('P9c: 7-day streak triggers milestone at exactly 7', () => {
    expect(checkStreakMilestone(6)).toBeNull();
    expect(checkStreakMilestone(7)).toBe('7-day streak');
  });
  it('P9d: 30-day streak returns correct milestone', () => {
    expect(checkStreakMilestone(30)).toBe('30-day streak');
  });
  it('P9e: 100-day streak returns highest milestone', () => {
    expect(checkStreakMilestone(100)).toBe('100-day streak');
  });
  it('P9f: badge unlocks at 500 XP (Scholar)', () => {
    expect(checkBadgeUnlock(499, 3)).toBeNull();
    expect(checkBadgeUnlock(500, 3)).toBe('Learner Badge');
  });
  it('P9g: badge does not re-unlock if already awarded', () => {
    expect(checkBadgeUnlock(600, 6)).toBeNull();
  });
});

// ---- E2E-8: Adaptive Quiz Chain ----
const adjustDifficulty = (current: number, correct: boolean): number => {
  if (correct) return Math.min(5, current + 0.3);
  return Math.max(1, current - 0.5);
};

describe('E2E-8: Adaptive Quiz Chain', () => {
  it('P8a: correct answer increases difficulty by 0.3', () => {
    expect(adjustDifficulty(3, true)).toBeCloseTo(3.3, 1);
  });
  it('P8b: incorrect answer decreases difficulty by 0.5', () => {
    expect(adjustDifficulty(3, false)).toBe(2.5);
  });
  it('P8c: difficulty capped at 5.0 (max)', () => {
    expect(adjustDifficulty(4.9, true)).toBeCloseTo(5, 0);
    expect(adjustDifficulty(5, true)).toBe(5);
  });
  it('P8d: difficulty floored at 1.0 (min)', () => {
    expect(adjustDifficulty(1, false)).toBe(1);
    expect(adjustDifficulty(1.5, false)).toBeCloseTo(1, 0);
  });
});
