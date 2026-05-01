import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ─── Types ──────────────────────────────────────────────────────────────────

type BadgeTrigger =
  | "xp_award"
  | "submission"
  | "streak_update"
  | "grade"
  | "journal"
  | "habit_log"
  | "team_event"
  | "study_session";

interface CheckBadgesPayload {
  student_id: string;
  trigger: BadgeTrigger;
  context?: Record<string, unknown>;
  team_id?: string;
}

interface BadgeDef {
  id: string;
  name: string;
  xpReward: number;
}

// ─── Badge Definitions (server-side only) ───────────────────────────────────
// Duplicated from src/lib/badgeDefinitions.ts for Deno runtime (no npm imports)

const BADGE_XP: Record<string, number> = {
  streak_7: 50,
  streak_14: 75,
  streak_30: 100,
  streak_60: 150,
  streak_100: 250,
  first_submission: 25,
  perfect_score: 75,
  all_clos_met: 100,
  journal_10: 50,
  perfect_week: 100,
  speed_demon: 75,
  night_owl: 75,
  perfectionist: 100,
  habit_master: 100,
  wellness_warrior: 75,
  full_spectrum: 150,
  bloom_explorer: 75,
  bloom_challenger: 100,
  bloom_pioneer: 150,
  // Team badges
  team_spirit: 100,
  unstoppable: 150,
  dream_team: 200,
  study_squad: 100,
  // Improvement badge
  comeback_kid: 100,
  // Rising Star badge (Most Improved top 3 for 2 consecutive weeks)
  rising_star: 100,
  // Study badges (Weekly Planner & Today View)
  study_starter: 25,
  deep_focus: 50,
  weekly_warrior: 100,
  evidence_pro: 75,
};

// ─── Badge Tier Types & Thresholds (Requirement 133) ────────────────────────

type BadgeTier = "bronze" | "silver" | "gold";

interface TierThresholds {
  bronze: number;
  silver: number;
  gold: number;
}

const BADGE_TIER_THRESHOLDS: Record<string, TierThresholds> = {
  academic: { bronze: 5, silver: 15, gold: 30 },
  engagement: { bronze: 10, silver: 25, gold: 50 },
  streak: { bronze: 7, silver: 30, gold: 100 },
  wellness: { bronze: 7, silver: 21, gold: 60 },
  social: { bronze: 3, silver: 10, gold: 25 },
};

const TIER_ORDER: BadgeTier[] = ["bronze", "silver", "gold"];

function getNextTier(currentTier: BadgeTier | null): BadgeTier | null {
  if (currentTier === null) return "bronze";
  if (currentTier === "bronze") return "silver";
  if (currentTier === "silver") return "gold";
  return null; // already at gold
}

function meetsThreshold(metric: number, threshold: number): boolean {
  return metric >= threshold;
}

/**
 * Check if a student should be upgraded to the next badge tier for a category.
 * Returns the new tier if upgrade is warranted, null otherwise.
 * Progression is monotonic: null → bronze → silver → gold (never downgrade).
 */
function checkBadgeTierProgression(
  currentTier: BadgeTier | null,
  category: string,
  metricValue: number
): { shouldUpgrade: boolean; newTier: BadgeTier } | null {
  const thresholds = BADGE_TIER_THRESHOLDS[category];
  if (!thresholds) return null;

  if (currentTier === "gold") return null; // already max

  if (
    currentTier === "silver" &&
    meetsThreshold(metricValue, thresholds.gold)
  ) {
    return { shouldUpgrade: true, newTier: "gold" };
  }
  if (
    currentTier === "bronze" &&
    meetsThreshold(metricValue, thresholds.silver)
  ) {
    return { shouldUpgrade: true, newTier: "silver" };
  }
  if (currentTier === null && meetsThreshold(metricValue, thresholds.bronze)) {
    return { shouldUpgrade: true, newTier: "bronze" };
  }
  return null;
}

// ─── Validation ─────────────────────────────────────────────────────────────

const VALID_TRIGGERS: BadgeTrigger[] = [
  "xp_award",
  "submission",
  "streak_update",
  "grade",
  "journal",
  "habit_log",
  "team_event",
  "study_session",
];

function validatePayload(
  payload: unknown
): { valid: true; data: CheckBadgesPayload } | { valid: false; error: string } {
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

  if (
    !p.trigger ||
    typeof p.trigger !== "string" ||
    !VALID_TRIGGERS.includes(p.trigger as BadgeTrigger)
  ) {
    return {
      valid: false,
      error: `trigger is required and must be one of: ${VALID_TRIGGERS.join(
        ", "
      )}`,
    };
  }

  return {
    valid: true,
    data: {
      student_id: p.student_id as string,
      trigger: p.trigger as BadgeTrigger,
      context:
        p.context && typeof p.context === "object"
          ? (p.context as Record<string, unknown>)
          : undefined,
      team_id:
        p.team_id && typeof p.team_id === "string"
          ? (p.team_id as string)
          : undefined,
    },
  };
}

// ─── Badge Condition Checkers ───────────────────────────────────────────────

interface SupabaseClient {
  from: (table: string) => unknown;
  functions: {
    invoke: (name: string, options: { body: unknown }) => Promise<unknown>;
  };
}

async function checkStreakBadges(
  supabase: ReturnType<typeof createClient>,
  studentId: string,
  existingBadgeIds: Set<string>
): Promise<string[]> {
  const newBadges: string[] = [];

  const { data: gamification } = await supabase
    .from("student_gamification")
    .select("streak_count")
    .eq("student_id", studentId)
    .maybeSingle();

  if (!gamification) return newBadges;

  const streakCount = gamification.streak_count ?? 0;
  const streakBadges: Array<{ id: string; threshold: number }> = [
    { id: "streak_7", threshold: 7 },
    { id: "streak_14", threshold: 14 },
    { id: "streak_30", threshold: 30 },
    { id: "streak_60", threshold: 60 },
    { id: "streak_100", threshold: 100 },
  ];

  for (const badge of streakBadges) {
    if (streakCount >= badge.threshold && !existingBadgeIds.has(badge.id)) {
      newBadges.push(badge.id);
    }
  }

  return newBadges;
}

