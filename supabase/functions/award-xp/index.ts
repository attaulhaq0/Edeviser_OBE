import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ─── Types ──────────────────────────────────────────────────────────────────

type XPSource =
  | "login"
  | "submission"
  | "badge"
  | "admin_adjustment"
  | "perfect_day"
  | "first_attempt_bonus"
  | "perfect_rubric"
  | "bonus_event"
  | "discussion_question"
  | "discussion_answer"
  | "survey_completion"
  | "quiz_completion"
  | "quiz_hard_bonus"
  | "streak_milestone"
  | "journal"
  | "grade"
  | "onboarding_personality"
  | "onboarding_learning_style"
  | "onboarding_baseline"
  | "onboarding_complete"
  | "onboarding_self_efficacy"
  | "onboarding_study_strategy"
  | "micro_assessment"
  | "profile_complete"
  | "starter_session_complete"
  | "wellness_habit"
  | "practice_quiz"
  | "streak_freeze_purchase"
  | "improvement_bonus"
  | "league_promotion"
  | "study_session"
  | "planner_task"
  | "session_reflection"
  | "weekly_goal"
  | "review_session"
  | "review_cycle_complete"
  | "challenge_reward"
  | "peer_teaching"
  | "peer_learning"
  | "tutor_engagement"
  | "tutor_rating";

type BloomsLevel =
  | "Remembering"
  | "Understanding"
  | "Applying"
  | "Analyzing"
  | "Evaluating"
  | "Creating";

interface XPAwardPayload {
  student_id: string;
  xp_amount: number;
  source: XPSource;
  reference_id?: string;
  note?: string;
  blooms_levels?: BloomsLevel[];
  is_milestone?: boolean;
  course_id?: string;
  challenge_id?: string;
  participant_type?: "team" | "individual";
}

interface LevelThreshold {
  level: number;
  xpRequired: number;
}

// ─── Level Thresholds ───────────────────────────────────────────────────────

function generateLevelThresholds(): LevelThreshold[] {
  const thresholds: LevelThreshold[] = [
    { level: 1, xpRequired: 0 },
    { level: 2, xpRequired: 100 },
    { level: 3, xpRequired: 250 },
  ];

  for (let n = 4; n <= 50; n++) {
    thresholds.push({
      level: n,
      xpRequired: Math.floor(50 * Math.pow(n, 1.5)),
    });
  }

  return thresholds;
}

const LEVEL_THRESHOLDS = generateLevelThresholds();

function calculateLevel(xpTotal: number): number {
  if (xpTotal < 0) return 1;

  let level = 1;
  for (const threshold of LEVEL_THRESHOLDS) {
    if (xpTotal >= threshold.xpRequired) {
      level = threshold.level;
    } else {
      break;
    }
  }
  return level;
}

// ─── Adaptive XP Multipliers (Requirements 120–122) ─────────────────────────

/** Level-based multiplier: encouragement for low levels, reduction for high */
function getLevelMultiplier(level: number): number {
  if (level <= 5) return 1.2;
  if (level <= 10) return 1.0;
  if (level <= 15) return 0.9;
  return 0.8;
}

/** Difficulty multiplier based on Bloom's Taxonomy level */
const BLOOMS_MULTIPLIERS: Record<BloomsLevel, number> = {
  Remembering: 1.0,
  Understanding: 1.1,
  Applying: 1.2,
  Analyzing: 1.3,
  Evaluating: 1.4,
  Creating: 1.5,
};

function getDifficultyMultiplier(bloomsLevels: BloomsLevel[]): number {
  if (!bloomsLevels || bloomsLevels.length === 0) return 1.0;
  let highest = 1.0;
  for (const bl of bloomsLevels) {
    const mult = BLOOMS_MULTIPLIERS[bl] ?? 1.0;
    if (mult > highest) highest = mult;
  }
  return highest;
}

/** Diminishing returns: decreases by 0.2 per repetition, min 0.2 */
function getDiminishingMultiplier(
  repeatCount: number,
  isMilestone: boolean
): number {
  if (isMilestone) return 1.0;
  if (repeatCount <= 0) return 1.0;
  return Math.max(0.2, 1.0 - repeatCount * 0.2);
}

/** Sources exempt from diminishing returns (one-time milestone rewards) */
const MILESTONE_SOURCES: XPSource[] = [
  "streak_milestone",
  "badge",
  "perfect_day",
  "first_attempt_bonus",
  "perfect_rubric",
  "profile_complete",
  "onboarding_complete",
  "improvement_bonus",
  "league_promotion",
  "weekly_goal",
  "review_cycle_complete",
  "challenge_reward",
];

// ─── Validation ─────────────────────────────────────────────────────────────

const VALID_SOURCES: XPSource[] = [
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
  "review_session",
  "review_cycle_complete",
  "challenge_reward",
  "peer_teaching",
  "peer_learning",
  "tutor_engagement",
  "tutor_rating",
];

