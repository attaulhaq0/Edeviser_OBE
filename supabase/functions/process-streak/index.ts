import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ─── Types ──────────────────────────────────────────────────────────────────

interface ProcessStreakPayload {
  student_id: string;
}

interface StreakState {
  streak_count: number;
  last_login_date: string | null;
  streak_freezes_available: number;
  comeback_challenge_active: boolean;
  comeback_challenge_days_completed: number;
  comeback_challenge_streak_to_restore: number;
  total_active_days: number;
  habit_difficulty_level: number;
  habit_level_streak: number;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const STREAK_MILESTONES = [7, 14, 30, 60, 100];

const MILESTONE_XP: Record<number, number> = {
  7: 100,
  14: 100,
  30: 250,
  60: 250,
  100: 500,
};

// ─── Pure Helpers ───────────────────────────────────────────────────────────

function daysBetween(dateA: string, dateB: string): number {
  const a = new Date(dateA + "T00:00:00Z");
  const b = new Date(dateB + "T00:00:00Z");
  return Math.floor(Math.abs(a.getTime() - b.getTime()) / 86_400_000);
}

function getTodayUTC(): string {
  const now = new Date();
  return now.toISOString().slice(0, 10); // YYYY-MM-DD
}

// ─── Comeback Challenge Helpers ─────────────────────────────────────────────

function calculateStreakToRestore(lostStreak: number): number {
  return Math.floor(lostStreak / 2);
}

/**
 * Check if a student completed all required habits at their current
 * Habit Difficulty Level for a given date.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function checkHabitsCompletedAtLevel(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  studentId: string,
  date: string,
  habitDifficultyLevel: number
): Promise<boolean> {
  const { data: logs } = await supabase
    .from("habit_logs")
    .select("habit_type")
    .eq("student_id", studentId)
    .eq("date", date)
    .not("completed_at", "is", null);

  const completedTypes = new Set(
    (logs ?? []).map((l: { habit_type: string }) => l.habit_type)
  );

  // Level 1: login only (1 habit)
  if (habitDifficultyLevel <= 1) {
    return completedTypes.has("login");
  }
  // Level 2: login + one other (2 habits)
  if (habitDifficultyLevel === 2) {
    if (!completedTypes.has("login")) return false;
    return completedTypes.size >= 2;
  }
  // Level 3: all habits
  return completedTypes.size >= 4;
}

// ─── Streak Sabbatical Helper ────────────────────────────────────────────────

/**
 * Check if today is a Streak Sabbatical rest day (Saturday or Sunday)
 * when the institution has sabbatical enabled.
 */
function isStreakSabbaticalDay(
  sabbaticalEnabled: boolean,
  dateStr: string
): boolean {
  if (!sabbaticalEnabled) return false;
  const d = new Date(dateStr + "T00:00:00Z");
  const day = d.getUTCDay();
  return day === 0 || day === 6; // Sunday = 0, Saturday = 6
}

// ─── Validation ─────────────────────────────────────────────────────────────

function validatePayload(
  payload: unknown
):
  | { valid: true; data: ProcessStreakPayload }
  | { valid: false; error: string } {
  if (!payload || typeof payload !== "object") {
    return { valid: false, error: "Request body must be a JSON object" };
  }

  const p = payload as Record<string, unknown>;

  if (!p.student_id || typeof p.student_id !== "string") {
    return {
      valid: false,
      error: "student_id is required and must be a string",
    };
  }

  return { valid: true, data: { student_id: p.student_id } };
}

// ─── Peer Milestone Notification for Streak ─────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function notifyPeersOfStreakMilestone(
  supabase: any,
  studentId: string,
  streakDays: number
): Promise<void> {
  // Check if student is in anonymous leaderboard mode
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, leaderboard_anonymous")
    .eq("id", studentId)
    .maybeSingle();

  if (!profile || profile.leaderboard_anonymous) return;

  const studentName = profile.full_name ?? "A classmate";

  // Find peer students in shared courses
  const { data: enrollments } = await supabase
    .from("student_courses")
    .select("course_id")
    .eq("student_id", studentId);

  if (!enrollments || enrollments.length === 0) return;

  const courseIds = enrollments.map((e: { course_id: string }) => e.course_id);

  const { data: peerEnrollments } = await supabase
    .from("student_courses")
    .select("student_id")
    .in("course_id", courseIds)
    .neq("student_id", studentId);

  if (!peerEnrollments || peerEnrollments.length === 0) return;

  const peerIds = [
    ...new Set(
      peerEnrollments.map((e: { student_id: string }) => e.student_id)
    ),
  ];

  const message = `${studentName} is on a ${streakDays}-day streak!`;

  const notifications = peerIds.map((peerId) => ({
    user_id: peerId,
    type: "peer_milestone",
    title: "Streak Achievement",
    message,
    is_read: false,
    metadata: {
      milestone_type: "streak_milestone",
      triggering_student_id: studentId,
      streak_days: streakDays,
    },
  }));

  const { error } = await supabase.from("notifications").insert(notifications);
  if (error) {
    console.error("Failed to insert peer streak notifications:", error.message);
  }
}