async function checkAcademicBadges(
  supabase: ReturnType<typeof createClient>,
  studentId: string,
  existingBadgeIds: Set<string>
): Promise<string[]> {
  const newBadges: string[] = [];

  // First Submission badge
  if (!existingBadgeIds.has("first_submission")) {
    const { count } = await supabase
      .from("submissions")
      .select("id", { count: "exact", head: true })
      .eq("student_id", studentId);

    if (count !== null && count >= 1) {
      newBadges.push("first_submission");
    }
  }

  // Perfect Score badge — score 100% on any grade
  if (!existingBadgeIds.has("perfect_score")) {
    const { data: perfectGrades } = await supabase
      .from("grades")
      .select("id, submission_id")
      .eq("score_percent", 100)
      .limit(1);

    if (perfectGrades && perfectGrades.length > 0) {
      // Verify the grade belongs to this student via submission
      const { data: submission } = await supabase
        .from("submissions")
        .select("id")
        .eq("student_id", studentId)
        .in(
          "id",
          perfectGrades.map((g: { submission_id: string }) => g.submission_id)
        )
        .limit(1);

      if (submission && submission.length > 0) {
        newBadges.push("perfect_score");
      }
    }
  }

  // All CLOs Met badge — ≥70% on all CLOs in any course
  if (!existingBadgeIds.has("all_clos_met")) {
    // Get courses the student is enrolled in
    const { data: enrollments } = await supabase
      .from("student_courses")
      .select("course_id")
      .eq("student_id", studentId)
      .eq("status", "active");

    if (enrollments && enrollments.length > 0) {
      for (const enrollment of enrollments) {
        // Get all CLOs for this course
        const { data: clos } = await supabase
          .from("learning_outcomes")
          .select("id")
          .eq("course_id", enrollment.course_id)
          .eq("type", "CLO");

        if (!clos || clos.length === 0) continue;

        // Get attainment for all CLOs in this course for this student
        const { data: attainments } = await supabase
          .from("outcome_attainment")
          .select("outcome_id, attainment_percent")
          .eq("student_id", studentId)
          .eq("course_id", enrollment.course_id)
          .eq("scope", "student_course")
          .in(
            "outcome_id",
            clos.map((c: { id: string }) => c.id)
          );

        if (!attainments || attainments.length < clos.length) continue;

        const allMet = attainments.every(
          (a: { attainment_percent: number }) => a.attainment_percent >= 70
        );

        if (allMet) {
          newBadges.push("all_clos_met");
          break; // Only need one course to qualify
        }
      }
    }
  }

  return newBadges;
}

async function checkEngagementBadges(
  supabase: ReturnType<typeof createClient>,
  studentId: string,
  existingBadgeIds: Set<string>
): Promise<string[]> {
  const newBadges: string[] = [];

  // Journal 10 badge
  if (!existingBadgeIds.has("journal_10")) {
    const { count } = await supabase
      .from("journal_entries")
      .select("id", { count: "exact", head: true })
      .eq("student_id", studentId);

    if (count !== null && count >= 10) {
      newBadges.push("journal_10");
    }
  }

  // Perfect Week badge — all 4 habits for 7 consecutive days
  if (!existingBadgeIds.has("perfect_week")) {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    const startDate = sevenDaysAgo.toISOString().slice(0, 10);

    const { data: habitLogs } = await supabase
      .from("habit_logs")
      .select("date, habit_type")
      .eq("student_id", studentId)
      .gte("date", startDate)
      .not("completed_at", "is", null);

    if (habitLogs && habitLogs.length > 0) {
      // Group by date and check if all 4 habits completed each day
      const habitsByDate = new Map<string, Set<string>>();
      for (const log of habitLogs) {
        const dateStr = log.date as string;
        if (!habitsByDate.has(dateStr)) {
          habitsByDate.set(dateStr, new Set());
        }
        habitsByDate.get(dateStr)!.add(log.habit_type as string);
      }

      // Check for 7 consecutive perfect days
      let consecutivePerfectDays = 0;
      const today = new Date();
      for (let i = 6; i >= 0; i--) {
        const checkDate = new Date(today);
        checkDate.setDate(today.getDate() - i);
        const dateStr = checkDate.toISOString().slice(0, 10);
        const habits = habitsByDate.get(dateStr);
        if (habits && habits.size >= 4) {
          consecutivePerfectDays++;
        } else {
          consecutivePerfectDays = 0;
        }
      }

      if (consecutivePerfectDays >= 7) {
        newBadges.push("perfect_week");
      }
    }
  }

  // Perfect Attendance Week badge — present for all sessions in a 7-day period
  // Requirement 78.7
  if (!existingBadgeIds.has("perfect_attendance_week")) {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    const startDate = sevenDaysAgo.toISOString().slice(0, 10);

    // Get all sessions in the last 7 days for courses the student is enrolled in
    const { data: enrollments } = await supabase
      .from("student_courses")
      .select("course_id")
      .eq("student_id", studentId)
      .eq("status", "active");

    const courseIds = (enrollments ?? []).map(
      (e: { course_id: string }) => e.course_id
    );

    if (courseIds.length > 0) {
      const { data: sections } = await supabase
        .from("course_sections")
        .select("id")
        .in("course_id", courseIds);

      const sectionIds = (sections ?? []).map((s: { id: string }) => s.id);

      if (sectionIds.length > 0) {
        const { data: recentSessions } = await supabase
          .from("class_sessions")
          .select("id")
          .in("section_id", sectionIds)
          .gte("session_date", startDate);

        const sessionIds = (recentSessions ?? []).map(
          (s: { id: string }) => s.id
        );

        if (sessionIds.length > 0) {
          // Check if student was present for ALL sessions
          const { data: attendanceRecords } = await supabase
            .from("attendance_records")
            .select("session_id, status")
            .eq("student_id", studentId)
            .in("session_id", sessionIds)
            .eq("status", "present");

          const presentSessionIds = new Set(
            (attendanceRecords ?? []).map(
              (r: { session_id: string }) => r.session_id
            )
          );

          const allPresent = sessionIds.every((id: string) =>
            presentSessionIds.has(id)
          );
          if (allPresent) {
            newBadges.push("perfect_attendance_week");
          }
        }
      }
    }
  }

  // Quiz Master badge — complete 10 quizzes (task 78.2)
  if (!existingBadgeIds.has("quiz_master")) {
    const { count } = await supabase
      .from("quiz_attempts")
      .select("id", { count: "exact", head: true })
      .eq("student_id", studentId);

    if (count !== null && count >= 10) {
      newBadges.push("quiz_master");
    }
  }

  // Discussion Helper badge — have 5 answers marked correct (task 78.2)
  if (!existingBadgeIds.has("discussion_helper")) {
    const { data: threads } = await supabase
      .from("discussion_threads")
      .select("id")
      .eq("is_resolved", true);

    const threadIds = (threads ?? []).map((t: { id: string }) => t.id);
    if (threadIds.length > 0) {
      const { count } = await supabase
        .from("discussion_replies")
        .select("id", { count: "exact", head: true })
        .eq("author_id", studentId)
        .eq("is_answer", true);

      if (count !== null && count >= 5) {
        newBadges.push("discussion_helper");
      }
    }
  }

  // Survey Completer badge — complete 3 surveys (task 78.2)
  if (!existingBadgeIds.has("survey_completer")) {
    const { count } = await supabase
      .from("survey_responses")
      .select("id", { count: "exact", head: true })
      .eq("respondent_id", studentId);

    if (count !== null && count >= 3) {
      newBadges.push("survey_completer");
    }
  }

  return newBadges;
}