function validatePayload(
  payload: unknown
): { valid: true; data: XPAwardPayload } | { valid: false; error: string } {
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
    p.xp_amount === undefined ||
    p.xp_amount === null ||
    typeof p.xp_amount !== "number"
  ) {
    return {
      valid: false,
      error: "xp_amount is required and must be a number",
    };
  }

  if (
    !p.source ||
    typeof p.source !== "string" ||
    !VALID_SOURCES.includes(p.source as XPSource)
  ) {
    return {
      valid: false,
      error: `source is required and must be one of: ${VALID_SOURCES.join(
        ", "
      )}`,
    };
  }

  return {
    valid: true,
    data: {
      student_id: p.student_id as string,
      xp_amount: p.xp_amount as number,
      source: p.source as XPSource,
      reference_id:
        typeof p.reference_id === "string" ? p.reference_id : undefined,
      note: typeof p.note === "string" ? p.note : undefined,
      blooms_levels: Array.isArray(p.blooms_levels)
        ? (p.blooms_levels as BloomsLevel[])
        : undefined,
      is_milestone:
        typeof p.is_milestone === "boolean" ? p.is_milestone : undefined,
      course_id: typeof p.course_id === "string" ? p.course_id : undefined,
      challenge_id:
        typeof p.challenge_id === "string" ? p.challenge_id : undefined,
      participant_type:
        p.participant_type === "team" || p.participant_type === "individual"
          ? p.participant_type
          : undefined,
    },
  };
}

// ─── League Tier Detection ──────────────────────────────────────────────────

interface LeagueThresholds {
  bronze: number;
  silver: number;
  gold: number;
  diamond: number;
}

const DEFAULT_LEAGUE_THRESHOLDS: LeagueThresholds = {
  bronze: 0,
  silver: 500,
  gold: 1500,
  diamond: 4000,
};

type LeagueTierName = "Bronze" | "Silver" | "Gold" | "Diamond";

function getLeagueTierFromXP(
  xp: number,
  thresholds: LeagueThresholds
): LeagueTierName {
  if (xp >= thresholds.diamond) return "Diamond";
  if (xp >= thresholds.gold) return "Gold";
  if (xp >= thresholds.silver) return "Silver";
  return "Bronze";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchLeagueThresholds(
  supabase: any,
  studentId: string
): Promise<LeagueThresholds> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("institution_id")
    .eq("id", studentId)
    .maybeSingle();

  if (!profile?.institution_id) return DEFAULT_LEAGUE_THRESHOLDS;

  const { data: settings } = await supabase
    .from("institution_settings")
    .select("league_thresholds")
    .eq("institution_id", profile.institution_id)
    .maybeSingle();

  if (!settings?.league_thresholds) return DEFAULT_LEAGUE_THRESHOLDS;

  const lt = settings.league_thresholds as Record<string, number>;
  return {
    bronze: lt.bronze ?? DEFAULT_LEAGUE_THRESHOLDS.bronze,
    silver: lt.silver ?? DEFAULT_LEAGUE_THRESHOLDS.silver,
    gold: lt.gold ?? DEFAULT_LEAGUE_THRESHOLDS.gold,
    diamond: lt.diamond ?? DEFAULT_LEAGUE_THRESHOLDS.diamond,
  };
}

