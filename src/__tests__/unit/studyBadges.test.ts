import { describe, it, expect } from "vitest";
import { getBadgeById, getBadgesByCategory } from "@/lib/badgeDefinitions";

// ─── Edge Function constants (mirrored for testing) ─────────────────────────

const VALID_TRIGGERS = [
  "xp_award",
  "submission",
  "streak_update",
  "grade",
  "journal",
  "habit_log",
  "team_event",
  "study_session",
] as const;

const BADGE_XP: Record<string, number> = {
  study_starter: 25,
  deep_focus: 50,
  weekly_warrior: 100,
  evidence_pro: 75,
};

// ─── Pure logic helpers (mirrored from Edge Function for testability) ────────

/**
 * Checks Study Starter condition: at least 1 completed study session.
 */
function meetsStudyStarterCondition(completedSessionCount: number): boolean {
  return completedSessionCount >= 1;
}

/**
 * Checks Deep Focus condition: at least one session with actual_duration_minutes >= 60.
 */
function meetsDeepFocusCondition(sessionDurations: number[]): boolean {
  return sessionDurations.some((d) => d >= 60);
}

/**
 * Checks Weekly Warrior condition: all 3 goals met in a single week.
 * Takes an array of goal progress objects for a single week.
 */
function meetsWeeklyWarriorCondition(
  goals: Array<{ target_value: number; current_value: number }>
): boolean {
  if (goals.length !== 3) return false;
  return goals.every((g) => g.current_value >= g.target_value);
}

/**
 * Checks Evidence Pro condition: 10 distinct sessions with evidence.
 */