// ─── Mystery Badge Checkers (hidden conditions) ─────────────────────────────

async function checkMysteryBadges(
  supabase: ReturnType<typeof createClient>,
  studentId: string,
  existingBadgeIds: Set<string>
): Promise<string[]> {
  const newBadges: string[] = [];

  // Speed Demon — submit an assignment within 1 hour of it being published
  if (!existingBadgeIds.has("speed_demon")) {
    const { data: submissions } = await supabase
      .from("submissions")
      .select("id, assignment_id, submitted_at")
      .eq("student_id", studentId)
      .order("submitted_at", { ascending: false })
      .limit(50);

    if (submissions && submissions.length > 0) {
      for (const sub of submissions) {
        const { data: assignment } = await supabase
          .from("assignments")
          .select("created_at")
          .eq("id", sub.assignment_id)
          .maybeSingle();

        if (assignment) {
          const publishedAt = new Date(assignment.created_at).getTime();
          const submittedAt = new Date(sub.submitted_at).getTime();
          const diffHours = (submittedAt - publishedAt) / (1000 * 60 * 60);

          if (diffHours >= 0 && diffHours <= 1) {
            newBadges.push("speed_demon");
            break;
          }
        }
      }
    }
  }

  // Night Owl — submit 3 assignments between midnight and 5 AM
  if (!existingBadgeIds.has("night_owl")) {
    const { data: submissions } = await supabase
      .from("submissions")
      .select("submitted_at")
      .eq("student_id", studentId);

    if (submissions && submissions.length > 0) {
      let nightSubmissions = 0;
      for (const sub of submissions) {
        const hour = new Date(sub.submitted_at).getUTCHours();
        if (hour >= 0 && hour < 5) {
          nightSubmissions++;
        }
      }

      if (nightSubmissions >= 3) {
        newBadges.push("night_owl");
      }
    }
  }

  // Perfectionist — score 100% on 5 different assignments
  if (!existingBadgeIds.has("perfectionist")) {
    // Get all student submissions
    const { data: studentSubmissions } = await supabase
      .from("submissions")
      .select("id")
      .eq("student_id", studentId);

    if (studentSubmissions && studentSubmissions.length > 0) {
      const submissionIds = studentSubmissions.map((s: { id: string }) => s.id);

      const { data: perfectGrades } = await supabase
        .from("grades")
        .select("submission_id")
        .eq("score_percent", 100)
        .in("submission_id", submissionIds);

      if (perfectGrades && perfectGrades.length >= 5) {
        newBadges.push("perfectionist");
      }
    }
  }

  return newBadges;
}

// ─── Habit Badge Checkers ────────────────────────────────────────────────────

async function checkHabitBadges(
  supabase: ReturnType<typeof createClient>,
  studentId: string,
  existingBadgeIds: Set<string>
): Promise<string[]> {
  const newBadges: string[] = [];

  const now = new Date();
  const yearStart = `${now.getFullYear()}-01-01`;
  const yearEnd = `${now.getFullYear()}-12-31`;

  let semesterStart = yearStart;
  let semesterEnd = yearEnd;

  const { data: semester } = await supabase
    .from("semesters")
    .select("start_date, end_date")
    .lte("start_date", now.toISOString().slice(0, 10))
    .gte("end_date", now.toISOString().slice(0, 10))
    .maybeSingle();

  if (semester) {
    semesterStart = semester.start_date;
    semesterEnd = semester.end_date;
  }

  if (!existingBadgeIds.has("habit_master")) {
    const { data: academicDays } = await supabase
      .from("habit_tracking")
      .select("habit_date")
      .eq("student_id", studentId)
      .gte("habit_date", semesterStart)
      .lte("habit_date", semesterEnd)
      .or("login.eq.true,submit.eq.true,journal.eq.true,read_content.eq.true");

    const { data: wellnessDays } = await supabase
      .from("wellness_habit_logs")
      .select("date")
      .eq("student_id", studentId)
      .gte("date", semesterStart)
      .lte("date", semesterEnd);

    const activeDates = new Set<string>();
    if (academicDays) {
      for (const row of academicDays) {
        activeDates.add(row.habit_date as string);
      }
    }
    if (wellnessDays) {
      for (const row of wellnessDays) {
        activeDates.add(row.date as string);
      }
    }

    if (activeDates.size >= 30) {
      newBadges.push("habit_master");
    }
  }

  if (!existingBadgeIds.has("wellness_warrior")) {
    const { data: wellnessLogs } = await supabase
      .from("wellness_habit_logs")
      .select("date")
      .eq("student_id", studentId)
      .order("date", { ascending: true });

    if (wellnessLogs && wellnessLogs.length > 0) {
      const distinctDates = [
        ...new Set(wellnessLogs.map((l: { date: string }) => l.date)),
      ].sort() as string[];

      let longestConsecutive = 1;
      let currentConsecutive = 1;

      for (let i = 1; i < distinctDates.length; i++) {
        const prevDate = new Date(distinctDates[i - 1]);
        const currDate = new Date(distinctDates[i]);
        const diffMs = currDate.getTime() - prevDate.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);

        if (diffDays === 1) {
          currentConsecutive++;
          longestConsecutive = Math.max(longestConsecutive, currentConsecutive);
        } else {
          currentConsecutive = 1;
        }
      }

      if (longestConsecutive >= 14) {
        newBadges.push("wellness_warrior");
      }
    }
  }

  if (!existingBadgeIds.has("full_spectrum")) {
    const { data: perfectAcademicDays } = await supabase
      .from("habit_tracking")
      .select("habit_date")
      .eq("student_id", studentId)
      .eq("login", true)
      .eq("submit", true)
      .eq("journal", true)
      .eq("read_content", true)
      .gte("habit_date", semesterStart)
      .lte("habit_date", semesterEnd);

    if (perfectAcademicDays && perfectAcademicDays.length > 0) {
      const perfectDates = new Set(
        perfectAcademicDays.map((d: { habit_date: string }) => d.habit_date)
      );

      const { data: wellnessDates } = await supabase
        .from("wellness_habit_logs")
        .select("date")
        .eq("student_id", studentId)
        .gte("date", semesterStart)
        .lte("date", semesterEnd);

      if (wellnessDates) {
        const wellnessDateSet = new Set(
          wellnessDates.map((d: { date: string }) => d.date)
        );

        let fullSpectrumDays = 0;
        for (const date of perfectDates) {
          if (wellnessDateSet.has(date)) {
            fullSpectrumDays++;
          }
        }

        if (fullSpectrumDays >= 7) {
          newBadges.push("full_spectrum");
        }
      }
    }
  }

  return newBadges;
}

