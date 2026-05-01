import { describe, it, expect } from "vitest";
import { applyBonusMultiplier } from "@/lib/xpLevelCalculator";
import { XP_SCHEDULE } from "@/lib/xpSchedule";
import { calculateSessionXP } from "@/lib/plannerUtils";
import type { XPSource } from "@/types/app";

/**
 * Tests for the award-xp Edge Function planner source handling.
 *
 * The Edge Function runs on Deno and cannot be directly imported in Vitest.
 * These tests validate:
 * 1. New planner sources are recognized in the client-side type system
 * 2. Server-enforced XP amounts for fixed sources (planner_task, session_reflection, weekly_goal)
 * 3. Client-calculated XP for study_session via calculateSessionXP
 * 4. Bonus multiplier application to planner XP
 */

// ─── Edge Function constants (mirrored for testing) ─────────────────────────

const VALID_SOURCES: string[] = [
  "login",
  "submission",
  "badge",
  "admin_adjustment",
  "perfect_day",
  "first_attempt_bonus",
  "perfect_rubric",
  "bonus_event",
  "discussion_question",
  "discussion_answer",
  "survey_completion",
  "quiz_completion",
  "quiz_hard_bonus",
  "streak_milestone",
  "journal",
  "grade",
  "onboarding_personality",
  "onboarding_learning_style",
  "onboarding_baseline",
  "onboarding_complete",
  "onboarding_self_efficacy",
  "onboarding_study_strategy",
  "micro_assessment",
  "profile_complete",
  "starter_session_complete",
  "wellness_habit",
  "practice_quiz",
  "streak_freeze_purchase",
  "improvement_bonus",
  "league_promotion",
  "study_session",
  "planner_task",
  "session_reflection",
  "weekly_goal",
];

// Server-enforced fixed XP amounts for planner sources
const PLANNER_FIXED_XP: Record<string, number> = {
  planner_task: 10,
  session_reflection: 10,
  weekly_goal: 25,
};

// study_session XP cap (max 50 base + 10 evidence bonus = 60)
const STUDY_SESSION_XP_CAP = 60;

/**
 * Mirrors the Edge Function's server-side XP capping for study_session source.
 */