// ─── Team Streak Constants ───────────────────────────────────────────────────

const TEAM_STREAK_MILESTONES: Record<number, number> = {
  7: 100,
  14: 250,
  30: 500,
};

const TEAM_STREAK_BADGE_IDS: Record<number, string> = {
  7: "team_streak_7",
  14: "team_streak_14",
  30: "team_streak_30",
};

// ─── Team Streak Processing ─────────────────────────────────────────────────

async function processTeamStreaks(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  studentId: string,
  todayUTC: string
): Promise<void> {
  // Find all teams the student belongs to
  const { data: memberships } = await supabase
    .from("team_members")
    .select("team_id")
    .eq("student_id", studentId);

  if (!memberships || memberships.length === 0) return;

  for (const membership of memberships) {
    const teamId = membership.team_id as string;

    // Get all team members
    const { data: members } = await supabase
      .from("team_members")
      .select("student_id")
      .eq("team_id", teamId);

    if (!members || members.length < 2) continue;

    const memberIds = members.map((m: { student_id: string }) => m.student_id);

    // Check if ALL members have logged in today
    const { data: todayLogins } = await supabase
      .from("student_gamification")
      .select("student_id")
      .in("student_id", memberIds)
      .eq("last_login_date", todayUTC);

    const loggedInToday = new Set(
      (todayLogins ?? []).map((l: { student_id: string }) => l.student_id)
    );

    const allLoggedIn = memberIds.every((id: string) => loggedInToday.has(id));

    // Fetch current team gamification
    const { data: teamGam } = await supabase
      .from("team_gamification")
      .select("streak_current, streak_longest, last_streak_date")
      .eq("team_id", teamId)
      .maybeSingle();

    if (!allLoggedIn) {
      // Not all members logged in — check if streak should reset
      // Only reset if the previous streak date was yesterday (meaning today is a miss)
      // Don't reset if we're still waiting for today's logins
      continue;
    }

    // All members logged in today — update team streak
    const currentStreak = teamGam?.streak_current ?? 0;
    const longestStreak = teamGam?.streak_longest ?? 0;
    const lastStreakDate = teamGam?.last_streak_date as string | null;

    let newStreak: number;

    if (!lastStreakDate) {
      newStreak = 1;
    } else {
      const dayDiff = daysBetween(lastStreakDate, todayUTC);
      if (dayDiff === 0) {
        // Already processed today
        continue;
      } else if (dayDiff === 1) {
        newStreak = currentStreak + 1;
      } else {
        // Missed days — reset
        newStreak = 1;
      }
    }

    const newLongest = Math.max(longestStreak, newStreak);

    // Upsert team gamification
    await supabase.from("team_gamification").upsert(
      {
        team_id: teamId,
        streak_current: newStreak,
        streak_longest: newLongest,
        last_streak_date: todayUTC,
      },
      { onConflict: "team_id" }
    );

    // Check for team streak milestones
    const milestoneXP = TEAM_STREAK_MILESTONES[newStreak];
    if (milestoneXP) {
      // Award XP to team pool
      try {
        await supabase.from("xp_transactions").insert({
          team_id: teamId,
          xp_amount: milestoneXP,
          source: "streak_milestone",
          note: `Team streak milestone: ${newStreak} days`,
        });

        // Update team xp_total
        const { data: currentGam } = await supabase
          .from("team_gamification")
          .select("xp_total")
          .eq("team_id", teamId)
          .maybeSingle();

        if (currentGam) {
          await supabase
            .from("team_gamification")
            .update({ xp_total: (currentGam.xp_total ?? 0) + milestoneXP })
            .eq("team_id", teamId);
        }
      } catch (xpErr) {
        console.error(
          `Failed to award team streak XP:`,
          (xpErr as Error).message
        );
      }

      // Trigger team badge check
      try {
        await supabase.functions.invoke("check-badges", {
          body: {
            student_id: studentId,
            trigger: "team_event",
            team_id: teamId,
          },
        });
      } catch (badgeErr) {
        console.error(
          "Failed to check team badges:",
          (badgeErr as Error).message
        );
      }

      // Notify team members of milestone
      const notifications = memberIds.map((memberId: string) => ({
        user_id: memberId,
        type: "team_streak_milestone",
        title: "Team Streak Milestone!",
        message: `Your team hit a ${newStreak}-day streak! 🔥 +${milestoneXP} XP`,
        is_read: false,
        metadata: {
          team_id: teamId,
          streak_days: newStreak,
          xp_awarded: milestoneXP,
        },
      }));

      await supabase
        .from("notifications")
        .insert(notifications)
        .catch((err: Error) => {
          console.error(
            "Failed to send team streak notifications:",
            err.message
          );
        });
    }
  }
}