// ─── Comeback Kid Badge Checker (Requirement 123.4) ─────────────────────

async function checkComebackKidBadge(
  supabase: ReturnType<typeof createClient>,
  studentId: string,
  existingBadgeIds: Set<string>
): Promise<string[]> {
  const newBadges: string[] = [];

  if (existingBadgeIds.has("comeback_kid")) return newBadges;

  // Determine current semester date range
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  const { data: semester } = await supabase
    .from("semesters")
    .select("start_date, end_date")
    .lte("start_date", todayStr)
    .gte("end_date", todayStr)
    .maybeSingle();

  if (!semester) return newBadges;

  // Count improvement bonus XP transactions within this semester
  const { data: improvementTxns, error: txnErr } = await supabase
    .from("xp_transactions")
    .select("id")
    .eq("student_id", studentId)
    .eq("source", "improvement_bonus")
    .gte("created_at", semester.start_date)
    .lte("created_at", `${semester.end_date}T23:59:59.999Z`);

  if (txnErr) {
    console.error(
      "Failed to query improvement bonus transactions:",
      txnErr.message
    );
    return newBadges;
  }

  // Award Comeback Kid badge when student earns 3+ improvement bonuses in a semester
  if (improvementTxns && improvementTxns.length >= 3) {
    newBadges.push("comeback_kid");
  }

  return newBadges;
}

// ─── Bloom's Progression Badge Checkers ─────────────────────────────────

async function checkBloomsBadges(
  supabase: ReturnType<typeof createClient>,
  studentId: string,
  existingBadgeIds: Set<string>
): Promise<string[]> {
  const newBadges: string[] = [];

  if (
    existingBadgeIds.has("bloom_explorer") &&
    existingBadgeIds.has("bloom_challenger") &&
    existingBadgeIds.has("bloom_pioneer")
  ) {
    return newBadges;
  }

  const { data: progressions } = await supabase
    .from("blooms_progression")
    .select(
      "bloom_explorer_awarded, bloom_challenger_awarded, bloom_pioneer_awarded"
    )
    .eq("student_id", studentId)
    .or(
      "bloom_explorer_awarded.eq.true,bloom_challenger_awarded.eq.true,bloom_pioneer_awarded.eq.true"
    );

  if (!progressions || progressions.length === 0) return newBadges;

  let hasExplorer = false;
  let hasChallenger = false;
  let hasPioneer = false;

  for (const row of progressions) {
    if (row.bloom_explorer_awarded) hasExplorer = true;
    if (row.bloom_challenger_awarded) hasChallenger = true;
    if (row.bloom_pioneer_awarded) hasPioneer = true;
  }

  if (hasExplorer && !existingBadgeIds.has("bloom_explorer")) {
    newBadges.push("bloom_explorer");
  }
  if (hasChallenger && !existingBadgeIds.has("bloom_challenger")) {
    newBadges.push("bloom_challenger");
  }
  if (hasPioneer && !existingBadgeIds.has("bloom_pioneer")) {
    newBadges.push("bloom_pioneer");
  }

  return newBadges;
}

// ─── Peer Milestone Notification for Rare Badges ────────────────────────────

// ─── Team Badge Checkers ─────────────────────────────────────────────────────

async function checkTeamBadges(
  supabase: ReturnType<typeof createClient>,
  teamId: string,
  existingTeamBadgeIds: Set<string>
): Promise<string[]> {
  const newBadges: string[] = [];

  // Team Spirit: team earns 500 XP
  if (!existingTeamBadgeIds.has("team_spirit")) {
    const { data: gam } = await supabase
      .from("team_gamification")
      .select("xp_total")
      .eq("team_id", teamId)
      .maybeSingle();

    if (gam && (gam.xp_total ?? 0) >= 500) {
      newBadges.push("team_spirit");
    }
  }

  // Unstoppable: team wins 3 challenges
  if (!existingTeamBadgeIds.has("unstoppable")) {
    const { count } = await supabase
      .from("challenge_participants")
      .select("id", { count: "exact", head: true })
      .eq("team_id", teamId)
      .eq("is_winner", true);

    if (count !== null && count >= 3) {
      newBadges.push("unstoppable");
    }
  }

  // Dream Team: all members complete Perfect Day on same day
  if (!existingTeamBadgeIds.has("dream_team")) {
    const { data: members } = await supabase
      .from("team_members")
      .select("student_id")
      .eq("team_id", teamId);

    if (members && members.length >= 2) {
      const memberIds = members.map(
        (m: { student_id: string }) => m.student_id
      );
      const today = new Date().toISOString().slice(0, 10);

      // Check habit_tracking for all 4 habits completed today for each member
      const { data: habitRows } = await supabase
        .from("habit_tracking")
        .select("student_id")
        .in("student_id", memberIds)
        .eq("habit_date", today)
        .eq("login", true)
        .eq("submit", true)
        .eq("journal", true)
        .eq("read_content", true);

      const perfectDayStudents = new Set(
        (habitRows ?? []).map((r: { student_id: string }) => r.student_id)
      );

      const allPerfect = memberIds.every((id: string) =>
        perfectDayStudents.has(id)
      );
      if (allPerfect) {
        newBadges.push("dream_team");
      }
    }
  }

  // Study Squad: team maintains 7-day team streak
  if (!existingTeamBadgeIds.has("study_squad")) {
    const { data: gam } = await supabase
      .from("team_gamification")
      .select("streak_current")
      .eq("team_id", teamId)
      .maybeSingle();

    if (gam && (gam.streak_current ?? 0) >= 7) {
      newBadges.push("study_squad");
    }
  }

  return newBadges;
}