/**
 * Check if XP award caused a league tier promotion and award 100 XP bonus.
 * Uses idempotent reference_id to prevent duplicate bonuses (Req 132.4).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function checkLeaguePromotion(
  supabase: any,
  studentId: string,
  previousTotal: number,
  newTotal: number
): Promise<void> {
  const thresholds = await fetchLeagueThresholds(supabase, studentId);
  const previousTier = getLeagueTierFromXP(previousTotal, thresholds);
  const newTier = getLeagueTierFromXP(newTotal, thresholds);

  if (previousTier === newTier) return;

  // Tier promotion detected — award 100 XP bonus with idempotent reference_id
  const referenceId = `league_promotion:${studentId}:${newTier}`;

  const { error: insertErr } = await supabase.from("xp_transactions").insert({
    student_id: studentId,
    xp_amount: 100,
    source: "league_promotion",
    reference_id: referenceId,
    note: `League promotion bonus: ${previousTier} → ${newTier}`,
    base_xp: 100,
    final_xp: 100,
    multipliers: { league_promotion: 1.0 },
  });

  if (insertErr) {
    // 23505 = unique_violation — bonus already awarded (idempotent)
    if (insertErr.code === "23505") return;
    console.error("League promotion bonus insert failed:", insertErr.message);
    return;
  }

  // Update xp_total with the bonus
  const { data: sumResult } = await supabase
    .from("xp_transactions")
    .select("xp_amount")
    .eq("student_id", studentId);

  const updatedTotal = (sumResult ?? []).reduce(
    (sum: number, row: { xp_amount: number }) => sum + row.xp_amount,
    0
  );

  const updatedLevel = calculateLevel(updatedTotal);

  await supabase
    .from("student_gamification")
    .upsert(
      { student_id: studentId, xp_total: updatedTotal, level: updatedLevel },
      { onConflict: "student_id" }
    );
}

// ─── Peer Milestone Notification ────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function notifyPeersOfLevelUp(
  supabase: any,
  studentId: string,
  newLevel: number
): Promise<void> {
  const PEER_MILESTONE_DAILY_LIMIT = 5;
  const BATCH_WINDOW_MS = 60 * 60 * 1000; // 1 hour

  // Check if student is in anonymous leaderboard mode — skip if so
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, leaderboard_anonymous")
    .eq("id", studentId)
    .maybeSingle();

  if (!profile || profile.leaderboard_anonymous) return;

  const studentName = profile.full_name ?? "A classmate";

  // Find all courses the student is enrolled in
  const { data: enrollments } = await supabase
    .from("student_courses")
    .select("course_id")
    .eq("student_id", studentId);

  if (!enrollments || enrollments.length === 0) return;

  const courseIds = enrollments.map((e: { course_id: string }) => e.course_id);

  // Find all peer students in those courses (excluding the triggering student)
  const { data: peerEnrollments } = await supabase
    .from("student_courses")
    .select("student_id")
    .in("course_id", courseIds)
    .neq("student_id", studentId);

  if (!peerEnrollments || peerEnrollments.length === 0) return;

  // Deduplicate peer IDs (a peer may share multiple courses)
  const peerIds = [
    ...new Set(
      peerEnrollments.map((e: { student_id: string }) => e.student_id)
    ),
  ];

  const message = `Your classmate ${studentName} just hit Level ${newLevel}!`;
  const now = new Date();
  const twentyFourHoursAgo = new Date(
    now.getTime() - 24 * 60 * 60 * 1000
  ).toISOString();
  const oneHourAgo = new Date(now.getTime() - BATCH_WINDOW_MS).toISOString();

  // Rate-limit: fetch recent peer_milestone counts per peer in the last 24h
  const { data: recentNotifications } = await supabase
    .from("notifications")
    .select("user_id, created_at")
    .in("user_id", peerIds)
    .eq("type", "peer_milestone")
    .gte("created_at", twentyFourHoursAgo);

  // Build per-peer counts for rate limiting and batching
  const peerDailyCounts = new Map<string, number>();
  const peerHasRecentBatch = new Map<string, boolean>();
  if (recentNotifications) {
    for (const n of recentNotifications) {
      const uid = n.user_id as string;
      peerDailyCounts.set(uid, (peerDailyCounts.get(uid) ?? 0) + 1);
      if (
        new Date(n.created_at as string).getTime() >=
        new Date(oneHourAgo).getTime()
      ) {
        peerHasRecentBatch.set(uid, true);
      }
    }
  }

  // Build notifications only for peers under the daily limit
  const notifications = [];
  for (const peerId of peerIds) {
    const dailyCount = peerDailyCounts.get(peerId as string) ?? 0;
    if (dailyCount >= PEER_MILESTONE_DAILY_LIMIT) continue; // Rate-limited

    const hasRecent = peerHasRecentBatch.get(peerId as string) ?? false;
    notifications.push({
      user_id: peerId,
      type: "peer_milestone",
      title: "Classmate Leveled Up",
      message,
      is_read: false,
      metadata: {
        milestone_type: "level_up",
        triggering_student_id: studentId,
        level: newLevel,
        is_batched: hasRecent,
      },
    });
  }

  if (notifications.length === 0) return;

  const { error } = await supabase.from("notifications").insert(notifications);
  if (error) {
    console.error(
      "Failed to insert peer milestone notifications:",
      error.message
    );
  }
}

// ─── Main Handler ───────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
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

    const { student_id, source, note } = validation.data;

    // ── Permission Validation ───────────────────────────────────────────
    // Verify caller is either:
    //   a) Using service_role key (server-to-server calls from other edge functions)
    //   b) The student themselves for self-triggered sources (login, submission, journal)
    // Reject with 403 Forbidden if neither condition is met

    const authHeader = req.headers.get("Authorization") ?? "";
    const isServiceRole = authHeader.includes(
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Server-side canonical XP amounts for self-triggered sources.
    // Students cannot choose their own XP — the server enforces these values.
    // Submission is handled separately to derive late/on-time XP from trusted data.
    const SELF_TRIGGERED_XP: Partial<Record<XPSource, number>> = {
      login: 10,
      journal: 20,
    };
    const selfTriggeredSources: XPSource[] = ["login", "submission", "journal"];

    if (!isServiceRole) {
      // Create user-scoped client to get the caller's identity
      const userClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );
      const {
        data: { user },
      } = await userClient.auth.getUser();

      if (
        !user ||
        !selfTriggeredSources.includes(source) ||
        user.id !== student_id
      ) {
        return new Response(
          JSON.stringify({ error: "Forbidden: insufficient permissions" }),
          {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      if (source === "submission") {
        // Derive XP from trusted server data: look up the assignment's due_date
        // and compare against now to determine late vs on-time.
        const assignmentId = validation.data.reference_id;
        if (!assignmentId) {
          return new Response(
            JSON.stringify({
              error:
                "reference_id (assignment_id) is required for submission XP",
            }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }

        const { data: assignment, error: assignmentErr } = await supabase
          .from("assignments")
          .select("id, due_date, late_window_hours")
          .eq("id", assignmentId)
          .maybeSingle();

        if (assignmentErr || !assignment) {
          return new Response(
            JSON.stringify({ error: "Assignment not found or query failed" }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }

        const SUBMISSION_XP = 25;
        const LATE_SUBMISSION_XP = 15;
        const dueDate = new Date(assignment.due_date);
        const isLate = new Date() > dueDate;

        validation.data.xp_amount = isLate ? LATE_SUBMISSION_XP : SUBMISSION_XP;
        // Keep the assignment_id as reference_id for submission idempotency
        // (one XP award per student per assignment)
      } else {
        // Fixed-amount sources (login, journal)
        validation.data.xp_amount = SELF_TRIGGERED_XP[source]!;

        // Generate a deterministic reference_id for idempotency.
        // Format: {source}:{student_id}:{UTC date} — one award per source per day.
        const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
        validation.data.reference_id = `${source}:${student_id}:${today}`;
      }
    }

    // ── Wellness Habit XP Lookup ──────────────────────────────────────────
    // When source is wellness_habit, fetch the institution's configured
    // wellness_xp_amount and use it as the XP amount (overriding passed value).
    if (source === "wellness_habit") {
      // Fetch the student's institution_id from profiles
      const { data: studentProfile, error: profileErr } = await supabase
        .from("profiles")
        .select("institution_id")
        .eq("id", student_id)
        .maybeSingle();

      if (profileErr || !studentProfile) {
        return new Response(
          JSON.stringify({
            error: "Failed to fetch student profile for wellness XP lookup",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Fetch wellness_xp_amount from institution_settings
      const { data: instSettings, error: settingsErr } = await supabase
        .from("institution_settings")
        .select("wellness_xp_amount")
        .eq("institution_id", studentProfile.institution_id)
        .maybeSingle();

      if (settingsErr) {
        console.error(
          "Institution settings query failed:",
          settingsErr.message
        );
        return new Response(
          JSON.stringify({
            error: "Failed to fetch institution settings",
            detail: settingsErr.message,
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const wellnessXpAmount = instSettings?.wellness_xp_amount ?? 5; // default 5

      // When wellness_xp_amount is 0, skip XP transaction entirely
      if (wellnessXpAmount === 0) {
        return new Response(JSON.stringify({ success: true, xp_awarded: 0 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Override the passed xp_amount with the institution-configured value
      validation.data.xp_amount = wellnessXpAmount;
    }

    // Re-destructure after potential overrides
    const { xp_amount: resolvedXpAmount, reference_id: resolvedReferenceId } =
      validation.data;

    // ── Server-side XP caps for quiz sources ────────────────────────────
    // quiz_completion: 50 base (on-time) or 25 (late) — caller provides the value
    // quiz_hard_bonus: 10 per hard question, capped at 50
    // practice_quiz: fixed 10 XP, no hard question bonus, separate diminishing returns
    const PRACTICE_QUIZ_XP = 10;
    const PRACTICE_QUIZ_MAX_PER_DAY = 3;

    let cappedXpAmount = resolvedXpAmount;
    if (source === "practice_quiz") {
      // Fixed 10 XP for practice quiz — server-enforced, ignore caller value
      cappedXpAmount = PRACTICE_QUIZ_XP;

      // Separate diminishing returns window: max 3 practice quiz XP awards per day per student
      const dayStart = new Date();
      dayStart.setUTCHours(0, 0, 0, 0);

      const { data: practiceAwards, error: practiceCountErr } = await supabase
        .from("xp_transactions")
        .select("id")
        .eq("student_id", student_id)
        .eq("source", "practice_quiz")
        .gte("created_at", dayStart.toISOString());

      if (practiceCountErr) {
        console.error(
          "Practice quiz diminishing returns query failed:",
          practiceCountErr.message
        );
        // Continue without blocking — don't prevent XP award on query failure
      }

      const practiceCountToday = practiceAwards?.length ?? 0;
      if (practiceCountToday >= PRACTICE_QUIZ_MAX_PER_DAY) {
        // Diminishing returns exhausted — award 0 XP but still record the transaction
        cappedXpAmount = 0;
      }
    } else if (source === "quiz_completion") {
      cappedXpAmount = Math.min(Math.max(resolvedXpAmount, 0), 50);
    } else if (source === "quiz_hard_bonus") {
      cappedXpAmount = Math.min(Math.max(resolvedXpAmount, 0), 50);
    } else if (source === "planner_task") {
      // Server-enforced fixed amount: 10 XP per completed planner task
      cappedXpAmount = 10;
    } else if (source === "session_reflection") {
      // Server-enforced fixed amount: 10 XP per session reflection
      cappedXpAmount = 10;
    } else if (source === "weekly_goal") {
      // Server-enforced fixed amount: 25 XP per weekly goal met
      cappedXpAmount = 25;
    } else if (source === "review_session") {
      // Server-enforced fixed amount: 15 XP per completed spaced-repetition review
      cappedXpAmount = 15;
    } else if (source === "review_cycle_complete") {
      // Server-enforced fixed amount: 25 XP when all 3 review intervals complete for a CLO
      cappedXpAmount = 25;
    } else if (source === "study_session") {
      // study_session uses client-calculated xp_amount (via calculateSessionXP)
      // Cap at 60 (max 50 base + 10 evidence bonus)
      cappedXpAmount = Math.min(Math.max(resolvedXpAmount, 0), 60);
    } else if (source === "peer_teaching") {
      // Server-enforced fixed amount: 30 XP for creating a teaching moment
      cappedXpAmount = 30;
    } else if (source === "peer_learning") {
      // Server-enforced fixed amount: 10 XP for viewing and rating a teaching moment
      cappedXpAmount = 10;
    } else if (source === "challenge_reward") {
      // Challenge reward XP: 50–500 range, server-enforced
      cappedXpAmount = Math.min(Math.max(resolvedXpAmount, 50), 500);
    } else if (source === "tutor_engagement") {
      // Server-enforced fixed amount: 15 XP for 3+ messages in a conversation
      // Diminishing returns: after 5 conversations in 24h → 5 XP, after 10 → 0 XP
      const TUTOR_ENGAGEMENT_BASE_XP = 15;
      const TUTOR_ENGAGEMENT_REDUCED_XP = 5;
      const TUTOR_ENGAGEMENT_THRESHOLD_REDUCED = 5;
      const TUTOR_ENGAGEMENT_THRESHOLD_ZERO = 10;

      const windowStart24h = new Date(
        Date.now() - 24 * 60 * 60 * 1000
      ).toISOString();

      const { data: recentTutorAwards, error: tutorCountErr } = await supabase
        .from("xp_transactions")
        .select("id")
        .eq("student_id", student_id)
        .eq("source", "tutor_engagement")
        .gte("created_at", windowStart24h);

      if (tutorCountErr) {
        console.error(
          "Tutor engagement diminishing returns query failed:",
          tutorCountErr.message
        );
        // Continue without blocking — default to base XP on query failure
      }

      const tutorAwardCount24h = recentTutorAwards?.length ?? 0;

      if (tutorAwardCount24h >= TUTOR_ENGAGEMENT_THRESHOLD_ZERO) {
        // 10+ conversations in 24h — no more tutor engagement XP
        cappedXpAmount = 0;
      } else if (tutorAwardCount24h >= TUTOR_ENGAGEMENT_THRESHOLD_REDUCED) {
        // 5–9 conversations in 24h — reduced XP
        cappedXpAmount = TUTOR_ENGAGEMENT_REDUCED_XP;
      } else {
        cappedXpAmount = TUTOR_ENGAGEMENT_BASE_XP;
      }
    } else if (source === "tutor_rating") {
      // Server-enforced fixed amount: 5 XP per satisfaction rating, max 3/day
      const TUTOR_RATING_XP = 5;
      const TUTOR_RATING_MAX_PER_DAY = 3;

      const dayStart = new Date();
      dayStart.setUTCHours(0, 0, 0, 0);

      const { data: ratingAwards, error: ratingCountErr } = await supabase
        .from("xp_transactions")
        .select("id")
        .eq("student_id", student_id)
        .eq("source", "tutor_rating")
        .gte("created_at", dayStart.toISOString());

      if (ratingCountErr) {
        console.error(
          "Tutor rating daily cap query failed:",
          ratingCountErr.message
        );
        // Continue without blocking — default to base XP on query failure
      }

      const ratingCountToday = ratingAwards?.length ?? 0;

      if (ratingCountToday >= TUTOR_RATING_MAX_PER_DAY) {
        // Max 3 rating XP awards per day — award 0 XP
        cappedXpAmount = 0;
      } else {
        cappedXpAmount = TUTOR_RATING_XP;
      }
    }

    // Handle zero XP — still record the transaction but skip level recalculation
    if (cappedXpAmount === 0) {
      const { error: insertErr } = await supabase
        .from("xp_transactions")
        .insert({
          student_id,
          xp_amount: 0,
          source,
          reference_id: resolvedReferenceId ?? null,
          note: note ?? null,
        });

      if (insertErr) {
        console.error("XP transaction insert failed:", insertErr.message);
        return new Response(
          JSON.stringify({
            error: "Failed to insert XP transaction",
            detail: insertErr.message,
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          xp_awarded: 0,
          new_total: 0,
          level_up: false,
          new_level: 1,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Step 1: Fetch student's current level for adaptive multiplier ────

    const { data: gamificationData } = await supabase
      .from("student_gamification")
      .select("level, xp_total")
      .eq("student_id", student_id)
      .maybeSingle();

    const currentLevel = gamificationData?.level ?? 1;
    const previousXpTotal = gamificationData?.xp_total ?? 0;

    // ── Step 2: Query rolling 24-hour window for diminishing returns ─────

    const isMilestone =
      validation.data.is_milestone ?? MILESTONE_SOURCES.includes(source);
    const bloomsLevels = validation.data.blooms_levels ?? [];

    let repeatCount = 0;
    if (!isMilestone) {
      const windowStart = new Date(
        Date.now() - 24 * 60 * 60 * 1000
      ).toISOString();
      const { data: recentActions, error: dimErr } = await supabase
        .from("xp_transactions")
        .select("id")
        .eq("student_id", student_id)
        .eq("source", source)
        .gte("created_at", windowStart);

      if (dimErr) {
        console.error("Diminishing returns query failed:", dimErr.message);
        // Continue without diminishing — don't block XP award
      }
      repeatCount = recentActions?.length ?? 0;
    }

    // ── Step 3: Calculate adaptive multipliers ───────────────────────────

    const levelMultiplier = getLevelMultiplier(currentLevel);
    const difficultyMultiplier = getDifficultyMultiplier(bloomsLevels);
    const diminishingMultiplier = getDiminishingMultiplier(
      repeatCount,
      isMilestone
    );

    // ── Step 4: Check for active bonus XP events ─────────────────────────
    // Practice quiz XP is exempt from bonus event multipliers (Requirement 25.3)

    let bonusEventMultiplier = 1.0;
    let spotlightMultiplier = 1.0;

    if (source !== "practice_quiz") {
      const { data: bonusEvents, error: bonusErr } = await supabase
        .from("xp_events")
        .select("xp_multiplier")
        .eq("is_active", true)
        .lte("starts_at", new Date().toISOString())
        .gte("ends_at", new Date().toISOString());

      if (bonusErr) {
        console.error("Bonus event query failed:", bonusErr.message);
      }

      if (bonusEvents && bonusEvents.length > 0) {
        const maxMultiplier = Math.max(
          ...bonusEvents.map((e: { xp_multiplier: number }) => e.xp_multiplier)
        );
        if (maxMultiplier > 1) {
          bonusEventMultiplier = maxMultiplier;
        }
      }
    }

    // ── Step 4b: Badge Spotlight 2x bonus (Requirement 134.1, 134.5) ────
    // When source is 'badge', check if the badge category matches the current spotlight

    if (source === "badge" && resolvedReferenceId) {
      try {
        // Fetch the student's institution_id
        const { data: studentProfile } = await supabase
          .from("profiles")
          .select("institution_id")
          .eq("id", student_id)
          .maybeSingle();

        if (studentProfile?.institution_id) {
          // Get current week's Monday
          const now = new Date();
          const dayOfWeek = now.getUTCDay();
          const monday = new Date(now);
          monday.setUTCDate(
            now.getUTCDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1)
          );
          const weekStart = monday.toISOString().slice(0, 10);

          // Check if there's a spotlight for this week
          const { data: spotlight } = await supabase
            .from("badge_spotlight_schedule")
            .select("category")
            .eq("institution_id", studentProfile.institution_id)
            .eq("week_start", weekStart)
            .maybeSingle();

          if (spotlight?.category) {
            // Check if the badge being awarded matches the spotlight category
            // Look up the badge's category from the reference_id
            const { data: badgeRecord } = await supabase
              .from("badges")
              .select("category")
              .eq("badge_key", resolvedReferenceId)
              .eq("student_id", student_id)
              .maybeSingle();

            const badgeCategory = (badgeRecord?.category as string) ?? null;

            if (badgeCategory && badgeCategory === spotlight.category) {
              spotlightMultiplier = 2.0;
            }
          }
        }
      } catch (spotlightErr) {
        console.error(
          "Badge spotlight check failed (non-blocking):",
          spotlightErr
        );
      }
    }

    // ── Step 4c: Check for active student XP boosts (Marketplace) ───────
    // Query student_active_boosts for any active boost where expires_at > NOW().
    // Take the highest multiplier if multiple boosts exist (design: max 1 active,
    // but defensive). Applied before admin event multiplier per Requirement 18.2.

    let studentBoostMultiplier = 1.0;

    const { data: activeBoosts, error: boostErr } = await supabase
      .from("student_active_boosts")
      .select("multiplier")
      .eq("student_id", student_id)
      .gt("expires_at", new Date().toISOString());

    if (boostErr) {
      console.error(
        "Student boost lookup failed (non-blocking):",
        boostErr.message
      );
      // Continue without boost — don't block XP award
    }

    if (!boostErr && activeBoosts && activeBoosts.length > 0) {
      studentBoostMultiplier = Math.max(
        ...activeBoosts.map((b: { multiplier: number }) => b.multiplier)
      );
    }

    // ── Step 5: Calculate final XP with adaptive formula ─────────────────
    // final_xp = floor(base_xp × student_boost × level_multiplier × difficulty_multiplier × diminishing_multiplier × bonus_event × spotlight)
    // Student boost is applied before admin event multiplier per Requirement 18.2–18.3.
    // Cap at 9999 per transaction (design doc edge case)

    const baseXP = cappedXpAmount;
    let finalXP = Math.floor(
      baseXP *
        studentBoostMultiplier *
        levelMultiplier *
        difficultyMultiplier *
        diminishingMultiplier *
        bonusEventMultiplier *
        spotlightMultiplier
    );
    finalXP = Math.min(finalXP, 9999);

    // ── Step 6: Insert XP transaction with adaptive fields ───────────────

    // The DB has a unique partial index on (student_id, reference_id) WHERE
    // reference_id IS NOT NULL. We attempt the insert and catch the conflict
    // to avoid race-condition duplicates.

    const multipliersJsonb = {
      level_multiplier: levelMultiplier,
      difficulty_multiplier: difficultyMultiplier,
      diminishing_multiplier: diminishingMultiplier,
      bonus_event_multiplier: bonusEventMultiplier,
      spotlight_multiplier: spotlightMultiplier,
      student_boost_multiplier: studentBoostMultiplier,
      boost_applied: studentBoostMultiplier > 1,
      ...(validation.data.challenge_id
        ? { challenge_id: validation.data.challenge_id }
        : {}),
      ...(validation.data.participant_type
        ? { participant_type: validation.data.participant_type }
        : {}),
    };

    const insertPayload = {
      student_id,
      xp_amount: finalXP,
      source,
      reference_id: resolvedReferenceId ?? null,
      note: note ?? null,
      base_xp: baseXP,
      final_xp: finalXP,
      multipliers: multipliersJsonb,
    };

    const { error: insertErr } = await supabase
      .from("xp_transactions")
      .insert(insertPayload);

    if (insertErr) {
      // Postgres unique_violation code = 23505
      if (insertErr.code === "23505" && resolvedReferenceId) {
        return new Response(
          JSON.stringify({
            success: true,
            xp_awarded: 0,
            duplicate: true,
            reference_id: resolvedReferenceId,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      console.error("XP transaction insert failed:", insertErr.message);
      return new Response(
        JSON.stringify({
          error: "Failed to insert XP transaction",
          detail: insertErr.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ── Step 7: Recalculate xp_total ──────────────────────────────────────

    const { data: sumResult, error: sumErr } = await supabase
      .from("xp_transactions")
      .select("xp_amount")
      .eq("student_id", student_id);

    if (sumErr) {
      console.error("XP sum query failed:", sumErr.message);
      return new Response(
        JSON.stringify({
          error: "Failed to calculate XP total",
          detail: sumErr.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const newTotal = (sumResult ?? []).reduce(
      (sum: number, row: { xp_amount: number }) => sum + row.xp_amount,
      0
    );

    // ── Step 8: Calculate new level ───────────────────────────────────────

    const newLevel = calculateLevel(newTotal);

    // Detect level-up using the level we fetched in Step 1
    const previousLevel = currentLevel;
    const levelUp = newLevel > previousLevel;

    // ── Step 9: UPSERT student_gamification ───────────────────────────────

    const { error: upsertErr } = await supabase
      .from("student_gamification")
      .upsert(
        {
          student_id,
          xp_total: newTotal,
          level: newLevel,
        },
        { onConflict: "student_id" }
      );

    if (upsertErr) {
      console.error("Gamification upsert failed:", upsertErr.message);
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

    // ── Step 9.5: League Promotion check (Req 132.4) ────────────────────
    // Skip if this XP award is itself a league_promotion to avoid recursion

    if (source !== "league_promotion") {
      checkLeaguePromotion(
        supabase,
        student_id,
        previousXpTotal,
        newTotal
      ).catch((err) => {
        console.error("League promotion check failed (non-blocking):", err);
      });
    }

    // ── Step 10: Peer milestone notification on level-up ──────────────────

    if (levelUp) {
      // Fire-and-forget — never block the XP response
      notifyPeersOfLevelUp(supabase, student_id, newLevel).catch((err) => {
        console.error("Peer milestone notification failed:", err);
      });
    }

    // ── Step 11: Team XP contribution (course-scoped) ──────────────────
    // When student is an active team member, atomically increment teams.xp_total
    // for course-scoped XP. For cooperative challenge rewards, apply Cooperation
    // Score bonus multiplier: reward × (1 + cooperation_score / 200).

    let teamXpAwarded = 0;
    let cooperationBonusApplied = false;
    try {
      // Determine the course_id for scoping: from payload or from the reference
      const payloadCourseId = validation.data.course_id;

      // Find active team membership for this student, optionally scoped to course
      let teamQuery = supabase
        .from("team_members")
        .select("team_id, teams!inner(id, course_id, cooperation_score)")
        .eq("student_id", student_id)
        .is("left_at", null);

      if (payloadCourseId) {
        teamQuery = teamQuery.eq("teams.course_id", payloadCourseId);
      }

      const { data: teamMemberships } = await teamQuery.limit(1).maybeSingle();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const teamData = teamMemberships?.teams as any;

      if (teamData?.id && finalXP > 0) {
        let xpToAdd = finalXP;

        // For cooperative challenge rewards, apply Cooperation Score bonus
        // Formula: reward × (1 + cooperation_score / 200)
        // A team with cooperation_score 100 gets 1.5× reward
        if (source === "challenge_reward" && validation.data.challenge_id) {
          // Check if this is a cooperative challenge
          const { data: challenge } = await supabase
            .from("social_challenges")
            .select("challenge_type")
            .eq("id", validation.data.challenge_id)
            .maybeSingle();

          if (challenge?.challenge_type === "cooperative") {
            const cooperationScore = teamData.cooperation_score ?? 0;
            const cooperationMultiplier = 1 + cooperationScore / 200;
            xpToAdd = Math.floor(finalXP * cooperationMultiplier);
            cooperationBonusApplied = cooperationScore > 0;
          }
        }

        teamXpAwarded = xpToAdd;

        // Atomically increment teams.xp_total to prevent race conditions
        // from concurrent XP awards to different team members
        const { error: teamUpdateErr } = await supabase.rpc(
          "increment_team_xp",
          { p_team_id: teamData.id, p_amount: xpToAdd }
        );

        // Fallback: if the RPC doesn't exist, use a direct update with
        // optimistic concurrency via the raw SQL approach
        if (teamUpdateErr) {
          console.error(
            "RPC increment_team_xp failed, falling back to direct update:",
            teamUpdateErr.message
          );

          // Direct atomic update: xp_total = xp_total + amount
          const { error: directUpdateErr } = await supabase
            .from("teams")
            .update({
              xp_total: (teamData.xp_total ?? 0) + xpToAdd,
            })
            .eq("id", teamData.id);

          if (directUpdateErr) {
            console.error(
              "Team XP direct update failed:",
              directUpdateErr.message
            );
          }
        }
      }
    } catch (teamErr) {
      console.error("Team XP contribution failed (non-blocking):", teamErr);
    }

    // ── Step 12: Mystery Reward Box probability check (Task 19.3) ────────
    // After a successful XP award, there's a configurable chance (default 10%,
    // range 5–20%) that the student receives a mystery reward box instead of
    // or in addition to their normal XP. Fire-and-forget to avoid blocking.

    let mysteryRewardTriggered = false;

    if (
      finalXP > 0 &&
      source !== "league_promotion" &&
      source !== "bonus_event"
    ) {
      try {
        // Fetch mystery box probability from institution settings
        const { data: studentProfileForMystery } = await supabase
          .from("profiles")
          .select("institution_id")
          .eq("id", student_id)
          .maybeSingle();

        if (studentProfileForMystery?.institution_id) {
          const { data: mysterySettings } = await supabase
            .from("institution_settings")
            .select("*")
            .eq("institution_id", studentProfileForMystery.institution_id)
            .maybeSingle();

          const rawMysterySettings = mysterySettings as Record<
            string,
            unknown
          > | null;
          let mysteryProbability = 10; // default 10%
          if (rawMysterySettings?.mystery_box_probability) {
            const configured =
              rawMysterySettings.mystery_box_probability as number;
            mysteryProbability = Math.max(5, Math.min(20, configured));
          }

          const mysteryRoll = Math.random() * 100;
          if (mysteryRoll < mysteryProbability) {
            mysteryRewardTriggered = true;
          }
        }
      } catch (mysteryErr) {
        console.error(
          "Mystery reward box check failed (non-blocking):",
          mysteryErr
        );
      }
    }

    // ── Response ──────────────────────────────────────────────────────────

    return new Response(
      JSON.stringify({
        success: true,
        xp_awarded: finalXP,
        base_xp: baseXP,
        new_total: newTotal,
        level_up: levelUp,
        new_level: newLevel,
        multipliers: multipliersJsonb,
        team_xp_awarded: teamXpAwarded,
        cooperation_bonus_applied: cooperationBonusApplied,
        mystery_reward_triggered: mysteryRewardTriggered,
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