// ─── Main Handler ───────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ── Auth: require service role or authenticated student ──────────
    const authHeader = req.headers.get("Authorization") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const isServiceRole = serviceRoleKey && authHeader.includes(serviceRoleKey);

    if (!isServiceRole) {
      if (!authHeader) {
        return new Response(
          JSON.stringify({ error: "Missing authorization header" }),
          {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      const userClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );
      const {
        data: { user: caller },
        error: authError,
      } = await userClient.auth.getUser();
      if (authError || !caller) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const validation = validatePayload(body);

    if (!validation.valid) {
      return new Response(JSON.stringify({ error: validation.error }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { student_id } = validation.data;
    const todayUTC = getTodayUTC();

    // ── Step 1: Fetch current gamification record ───────────────────────

    const { data: current, error: fetchErr } = await supabase
      .from("student_gamification")
      .select(
        "streak_count, last_login_date, streak_freezes_available, comeback_challenge_active, comeback_challenge_days_completed, comeback_challenge_streak_to_restore, total_active_days, habit_difficulty_level, habit_level_streak"
      )
      .eq("student_id", student_id)
      .maybeSingle();

    if (fetchErr) {
      console.error("Failed to fetch gamification record:", fetchErr.message);
      return new Response(
        JSON.stringify({
          error: "Failed to fetch gamification record",
          detail: fetchErr.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const state: StreakState | null = current
      ? {
          streak_count: current.streak_count ?? 0,
          last_login_date: current.last_login_date ?? null,
          streak_freezes_available: current.streak_freezes_available ?? 0,
          comeback_challenge_active: current.comeback_challenge_active ?? false,
          comeback_challenge_days_completed:
            current.comeback_challenge_days_completed ?? 0,
          comeback_challenge_streak_to_restore:
            current.comeback_challenge_streak_to_restore ?? 0,
          total_active_days: current.total_active_days ?? 0,
          habit_difficulty_level: current.habit_difficulty_level ?? 1,
          habit_level_streak: current.habit_level_streak ?? 0,
        }
      : null;

    // ── Step 1b: Fetch institution settings for Streak Sabbatical ──────

    let streakSabbaticalEnabled = false;
    {
      // Get the student's institution_id from profiles
      const { data: profileRow } = await supabase
        .from("profiles")
        .select("institution_id")
        .eq("id", student_id)
        .maybeSingle();

      if (profileRow?.institution_id) {
        const { data: instSettings } = await supabase
          .from("institution_settings")
          .select("streak_sabbatical_enabled")
          .eq("institution_id", profileRow.institution_id)
          .maybeSingle();

        streakSabbaticalEnabled =
          (instSettings as Record<string, unknown> | null)
            ?.streak_sabbatical_enabled === true;
      }
    }

    // ── Step 1c: Check Streak Sabbatical — skip streak check on weekends ─

    const isSabbaticalRestDay = isStreakSabbaticalDay(
      streakSabbaticalEnabled,
      todayUTC
    );

    // ── Step 2: Calculate streak update ─────────────────────────────────

    let newStreakCount: number;
    let streakFrozen = false;
    let freezeConsumed = false;
    let milestoneReached: number | null = null;
    let isNewDay = true;

    if (!state || !state.last_login_date) {
      // First login ever
      newStreakCount = 1;
    } else {
      const dayDiff = daysBetween(state.last_login_date, todayUTC);

      if (dayDiff === 0) {
        // Same day — no-op
        return new Response(
          JSON.stringify({
            success: true,
            streak_count: state.streak_count,
            milestone_reached: null,
            streak_frozen: false,
            streak_sabbatical_rest_day: isSabbaticalRestDay,
            comeback_challenge: {
              active: state.comeback_challenge_active,
              days_completed: state.comeback_challenge_days_completed,
              streak_to_restore: state.comeback_challenge_streak_to_restore,
              just_completed: false,
            },
            total_active_days: state.total_active_days,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Streak Sabbatical: count weekend days between last login and today as non-streak days
      // This effectively reduces the dayDiff for streak evaluation purposes
      let effectiveDayDiff = dayDiff;
      if (streakSabbaticalEnabled && dayDiff > 1) {
        // Count weekend days in the gap (exclusive of last_login_date, inclusive of today)
        let weekendDaysInGap = 0;
        const gapStart = new Date(state.last_login_date + "T00:00:00Z");
        for (let i = 1; i < dayDiff; i++) {
          const checkDate = new Date(gapStart.getTime() + i * 86_400_000);
          const dow = checkDate.getUTCDay();
          if (dow === 0 || dow === 6) weekendDaysInGap++;
        }
        effectiveDayDiff = dayDiff - weekendDaysInGap;
      }

      if (effectiveDayDiff <= 1) {
        // Consecutive day (or gap was only weekends)
        newStreakCount = state.streak_count + 1;
      } else if (effectiveDayDiff === 2 && state.streak_freezes_available > 0) {
        // Missed exactly 1 weekday, freeze available
        newStreakCount = state.streak_count + 1;
        streakFrozen = true;
        freezeConsumed = true;
      } else {
        // Missed too many days — reset
        newStreakCount = 1;
      }
    }

    // Log streak_break event if streak was reset from a non-zero value
    const streakBroken =
      state && state.streak_count > 1 && newStreakCount === 1;
    if (streakBroken) {
      supabase
        .from("student_activity_log")
        .insert({
          student_id: student_id,
          event_type: "streak_break",
          metadata: { previous_streak: state.streak_count },
        })
        .then(({ error: logErr }: { error: { message: string } | null }) => {
          if (logErr)
            console.error(
              "[ActivityLogger] streak_break log failed:",
              logErr.message
            );
        });
    }

    // ── Step 2b: Process Comeback Challenge ──────────────────────────────

    let comebackActive = state?.comeback_challenge_active ?? false;
    let comebackDaysCompleted = state?.comeback_challenge_days_completed ?? 0;
    let comebackStreakToRestore =
      state?.comeback_challenge_streak_to_restore ?? 0;
    let comebackJustCompleted = false;

    const habitsCompletedToday = await checkHabitsCompletedAtLevel(
      supabase,
      student_id,
      todayUTC,
      state?.habit_difficulty_level ?? 1
    );

    if (streakBroken && state && state.streak_count > 1) {
      // Streak just broke — activate Comeback Challenge (Req 124.1, 124.2)
      comebackActive = true;
      comebackDaysCompleted = 0;
      comebackStreakToRestore = calculateStreakToRestore(state.streak_count);
    } else if (comebackActive) {
      // Challenge is active — check daily progress
      if (habitsCompletedToday) {
        comebackDaysCompleted += 1;

        if (comebackDaysCompleted >= 3) {
          // Challenge completed — restore streak (Req 124.3)
          newStreakCount = comebackStreakToRestore;
          comebackActive = false;
          comebackJustCompleted = true;

          // Check Comeback Kid badge eligibility (Req 124.6)
          try {
            await supabase.functions.invoke("check-badges", {
              body: {
                student_id,
                trigger: "comeback_challenge_completed",
              },
            });
          } catch (badgeErr) {
            console.error(
              "Failed to check Comeback Kid badge:",
              (badgeErr as Error).message
            );
          }
        }
      } else {
        // Habits not completed — cancel challenge (Req 124.4)
        comebackActive = false;
        comebackDaysCompleted = 0;
        comebackStreakToRestore = 0;
      }
    }

    // ── Step 2c: Increment total_active_days ─────────────────────────────

    let totalActiveDays = state?.total_active_days ?? 0;
    if (habitsCompletedToday) {
      totalActiveDays += 1;
    }

    // ── Step 2d: Habit Difficulty Level tracking (Req 127.3, 127.5) ─────

    let habitDifficultyLevel = state?.habit_difficulty_level ?? 1;
    let habitLevelStreak = state?.habit_level_streak ?? 0;
    let levelPromoted = false;

    if (habitsCompletedToday) {
      // Student completed all required habits at their current level today
      habitLevelStreak += 1;

      // Promote if streak reaches 7 and level < 3
      if (habitLevelStreak >= 7 && habitDifficultyLevel < 3) {
        habitDifficultyLevel += 1;
        habitLevelStreak = 0;
        levelPromoted = true;
      }
    } else {
      // Missed today — reset streak but do NOT demote level (Req 127.5)
      habitLevelStreak = 0;
    }

    // Check milestone
    if (STREAK_MILESTONES.includes(newStreakCount)) {
      milestoneReached = newStreakCount;
    }

    // ── Step 3: Update student_gamification ──────────────────────────────

    const updateData: Record<string, unknown> = {
      student_id,
      streak_count: newStreakCount,
      last_login_date: todayUTC,
      comeback_challenge_active: comebackActive,
      comeback_challenge_days_completed: comebackDaysCompleted,
      comeback_challenge_streak_to_restore: comebackStreakToRestore,
      total_active_days: totalActiveDays,
      habit_difficulty_level: habitDifficultyLevel,
      habit_level_streak: habitLevelStreak,
    };

    if (comebackJustCompleted) {
      updateData.comeback_challenge_start_date = null;
    } else if (streakBroken && state && state.streak_count > 1) {
      updateData.comeback_challenge_start_date = new Date().toISOString();
    }

    if (freezeConsumed && state) {
      updateData.streak_freezes_available = state.streak_freezes_available - 1;
    }

    const { error: upsertErr } = await supabase
      .from("student_gamification")
      .upsert(updateData, { onConflict: "student_id" });

    if (upsertErr) {
      console.error("Failed to update gamification record:", upsertErr.message);
      return new Response(
        JSON.stringify({
          error: "Failed to update gamification record",
          detail: upsertErr.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ── Step 4: Award milestone XP if applicable ────────────────────────

    if (milestoneReached !== null) {
      const xpAmount = MILESTONE_XP[milestoneReached];
      if (xpAmount) {
        try {
          await supabase.functions.invoke("award-xp", {
            body: {
              student_id,
              xp_amount: xpAmount,
              source: "streak_milestone",
              note: `Streak milestone: ${milestoneReached} days`,
            },
          });
        } catch (xpErr) {
          // Log but don't fail the streak update
          console.error(
            "Failed to award milestone XP:",
            (xpErr as Error).message
          );
        }
      }

      // Notify peers for notable streak milestones (7, 30, 100)
      const PEER_NOTIFY_MILESTONES = [7, 30, 100];
      if (PEER_NOTIFY_MILESTONES.includes(milestoneReached)) {
        notifyPeersOfStreakMilestone(
          supabase,
          student_id,
          milestoneReached
        ).catch((err) => {
          console.error("Peer streak notification failed:", err);
        });
      }
    }

    // ── Response ────────────────────────────────────────────────────────

    // ── Step 5: Process team streaks ────────────────────────────────────

    processTeamStreaks(supabase, student_id, todayUTC).catch((err) => {
      console.error("Team streak processing failed:", err);
    });

    // ── Final Response ──────────────────────────────────────────────────

    return new Response(
      JSON.stringify({
        success: true,
        streak_count: newStreakCount,
        milestone_reached: milestoneReached,
        streak_frozen: streakFrozen,
        streak_sabbatical_rest_day: isSabbaticalRestDay,
        streak_sabbatical_enabled: streakSabbaticalEnabled,
        comeback_challenge: {
          active: comebackActive,
          days_completed: comebackDaysCompleted,
          streak_to_restore: comebackStreakToRestore,
          just_completed: comebackJustCompleted,
        },
        total_active_days: totalActiveDays,
        habit_difficulty: {
          level: habitDifficultyLevel,
          habit_level_streak: habitLevelStreak,
          level_promoted: levelPromoted,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