function capStudySessionXP(clientCalculatedXP: number): number {
  return Math.min(Math.max(clientCalculatedXP, 0), STUDY_SESSION_XP_CAP);
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("Award XP — Planner Sources Recognition", () => {
  it("study_session is included in VALID_SOURCES", () => {
    expect(VALID_SOURCES).toContain("study_session");
  });

  it("planner_task is included in VALID_SOURCES", () => {
    expect(VALID_SOURCES).toContain("planner_task");
  });

  it("session_reflection is included in VALID_SOURCES", () => {
    expect(VALID_SOURCES).toContain("session_reflection");
  });

  it("weekly_goal is included in VALID_SOURCES", () => {
    expect(VALID_SOURCES).toContain("weekly_goal");
  });

  it("all planner sources are valid XPSource types", () => {
    const studySession: XPSource = "study_session";
    const plannerTask: XPSource = "planner_task";
    const sessionReflection: XPSource = "session_reflection";
    const weeklyGoal: XPSource = "weekly_goal";
    expect(studySession).toBe("study_session");
    expect(plannerTask).toBe("planner_task");
    expect(sessionReflection).toBe("session_reflection");
    expect(weeklyGoal).toBe("weekly_goal");
  });

  it("XP_SCHEDULE includes all planner sources", () => {
    expect(XP_SCHEDULE).toHaveProperty("study_session");
    expect(XP_SCHEDULE).toHaveProperty("planner_task");
    expect(XP_SCHEDULE).toHaveProperty("session_reflection");
    expect(XP_SCHEDULE).toHaveProperty("weekly_goal");
  });

  it("XP_SCHEDULE has correct amounts for fixed planner sources", () => {
    expect(XP_SCHEDULE.planner_task).toBe(10);
    expect(XP_SCHEDULE.session_reflection).toBe(10);
    expect(XP_SCHEDULE.weekly_goal).toBe(25);
  });

  it("XP_SCHEDULE has 0 for study_session (variable amount)", () => {
    expect(XP_SCHEDULE.study_session).toBe(0);
  });
});

describe("Award XP — Planner Task (Fixed 10 XP)", () => {
  it("awards exactly 10 XP for planner task completion", () => {
    expect(PLANNER_FIXED_XP["planner_task"]).toBe(10);
  });

  it("applies 2x bonus multiplier to planner task XP", () => {
    const multiplied = applyBonusMultiplier(10, 2);
    expect(multiplied).toBe(20);
  });

  it("applies 1.5x bonus multiplier and floors result", () => {
    const multiplied = applyBonusMultiplier(10, 1.5);
    expect(multiplied).toBe(15);
  });

  it("returns base XP when multiplier is 1", () => {
    const multiplied = applyBonusMultiplier(10, 1);
    expect(multiplied).toBe(10);
  });
});

describe("Award XP — Session Reflection (Fixed 10 XP)", () => {
  it("awards exactly 10 XP for session reflection", () => {
    expect(PLANNER_FIXED_XP["session_reflection"]).toBe(10);
  });

  it("applies bonus multiplier to session reflection XP", () => {
    const multiplied = applyBonusMultiplier(10, 2);
    expect(multiplied).toBe(20);
  });
});

describe("Award XP — Weekly Goal (Fixed 25 XP)", () => {
  it("awards exactly 25 XP per weekly goal met", () => {
    expect(PLANNER_FIXED_XP["weekly_goal"]).toBe(25);
  });

  it("applies 2x bonus multiplier to weekly goal XP", () => {
    const multiplied = applyBonusMultiplier(25, 2);
    expect(multiplied).toBe(50);
  });

  it("applies 1.5x bonus multiplier and floors result", () => {
    const multiplied = applyBonusMultiplier(25, 1.5);
    expect(multiplied).toBe(37); // 25 * 1.5 = 37.5 → 37
  });
});

describe("Award XP — Study Session (Client-Calculated)", () => {
  it("calculateSessionXP returns 0 for sessions < 15 min", () => {
    expect(calculateSessionXP(0, false)).toBe(0);
    expect(calculateSessionXP(10, false)).toBe(0);
    expect(calculateSessionXP(14, false)).toBe(0);
  });

  it("calculateSessionXP returns 20 base for 15 min session", () => {
    expect(calculateSessionXP(15, false)).toBe(20);
  });

  it("calculateSessionXP returns 25 for 30 min session", () => {
    expect(calculateSessionXP(30, false)).toBe(25);
  });

  it("calculateSessionXP returns 35 for 60 min session", () => {
    expect(calculateSessionXP(60, false)).toBe(35);
  });

  it("calculateSessionXP caps at 50 base for long sessions", () => {
    expect(calculateSessionXP(240, false)).toBe(50);
  });

  it("calculateSessionXP adds 10 evidence bonus", () => {
    expect(calculateSessionXP(15, true)).toBe(30); // 20 + 10
    expect(calculateSessionXP(60, true)).toBe(45); // 35 + 10
    expect(calculateSessionXP(240, true)).toBe(60); // 50 + 10
  });

  it("server caps study_session XP at 60", () => {
    expect(capStudySessionXP(60)).toBe(60);
    expect(capStudySessionXP(100)).toBe(60);
  });

  it("server allows valid study_session XP through", () => {
    expect(capStudySessionXP(20)).toBe(20);
    expect(capStudySessionXP(35)).toBe(35);
    expect(capStudySessionXP(50)).toBe(50);
  });

  it("server clamps negative XP to 0", () => {
    expect(capStudySessionXP(-10)).toBe(0);
  });

  it("applies bonus multiplier to study session XP", () => {
    const baseXP = calculateSessionXP(60, true); // 45
    const multiplied = applyBonusMultiplier(baseXP, 2);
    expect(multiplied).toBe(90);
  });
});