function meetsEvidenceProCondition(
  distinctSessionsWithEvidence: number
): boolean {
  return distinctSessionsWithEvidence >= 10;
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("Study Badge Trigger Validation", () => {
  it("study_session is a valid trigger", () => {
    expect(VALID_TRIGGERS).toContain("study_session");
  });

  it("all original triggers remain valid", () => {
    expect(VALID_TRIGGERS).toContain("xp_award");
    expect(VALID_TRIGGERS).toContain("submission");
    expect(VALID_TRIGGERS).toContain("streak_update");
    expect(VALID_TRIGGERS).toContain("grade");
    expect(VALID_TRIGGERS).toContain("journal");
    expect(VALID_TRIGGERS).toContain("habit_log");
    expect(VALID_TRIGGERS).toContain("team_event");
  });
});

describe("Study Starter Badge — First Completed Session", () => {
  it("awards badge when exactly 1 completed session", () => {
    expect(meetsStudyStarterCondition(1)).toBe(true);
  });

  it("awards badge when more than 1 completed session", () => {
    expect(meetsStudyStarterCondition(5)).toBe(true);
    expect(meetsStudyStarterCondition(100)).toBe(true);
  });

  it("does not award badge with 0 completed sessions", () => {
    expect(meetsStudyStarterCondition(0)).toBe(false);
  });

  it("has correct XP reward of 25", () => {
    expect(BADGE_XP["study_starter"]).toBe(25);
  });
});

describe("Deep Focus Badge — Single Session ≥ 60 min", () => {
  it("awards badge when a session is exactly 60 minutes", () => {
    expect(meetsDeepFocusCondition([60])).toBe(true);
  });

  it("awards badge when a session exceeds 60 minutes", () => {
    expect(meetsDeepFocusCondition([90])).toBe(true);
    expect(meetsDeepFocusCondition([120])).toBe(true);
  });

  it("awards badge when at least one session is ≥ 60 among shorter ones", () => {
    expect(meetsDeepFocusCondition([15, 25, 60, 30])).toBe(true);
  });

  it("does not award badge when all sessions are under 60 minutes", () => {
    expect(meetsDeepFocusCondition([15, 25, 45, 59])).toBe(false);
  });

  it("does not award badge with no sessions", () => {
    expect(meetsDeepFocusCondition([])).toBe(false);
  });

  it("has correct XP reward of 50", () => {
    expect(BADGE_XP["deep_focus"]).toBe(50);
  });
});

describe("Weekly Warrior Badge — All 3 Goals Met in a Week", () => {
  it("awards badge when all 3 goals are met", () => {
    const goals = [
      { target_value: 10, current_value: 12 },
      { target_value: 5, current_value: 5 },
      { target_value: 3, current_value: 3 },
    ];
    expect(meetsWeeklyWarriorCondition(goals)).toBe(true);
  });

  it("awards badge when goals are exactly met", () => {
    const goals = [
      { target_value: 10, current_value: 10 },
      { target_value: 5, current_value: 5 },
      { target_value: 3, current_value: 3 },
    ];
    expect(meetsWeeklyWarriorCondition(goals)).toBe(true);
  });

  it("does not award badge when one goal is not met", () => {
    const goals = [
      { target_value: 10, current_value: 10 },
      { target_value: 5, current_value: 4 },
      { target_value: 3, current_value: 3 },
    ];
    expect(meetsWeeklyWarriorCondition(goals)).toBe(false);
  });

  it("does not award badge when no goals are met", () => {
    const goals = [
      { target_value: 10, current_value: 0 },
      { target_value: 5, current_value: 0 },
      { target_value: 3, current_value: 0 },
    ];
    expect(meetsWeeklyWarriorCondition(goals)).toBe(false);
  });

  it("does not award badge with fewer than 3 goals", () => {
    const goals = [
      { target_value: 10, current_value: 10 },
      { target_value: 5, current_value: 5 },
    ];
    expect(meetsWeeklyWarriorCondition(goals)).toBe(false);
  });

  it("does not award badge with more than 3 goals", () => {
    const goals = [
      { target_value: 10, current_value: 10 },
      { target_value: 5, current_value: 5 },
      { target_value: 3, current_value: 3 },
      { target_value: 2, current_value: 2 },
    ];
    expect(meetsWeeklyWarriorCondition(goals)).toBe(false);
  });

  it("does not award badge with 0 goals", () => {
    expect(meetsWeeklyWarriorCondition([])).toBe(false);
  });

  it("has correct XP reward of 100", () => {
    expect(BADGE_XP["weekly_warrior"]).toBe(100);
  });
});

describe("Evidence Pro Badge — 10 Sessions with Evidence", () => {
  it("awards badge with exactly 10 sessions with evidence", () => {
    expect(meetsEvidenceProCondition(10)).toBe(true);
  });

  it("awards badge with more than 10 sessions with evidence", () => {
    expect(meetsEvidenceProCondition(15)).toBe(true);
    expect(meetsEvidenceProCondition(100)).toBe(true);
  });

  it("does not award badge with fewer than 10 sessions", () => {
    expect(meetsEvidenceProCondition(9)).toBe(false);
    expect(meetsEvidenceProCondition(0)).toBe(false);
  });

  it("has correct XP reward of 75", () => {
    expect(BADGE_XP["evidence_pro"]).toBe(75);
  });
});

describe("Badge Definitions — study badges", () => {
  it("includes study_starter badge definition", () => {
    const badge = getBadgeById("study_starter");
    expect(badge).toBeDefined();
    expect(badge!.name).toBe("Study Starter");
    expect(badge!.icon).toBe("📚");
    expect(badge!.category).toBe("study");
    expect(badge!.xpReward).toBe(25);
    expect(badge!.isMystery).toBe(false);
  });

  it("includes deep_focus badge definition", () => {
    const badge = getBadgeById("deep_focus");
    expect(badge).toBeDefined();
    expect(badge!.name).toBe("Deep Focus");
    expect(badge!.icon).toBe("🧘");
    expect(badge!.category).toBe("study");
    expect(badge!.xpReward).toBe(50);
    expect(badge!.isMystery).toBe(false);
  });

  it("includes weekly_warrior badge definition", () => {
    const badge = getBadgeById("weekly_warrior");
    expect(badge).toBeDefined();
    expect(badge!.name).toBe("Weekly Warrior");
    expect(badge!.icon).toBe("🏆");
    expect(badge!.category).toBe("study");
    expect(badge!.xpReward).toBe(100);
    expect(badge!.isMystery).toBe(false);
  });

  it("includes evidence_pro badge definition", () => {
    const badge = getBadgeById("evidence_pro");
    expect(badge).toBeDefined();
    expect(badge!.name).toBe("Evidence Pro");
    expect(badge!.icon).toBe("📎");
    expect(badge!.category).toBe("study");
    expect(badge!.xpReward).toBe(75);
    expect(badge!.isMystery).toBe(false);
  });

  it("all four study badges are in the study category", () => {
    const studyBadges = getBadgesByCategory("study");
    expect(studyBadges.length).toBe(4);
    const ids = studyBadges.map((b) => b.id);
    expect(ids).toContain("study_starter");
    expect(ids).toContain("deep_focus");
    expect(ids).toContain("weekly_warrior");
    expect(ids).toContain("evidence_pro");
  });

  it("study badges have meaningful descriptions", () => {
    const studyBadges = getBadgesByCategory("study");
    for (const badge of studyBadges) {
      expect(badge.description.length).toBeGreaterThan(10);
      expect(badge.condition.length).toBeGreaterThan(5);
    }
  });
});