// ─── Team Badge Award Helper ─────────────────────────────────────────────────

async function awardTeamBadges(
  supabase: ReturnType<typeof createClient>,
  teamId: string,
  badgeIds: string[]
): Promise<string[]> {
  const awarded: string[] = [];

  for (const badgeId of badgeIds) {
    // Insert with scope='team' and team_id — idempotent via unique constraint
    const { error: insertErr } = await supabase
      .from("badges")
      .insert({
        badge_key: badgeId,
        badge_name: TEAM_BADGE_NAMES[badgeId] ?? badgeId,
        emoji: TEAM_BADGE_EMOJIS[badgeId] ?? "🏅",
        scope: "team",
        team_id: teamId,
        awarded_at: new Date().toISOString(),
      })
      .select()
      .maybeSingle();

    if (insertErr) {
      if (insertErr.code === "23505") continue; // Already awarded — idempotent
      console.error(
        `Failed to insert team badge ${badgeId}:`,
        insertErr.message
      );
      continue;
    }

    awarded.push(badgeId);

    // Award XP to team pool
    const xpReward = BADGE_XP[badgeId] ?? 0;
    if (xpReward > 0) {
      try {
        await supabase.from("xp_transactions").insert({
          team_id: teamId,
          xp_amount: xpReward,
          source: "badge",
          reference_id: badgeId,
          note: `Team badge earned: ${badgeId}`,
        });

        // Update team_gamification xp_total
        const { data: gam } = await supabase
          .from("team_gamification")
          .select("xp_total")
          .eq("team_id", teamId)
          .maybeSingle();

        if (gam) {
          await supabase
            .from("team_gamification")
            .update({ xp_total: (gam.xp_total ?? 0) + xpReward })
            .eq("team_id", teamId);
        }
      } catch (xpErr) {
        console.error(
          `Failed to award team XP for badge ${badgeId}:`,
          (xpErr as Error).message
        );
      }
    }

    // Notify all team members
    try {
      const { data: members } = await supabase
        .from("team_members")
        .select("student_id")
        .eq("team_id", teamId);

      if (members && members.length > 0) {
        const notifications = members.map((m: { student_id: string }) => ({
          user_id: m.student_id,
          type: "team_badge",
          title: "Team Badge Earned!",
          message: `Your team earned the ${
            TEAM_BADGE_NAMES[badgeId] ?? badgeId
          } badge! ${TEAM_BADGE_EMOJIS[badgeId] ?? "🏅"}`,
          is_read: false,
          metadata: { team_id: teamId, badge_id: badgeId },
        }));

        await supabase.from("notifications").insert(notifications);
      }
    } catch (notifErr) {
      console.error(
        `Failed to notify team of badge ${badgeId}:`,
        (notifErr as Error).message
      );
    }
  }

  return awarded;
}

const TEAM_BADGE_NAMES: Record<string, string> = {
  team_spirit: "Team Spirit",
  unstoppable: "Unstoppable",
  dream_team: "Dream Team",
  study_squad: "Study Squad",
};

const TEAM_BADGE_EMOJIS: Record<string, string> = {
  team_spirit: "🤝",
  unstoppable: "💪",
  dream_team: "⭐",
  study_squad: "📚",
};

// ─── Rising Star Badge Checker (Requirement 130.5) ──────────────────────

async function checkRisingStarBadge(
  supabase: ReturnType<typeof createClient>,
  studentId: string,
  existingBadgeIds: Set<string>
): Promise<string[]> {
  const newBadges: string[] = [];

  if (existingBadgeIds.has("rising_star")) return newBadges;

  // Calculate the Most Improved top 3 for the current and previous week windows.
  // Current window: last 8 weeks split into current 4 weeks vs previous 4 weeks.
  // Previous window: shifted 1 week back (weeks 2-5 vs weeks 6-9 ago).
  const now = new Date();

  const windows = [
    { currentStart: -28, previousStart: -56 }, // current week window
    { currentStart: -35, previousStart: -63 }, // previous week window
  ];

  let consecutiveTop3 = 0;

  for (const window of windows) {
    const currentStart = new Date(now);
    currentStart.setDate(currentStart.getDate() + window.currentStart);
    const previousStart = new Date(now);
    previousStart.setDate(previousStart.getDate() + window.previousStart);
    const currentEnd = new Date(now);
    currentEnd.setDate(currentEnd.getDate() + window.currentStart + 28);

    // Fetch all xp_transactions in the 8-week window
    const { data: transactions, error: txnErr } = await supabase
      .from("xp_transactions")
      .select("student_id, xp_amount, created_at")
      .gte("created_at", previousStart.toISOString())
      .lt("created_at", currentEnd.toISOString());

    if (txnErr || !transactions) continue;

    // Group by student into current and previous 4-week buckets
    const studentMap = new Map<string, { current: number; previous: number }>();

    for (const txn of transactions) {
      const d = new Date(txn.created_at);
      const sid = txn.student_id as string;

      if (!studentMap.has(sid)) {
        studentMap.set(sid, { current: 0, previous: 0 });
      }

      const entry = studentMap.get(sid)!;
      if (d >= currentStart) {
        entry.current += txn.xp_amount;
      } else {
        entry.previous += txn.xp_amount;
      }
    }

    // Calculate improvement and rank
    const ranked = [...studentMap.entries()]
      .filter(([, data]) => data.previous > 0)
      .map(([sid, data]) => ({
        student_id: sid,
        improvement: ((data.current - data.previous) / data.previous) * 100,
      }))
      .sort((a, b) => b.improvement - a.improvement)
      .slice(0, 3);

    const isTop3 = ranked.some((r) => r.student_id === studentId);

    if (isTop3) {
      consecutiveTop3++;
    } else {
      consecutiveTop3 = 0;
    }
  }

  // Award Rising Star if top 3 in both consecutive windows
  if (consecutiveTop3 >= 2) {
    newBadges.push("rising_star");
  }

  return newBadges;
}

