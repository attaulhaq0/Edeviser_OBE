// =============================================================================
// perfectDay — idempotent Perfect Day award business logic
// =============================================================================
//
// Domain: a student has a "Perfect Day" when all 4 daily habits
// (login, submit, journal, read) are completed in a single day. Completing the
// 4th habit awards a milestone `perfect_day` 50 XP and fires a badge check.
//
// This lives in `src/lib/` (clean-architecture: business logic, not a hook or
// component) so any engagement flow (login, submit, journal, read) can call it
// after writing its `habit_logs` row.
//
// Idempotency: `award-xp` enforces idempotency on `reference_id`, so the
// deterministic `perfect_day:{student_id}:{date}` reference guarantees the 50 XP
// is paid at most once per student per day — repeated calls (e.g. a student who
// completes a 5th action, or re-triggers a habit) cannot farm XP.

import { supabase } from "@/lib/supabase";

// The 4 canonical daily academic habits (see domain-knowledge: Daily Habits).
const REQUIRED_HABITS = ["login", "submit", "journal", "read"] as const;

export const PERFECT_DAY_XP = 50;

export interface PerfectDayResult {
  /** True when all 4 habits were present and the award was attempted. */
  awarded: boolean;
  /** The habit types recorded for the student today (deduplicated). */
  completedHabits: string[];
  /** The UTC date (YYYY-MM-DD) the check ran for. */
  date: string;
}

/** Today's date in UTC (YYYY-MM-DD), matching the midnight-UTC habit reset rule. */
const todayUtc = (): string => new Date().toISOString().split("T")[0] as string;

/**
 * Reads today's `habit_logs` for the student and, when all 4 daily habits are
 * present, awards the idempotent `perfect_day` 50 XP milestone and fires a
 * `check-badges` pass.
 *
 * Fire-and-forget: errors are caught and logged (never thrown) so this can be
 * safely awaited at the tail of an engagement flow without breaking it. Returns
 * a result so callers can react (e.g. celebrate) if useful.
 */
export const awardPerfectDayIfComplete = async (
  studentId: string
): Promise<PerfectDayResult> => {
  const date = todayUtc();

  if (!studentId) {
    return { awarded: false, completedHabits: [], date };
  }

  try {
    const { data, error } = await supabase
      .from("habit_logs")
      .select("habit_type")
      .eq("student_id", studentId)
      .eq("date", date);

    if (error) throw error;

    const completedHabits = [
      ...new Set((data ?? []).map((row) => row.habit_type)),
    ];

    const allComplete = REQUIRED_HABITS.every((habit) =>
      completedHabits.includes(habit)
    );

    if (!allComplete) {
      return { awarded: false, completedHabits, date };
    }

    // All 4 habits present → award idempotent perfect_day milestone XP.
    try {
      await supabase.functions.invoke("award-xp", {
        body: {
          student_id: studentId,
          xp_amount: PERFECT_DAY_XP,
          source: "perfect_day",
          reference_id: `perfect_day:${studentId}:${date}`,
          is_milestone: true,
        },
      });
    } catch {
      console.error("[awardPerfectDayIfComplete] award-xp invocation failed");
    }

    // Fire the perfect_day badge check.
    try {
      await supabase.functions.invoke("check-badges", {
        body: {
          student_id: studentId,
          trigger: "perfect_day",
        },
      });
    } catch {
      console.error(
        "[awardPerfectDayIfComplete] check-badges invocation failed"
      );
    }

    return { awarded: true, completedHabits, date };
  } catch {
    console.error("[awardPerfectDayIfComplete] habit_logs read failed");
    return { awarded: false, completedHabits: [], date };
  }
};