// ─── Study Badge Checkers (Weekly Planner & Today View) ─────────────────────

async function checkStudyBadges(
  supabase: ReturnType<typeof createClient>,
  studentId: string,
  existingBadgeIds: Set<string>
): Promise<string[]> {
  const newBadges: string[] = [];

  // Study Starter — first completed study session
  if (!existingBadgeIds.has("study_starter")) {
    const { count } = await supabase
      .from("study_sessions")
      .select("id", { count: "exact", head: true })
      .eq("student_id", studentId)
      .eq("status", "completed");

    if (count !== null && count >= 1) {
      newBadges.push("study_starter");
    }
  }

  // Deep Focus — single session ≥ 60 minutes actual duration
  if (!existingBadgeIds.has("deep_focus")) {
    const { data: longSessions } = await supabase
      .from("study_sessions")
      .select("id")
      .eq("student_id", studentId)
      .eq("status", "completed")
      .gte("actual_duration_minutes", 60)
      .limit(1);

    if (longSessions && longSessions.length > 0) {
      newBadges.push("deep_focus");
    }
  }

  // Weekly Warrior — all 3 goals met in a single week
  if (!existingBadgeIds.has("weekly_warrior")) {
    // Get all weeks where the student has exactly 3 goals
    const { data: weeklyGoals } = await supabase
      .from("weekly_goals")
      .select("id, week_start_date, goal_type, target_value")
      .eq("student_id", studentId);

    if (weeklyGoals && weeklyGoals.length > 0) {
      // Group goals by week_start_date
      const goalsByWeek = new Map<
        string,
        Array<{ goal_type: string; target_value: number }>
      >();
      for (const goal of weeklyGoals) {
        const week = goal.week_start_date as string;
        if (!goalsByWeek.has(week)) {
          goalsByWeek.set(week, []);
        }
        goalsByWeek.get(week)!.push({
          goal_type: goal.goal_type as string,
          target_value: goal.target_value as number,
        });
      }

      // Check each week with exactly 3 goals
      for (const [weekStart, goals] of goalsByWeek) {
        if (goals.length !== 3) continue;

        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        const weekEndStr = weekEnd.toISOString().slice(0, 10);

        let allMet = true;

        for (const goal of goals) {
          let currentValue = 0;

          if (goal.goal_type === "study_hours") {
            // Sum actual_duration_minutes for completed sessions in the week
            const { data: sessions } = await supabase
              .from("study_sessions")
              .select("actual_duration_minutes")
              .eq("student_id", studentId)
              .eq("status", "completed")
              .gte("planned_date", weekStart)
              .lte("planned_date", weekEndStr);

            const totalMinutes = (sessions ?? []).reduce(
              (sum: number, s: { actual_duration_minutes: number | null }) =>
                sum + (s.actual_duration_minutes ?? 0),
              0
            );
            currentValue = totalMinutes / 60; // Convert to hours
          } else if (goal.goal_type === "sessions_completed") {
            const { count } = await supabase
              .from("study_sessions")
              .select("id", { count: "exact", head: true })
              .eq("student_id", studentId)
              .eq("status", "completed")
              .gte("planned_date", weekStart)
              .lte("planned_date", weekEndStr);

            currentValue = count ?? 0;
          } else if (goal.goal_type === "tasks_completed") {
            const { count } = await supabase
              .from("planner_tasks")
              .select("id", { count: "exact", head: true })
              .eq("student_id", studentId)
              .eq("status", "completed")
              .gte("due_date", weekStart)
              .lte("due_date", weekEndStr);

            currentValue = count ?? 0;
          }

          if (currentValue < goal.target_value) {
            allMet = false;
            break;
          }
        }

        if (allMet) {
          newBadges.push("weekly_warrior");
          break; // Only need one qualifying week
        }
      }
    }
  }

  // Evidence Pro — 10 sessions with at least one evidence attachment
  if (!existingBadgeIds.has("evidence_pro")) {
    // Count distinct sessions that have evidence
    const { data: evidenceSessions } = await supabase
      .from("session_evidence")
      .select("session_id")
      .eq("student_id", studentId);

    if (evidenceSessions && evidenceSessions.length > 0) {
      const distinctSessions = new Set(
        evidenceSessions.map((e: { session_id: string }) => e.session_id)
      );

      if (distinctSessions.size >= 10) {
        newBadges.push("evidence_pro");
      }
    }
  }

  return newBadges;
}

// ─── Peer Milestone Notification for Rare Badges (original) ─────────────────

const BADGE_DISPLAY_NAMES: Record<string, string> = {
  streak_30: "30-Day Legend",
  streak_60: "60-Day Legend",
  streak_100: "100-Day Legend",
  speed_demon: "Speed Demon",
  night_owl: "Night Owl",
  perfectionist: "Perfectionist",
  bloom_explorer: "Bloom's Explorer",
  bloom_challenger: "Bloom's Challenger",
  bloom_pioneer: "Bloom's Pioneer",
  comeback_kid: "Comeback Kid",
  rising_star: "Rising Star",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function notifyPeersOfRareBadge(
  supabase: any,
  studentId: string,
  badgeIds: string[]
): Promise<void> {
  const PEER_MILESTONE_DAILY_LIMIT = 5;

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

  // Rate-limit: fetch recent peer_milestone counts per peer in the last 24h
  const twentyFourHoursAgo = new Date(
    Date.now() - 24 * 60 * 60 * 1000
  ).toISOString();
  const { data: recentNotifications } = await supabase
    .from("notifications")
    .select("user_id")
    .in("user_id", peerIds)
    .eq("type", "peer_milestone")
    .gte("created_at", twentyFourHoursAgo);

  const peerDailyCounts = new Map<string, number>();
  if (recentNotifications) {
    for (const n of recentNotifications) {
      const uid = n.user_id as string;
      peerDailyCounts.set(uid, (peerDailyCounts.get(uid) ?? 0) + 1);
    }
  }

  // Create a notification per rare badge per peer (respecting daily limit)
  const notifications = [];
  for (const badgeId of badgeIds) {
    const badgeName = BADGE_DISPLAY_NAMES[badgeId] ?? badgeId;
    const message = `${studentName} just earned the ${badgeName} badge!`;

    for (const peerId of peerIds) {
      const dailyCount = peerDailyCounts.get(peerId as string) ?? 0;
      if (dailyCount >= PEER_MILESTONE_DAILY_LIMIT) continue; // Rate-limited

      notifications.push({
        user_id: peerId,
        type: "peer_milestone",
        title: "Badge Achievement",
        message,
        is_read: false,
        metadata: {
          milestone_type: "rare_badge",
          triggering_student_id: studentId,
          badge_id: badgeId,
          is_batched: false,
        },
      });

      // Increment local count to track across multiple badges in same call
      peerDailyCounts.set(peerId as string, dailyCount + 1);
    }
  }

  if (notifications.length > 0) {
    const { error } = await supabase
      .from("notifications")
      .insert(notifications);
    if (error) {
      console.error(
        "Failed to insert peer badge notifications:",
        error.message
      );
    }
  }
}

// ─── Tiered Badge Progression Checker (Requirement 133) ─────────────────────

async function checkAndUpgradeBadgeTiers(
  supabase: ReturnType<typeof createClient>,
  studentId: string
): Promise<
  Array<{ category: string; oldTier: BadgeTier | null; newTier: BadgeTier }>
> {
  const upgrades: Array<{
    category: string;
    oldTier: BadgeTier | null;
    newTier: BadgeTier;
  }> = [];

  // Fetch student's current tiered badges
  const { data: currentBadges } = await supabase
    .from("badges")
    .select("id, category, tier")
    .eq("student_id", studentId)
    .not("category", "is", null);

  // Build a map of category → current tier
  const categoryTiers = new Map<
    string,
    { id: string; tier: BadgeTier | null }
  >();
  if (currentBadges) {
    for (const badge of currentBadges) {
      const cat = badge.category as string;
      const existing = categoryTiers.get(cat);
      const badgeTier = badge.tier as BadgeTier | null;
      // Keep the highest tier per category
      if (
        !existing ||
        TIER_ORDER.indexOf(badgeTier ?? "bronze") >
          TIER_ORDER.indexOf(existing.tier ?? "bronze")
      ) {
        categoryTiers.set(cat, { id: badge.id as string, tier: badgeTier });
      }
    }
  }

  // Compute metrics per category from student data
  const metrics = await computeCategoryMetrics(supabase, studentId);

  // Check each category for tier progression
  for (const [category, metricValue] of Object.entries(metrics)) {
    const current = categoryTiers.get(category);
    const currentTier = current?.tier ?? null;

    const result = checkBadgeTierProgression(
      currentTier,
      category,
      metricValue
    );
    if (!result || !result.shouldUpgrade) continue;

    if (current?.id) {
      // Update existing badge to new tier
      const { error } = await supabase
        .from("badges")
        .update({ tier: result.newTier })
        .eq("id", current.id);

      if (error) {
        console.error(
          `Failed to upgrade badge tier for ${category}:`,
          error.message
        );
        continue;
      }
    } else {
      // Insert new tiered badge
      const { error } = await supabase.from("badges").insert({
        student_id: studentId,
        badge_key: `tier_${category}_${result.newTier}`,
        badge_name: `${category} ${result.newTier}`,
        emoji: "🏅",
        scope: "individual",
        category,
        tier: result.newTier,
        awarded_at: new Date().toISOString(),
      });

      if (error) {
        if (error.code === "23505") continue; // idempotent
        console.error(
          `Failed to insert tiered badge for ${category}:`,
          error.message
        );
        continue;
      }
    }

    upgrades.push({ category, oldTier: currentTier, newTier: result.newTier });
  }

  return upgrades;
}

async function computeCategoryMetrics(
  supabase: ReturnType<typeof createClient>,
  studentId: string
): Promise<Record<string, number>> {
  const metrics: Record<string, number> = {};

  // Academic: count of submissions
  const { count: submissionCount } = await supabase
    .from("submissions")
    .select("id", { count: "exact", head: true })
    .eq("student_id", studentId);
  metrics.academic = submissionCount ?? 0;

  // Engagement: count of journal entries
  const { count: journalCount } = await supabase
    .from("journal_entries")
    .select("id", { count: "exact", head: true })
    .eq("student_id", studentId);
  metrics.engagement = journalCount ?? 0;

  // Streak: current streak count
  const { data: gamification } = await supabase
    .from("student_gamification")
    .select("streak_count")
    .eq("student_id", studentId)
    .maybeSingle();
  metrics.streak = gamification?.streak_count ?? 0;

  // Wellness: count of wellness habit log days
  const { count: wellnessCount } = await supabase
    .from("wellness_habit_logs")
    .select("id", { count: "exact", head: true })
    .eq("student_id", studentId);
  metrics.wellness = wellnessCount ?? 0;

  // Social: count of discussion replies
  const { count: socialCount } = await supabase
    .from("discussion_replies")
    .select("id", { count: "exact", head: true })
    .eq("author_id", studentId);
  metrics.social = socialCount ?? 0;

  return metrics;
}

// ─── Main Handler ───────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ── Auth: require service role or teacher/admin ──────────────────
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

    const { student_id, trigger, team_id } = validation.data;

    // ── Step 1: Fetch existing badges for this student ──────────────────

    const { data: existingBadges, error: fetchErr } = await supabase
      .from("student_badges")
      .select("badge_id")
      .eq("student_id", student_id);

    if (fetchErr) {
      console.error("Failed to fetch existing badges:", fetchErr.message);
      return new Response(
        JSON.stringify({
          error: "Failed to fetch existing badges",
          detail: fetchErr.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const existingBadgeIds = new Set(
      (existingBadges ?? []).map((b: { badge_id: string }) => b.badge_id)
    );

    // ── Step 2: Check badge conditions based on trigger ─────────────────

    const newBadgeIds: string[] = [];

    // Streak badges — check on streak_update or xp_award
    if (trigger === "streak_update" || trigger === "xp_award") {
      const streakBadges = await checkStreakBadges(
        supabase,
        student_id,
        existingBadgeIds
      );
      newBadgeIds.push(...streakBadges);
    }

    // Academic badges — check on submission, grade
    if (trigger === "submission" || trigger === "grade") {
      const academicBadges = await checkAcademicBadges(
        supabase,
        student_id,
        existingBadgeIds
      );
      newBadgeIds.push(...academicBadges);
    }

    // Engagement badges — check on journal, xp_award
    if (trigger === "journal" || trigger === "xp_award") {
      const engagementBadges = await checkEngagementBadges(
        supabase,
        student_id,
        existingBadgeIds
      );
      newBadgeIds.push(...engagementBadges);
    }

    // Habit badges — check on habit_log trigger
    if (trigger === "habit_log") {
      const habitBadges = await checkHabitBadges(
        supabase,
        student_id,
        existingBadgeIds
      );
      newBadgeIds.push(...habitBadges);
    }

    // Mystery badges — always check on any trigger
    const mysteryBadges = await checkMysteryBadges(
      supabase,
      student_id,
      existingBadgeIds
    );
    newBadgeIds.push(...mysteryBadges);

    // Bloom's progression badges — check on grade or submission (quiz attempt completion)
    if (trigger === "grade" || trigger === "submission") {
      const bloomsBadges = await checkBloomsBadges(
        supabase,
        student_id,
        existingBadgeIds
      );
      newBadgeIds.push(...bloomsBadges);
    }

    // Comeback Kid badge — check on xp_award (improvement bonus triggers xp_award)
    if (trigger === "xp_award") {
      const comebackKidBadges = await checkComebackKidBadge(
        supabase,
        student_id,
        existingBadgeIds
      );
      newBadgeIds.push(...comebackKidBadges);

      // Rising Star badge — check on xp_award (top 3 Most Improved for 2 consecutive weeks)
      const risingStarBadges = await checkRisingStarBadge(
        supabase,
        student_id,
        existingBadgeIds
      );
      newBadgeIds.push(...risingStarBadges);
    }

    // Study badges — check on study_session trigger
    if (trigger === "study_session") {
      const studyBadges = await checkStudyBadges(
        supabase,
        student_id,
        existingBadgeIds
      );
      newBadgeIds.push(...studyBadges);
    }

    // ── Step 2b: Check team badges if team_event trigger ────────────────

    let teamBadgesAwarded: string[] = [];

    if (trigger === "team_event" && team_id) {
      // Fetch existing team badges
      const { data: existingTeamBadges } = await supabase
        .from("badges")
        .select("badge_key")
        .eq("team_id", team_id)
        .eq("scope", "team");

      const existingTeamBadgeIds = new Set(
        (existingTeamBadges ?? []).map(
          (b: { badge_key: string }) => b.badge_key
        )
      );

      const newTeamBadgeIds = await checkTeamBadges(
        supabase,
        team_id,
        existingTeamBadgeIds
      );

      if (newTeamBadgeIds.length > 0) {
        teamBadgesAwarded = await awardTeamBadges(
          supabase,
          team_id,
          newTeamBadgeIds
        );
      }
    }

    // ── Step 3: Insert new badges idempotently ──────────────────────────

    const awardedBadges: string[] = [];

    for (const badgeId of newBadgeIds) {
      const { error: insertErr } = await supabase
        .from("student_badges")
        .insert({
          student_id,
          badge_id: badgeId,
          awarded_at: new Date().toISOString(),
        })
        .select()
        .maybeSingle();

      // If insert fails due to unique constraint, badge already exists — skip
      if (insertErr) {
        if (insertErr.code === "23505") {
          // Unique violation — idempotent, badge already awarded
          continue;
        }
        console.error(`Failed to insert badge ${badgeId}:`, insertErr.message);
        continue;
      }

      awardedBadges.push(badgeId);

      // Award badge XP
      const xpReward = BADGE_XP[badgeId] ?? 0;
      if (xpReward > 0) {
        try {
          await supabase.functions.invoke("award-xp", {
            body: {
              student_id,
              xp_amount: xpReward,
              source: "badge",
              reference_id: badgeId,
              note: `Badge earned: ${badgeId}`,
            },
          });
        } catch (xpErr) {
          // Log but don't fail badge award
          console.error(
            `Failed to award XP for badge ${badgeId}:`,
            (xpErr as Error).message
          );
        }
      }
    }

    // ── Step 3b: Check tiered badge progression (Requirement 133) ──────

    let tierUpgrades: Array<{
      category: string;
      oldTier: BadgeTier | null;
      newTier: BadgeTier;
    }> = [];
    try {
      tierUpgrades = await checkAndUpgradeBadgeTiers(supabase, student_id);

      // Award XP for tier upgrades
      for (const upgrade of tierUpgrades) {
        const tierXP =
          upgrade.newTier === "gold"
            ? 100
            : upgrade.newTier === "silver"
            ? 75
            : 50;
        try {
          await supabase.functions.invoke("award-xp", {
            body: {
              student_id,
              xp_amount: tierXP,
              source: "badge",
              reference_id: `tier_upgrade:${upgrade.category}:${upgrade.newTier}`,
              note: `Badge tier upgrade: ${upgrade.category} → ${upgrade.newTier}`,
            },
          });
        } catch (xpErr) {
          console.error(
            `Failed to award tier upgrade XP:`,
            (xpErr as Error).message
          );
        }
      }
    } catch (tierErr) {
      console.error("Tiered badge check failed (non-blocking):", tierErr);
    }

    // ── Step 4: Notify peers of rare badge awards ─────────────────────

    const RARE_BADGES = new Set([
      "streak_30",
      "streak_60",
      "streak_100",
      "speed_demon",
      "night_owl",
      "perfectionist",
      "bloom_explorer",
      "bloom_challenger",
      "bloom_pioneer",
      "rising_star",
    ]);

    const rareBadgesAwarded = awardedBadges.filter((b) => RARE_BADGES.has(b));
    if (rareBadgesAwarded.length > 0) {
      notifyPeersOfRareBadge(supabase, student_id, rareBadgesAwarded).catch(
        (err) => {
          console.error("Peer badge notification failed:", err);
        }
      );
    }

    // ── Step 5: Get total badge count ───────────────────────────────────

    const totalBadges = existingBadgeIds.size + awardedBadges.length;

    // ── Response ────────────────────────────────────────────────────────

    return new Response(
      JSON.stringify({
        success: true,
        new_badges: awardedBadges,
        total_badges: totalBadges,
        team_badges_awarded: teamBadgesAwarded,
        tier_upgrades: tierUpgrades,
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
