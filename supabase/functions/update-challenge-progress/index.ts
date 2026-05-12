// update-challenge-progress Edge Function
// Tasks 2.3–2.6: Accept event triggers, compute progress per challenge type,
// detect completion and trigger rewards, ensure idempotency via recomputation.
//
// Receives POST { event_type, student_id, course_id, metadata }
// - event_type: 'grade' | 'habit' | 'xp' — the triggering event category
// - student_id: UUID of the student who triggered the event
// - course_id: UUID of the course context
// - metadata: optional object with extra context (e.g., blooms_level)
//
// Progress computation by challenge type:
//   academic  → COUNT of graded assignments for the student in the course during challenge period
//   habit     → Current consecutive streak days during the challenge period
//   xp_race   → Total XP earned within the course during the challenge period
//   blooms_climb → COUNT of distinct Bloom's levels achieved via graded assignments
//   cooperative  → SUM of all team members' progress toward the shared goal
//
// Idempotency: progress is recomputed from source data (not incremented),
// so reprocessing the same event produces the same result. Completion reward
// uses the reward_granted flag to prevent double-awarding.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ─── Types ──────────────────────────────────────────────────────────────────

type EventType = "grade" | "habit" | "xp";

type ChallengeType =
  | "academic"
  | "habit"
  | "xp_race"
  | "blooms_climb"
  | "cooperative";

interface UpdateProgressPayload {
  event_type: EventType;
  student_id: string;
  course_id: string;
  metadata?: Record<string, unknown>;
}

interface ActiveChallenge {
  id: string;
  challenge_type: ChallengeType;
  participation_mode: "team" | "individual";
  goal_target: number;
  start_date: string;
  end_date: string;
  reward_xp: number;
  reward_badge_id: string | null;
  course_id: string;
}

interface ChallengeProgressRecord {
  id: string;
  challenge_id: string;
  participant_type: "team" | "individual";
  participant_id: string;
  current_progress: number;
  completed_at: string | null;
  reward_granted: boolean;
}

// ─── Event-to-Challenge-Type Mapping ────────────────────────────────────────
// Maps which event types can affect which challenge types.
// grade events affect: academic, blooms_climb, cooperative (when underlying metric is academic)
// habit events affect: habit, cooperative (when underlying metric is habit)
// xp events affect: xp_race, cooperative (when underlying metric is xp)

function getMatchingChallengeTypes(eventType: EventType): ChallengeType[] {
  switch (eventType) {
    case "grade":
      return ["academic", "blooms_climb", "cooperative"];
    case "habit":
      return ["habit", "cooperative"];
    case "xp":
      return ["xp_race", "cooperative"];
    default:
      return [];
  }
}

// ─── Validation ─────────────────────────────────────────────────────────────

const VALID_EVENT_TYPES: EventType[] = ["grade", "habit", "xp"];

function validatePayload(
  payload: unknown
):
  | { valid: true; data: UpdateProgressPayload }
  | { valid: false; error: string } {
  if (!payload || typeof payload !== "object") {
    return { valid: false, error: "Request body must be a JSON object" };
  }

  const p = payload as Record<string, unknown>;

  if (
    !p.event_type ||
    typeof p.event_type !== "string" ||
    !VALID_EVENT_TYPES.includes(p.event_type as EventType)
  ) {
    return {
      valid: false,
      error: `event_type is required and must be one of: ${VALID_EVENT_TYPES.join(
        ", "
      )}`,
    };
  }

  if (!p.student_id || typeof p.student_id !== "string") {
    return {
      valid: false,
      error: "student_id is required and must be a string",
    };
  }

  if (!p.course_id || typeof p.course_id !== "string") {
    return {
      valid: false,
      error: "course_id is required and must be a string",
    };
  }

  return {
    valid: true,
    data: {
      event_type: p.event_type as EventType,
      student_id: p.student_id as string,
      course_id: p.course_id as string,
      metadata:
        p.metadata && typeof p.metadata === "object"
          ? (p.metadata as Record<string, unknown>)
          : undefined,
    },
  };
}

// ─── Progress Computation Functions ─────────────────────────────────────────
// Each function recomputes progress from source data (idempotent).

/**
 * Academic: COUNT of graded assignments for the student in the course
 * during the challenge period.
 */
// deno-lint-ignore no-explicit-any
async function computeAcademicProgress(
  supabase: any,
  studentId: string,
  courseId: string,
  startDate: string,
  endDate: string
): Promise<number> {
  const { data, error } = await supabase
    .from("submissions")
    .select("id", { count: "exact" })
    .eq("student_id", studentId)
    .eq("status", "graded")
    .gte("graded_at", startDate)
    .lte("graded_at", endDate)
    .in(
      "assignment_id",
      supabase.from("assignments").select("id").eq("course_id", courseId)
    );

  if (error) {
    // Fallback: query with a join approach
    const { data: submissions, error: fallbackErr } = await supabase
      .from("submissions")
      .select("id, assignments!inner(course_id)")
      .eq("student_id", studentId)
      .eq("status", "graded")
      .eq("assignments.course_id", courseId)
      .gte("graded_at", startDate)
      .lte("graded_at", endDate);

    if (fallbackErr) {
      console.error("Academic progress query failed:", fallbackErr.message);
      return 0;
    }
    return submissions?.length ?? 0;
  }

  return data?.length ?? 0;
}

/**
 * Habit: Current consecutive streak days maintained during the challenge period.
 * We look at habit_logs for the student during the challenge window and count
 * the current consecutive streak of days with at least one log entry.
 */
// deno-lint-ignore no-explicit-any
async function computeHabitProgress(
  supabase: any,
  studentId: string,
  _courseId: string,
  startDate: string,
  endDate: string
): Promise<number> {
  // Get all distinct dates with habit logs during the challenge period
  const { data: logs, error } = await supabase
    .from("habit_logs")
    .select("log_date")
    .eq("student_id", studentId)
    .gte("log_date", startDate.slice(0, 10))
    .lte("log_date", endDate.slice(0, 10))
    .order("log_date", { ascending: false });

  if (error) {
    console.error("Habit progress query failed:", error.message);
    return 0;
  }

  if (!logs || logs.length === 0) return 0;

  // Get unique dates
  const uniqueDates = [
    ...new Set(logs.map((l: { log_date: string }) => l.log_date)),
  ].sort((a, b) => (b as string).localeCompare(a as string));

  // Count consecutive days from the most recent date backwards
  let streak = 1;
  for (let i = 1; i < uniqueDates.length; i++) {
    const current = new Date(uniqueDates[i] as string);
    const previous = new Date(uniqueDates[i - 1] as string);
    const diffDays = Math.round(
      (previous.getTime() - current.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (diffDays === 1) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

/**
 * XP Race: Total XP earned within the course during the challenge period.
 */
// deno-lint-ignore no-explicit-any
async function computeXpRaceProgress(
  supabase: any,
  studentId: string,
  courseId: string,
  startDate: string,
  endDate: string
): Promise<number> {
  const { data: transactions, error } = await supabase
    .from("xp_transactions")
    .select("xp_amount")
    .eq("student_id", studentId)
    .eq("course_id", courseId)
    .gte("created_at", startDate)
    .lte("created_at", endDate);

  if (error) {
    console.error("XP Race progress query failed:", error.message);
    return 0;
  }

  return (transactions ?? []).reduce(
    (sum: number, t: { xp_amount: number }) => sum + (t.xp_amount ?? 0),
    0
  );
}

/**
 * Bloom's Climb: COUNT of distinct Bloom's levels achieved via graded assignments.
 * Each CLO has exactly one Bloom's level. We count distinct levels from graded
 * submissions during the challenge period.
 */
// deno-lint-ignore no-explicit-any
async function computeBloomsClimbProgress(
  supabase: any,
  studentId: string,
  courseId: string,
  startDate: string,
  endDate: string
): Promise<number> {
  // Get graded submissions for the student in this course during the challenge period
  const { data: submissions, error } = await supabase
    .from("submissions")
    .select("assignment_id, assignments!inner(course_id, clo_ids)")
    .eq("student_id", studentId)
    .eq("status", "graded")
    .eq("assignments.course_id", courseId)
    .gte("graded_at", startDate)
    .lte("graded_at", endDate);

  if (error) {
    console.error("Blooms Climb progress query failed:", error.message);
    return 0;
  }

  if (!submissions || submissions.length === 0) return 0;

  // Collect all CLO IDs from graded assignments
  const cloIds = new Set<string>();
  for (const sub of submissions) {
    // deno-lint-ignore no-explicit-any
    const assignment = sub.assignments as any;
    const ids = assignment?.clo_ids;
    if (Array.isArray(ids)) {
      for (const id of ids) {
        cloIds.add(id);
      }
    }
  }

  if (cloIds.size === 0) return 0;

  // Fetch the Bloom's levels for these CLOs
  const { data: clos, error: cloErr } = await supabase
    .from("learning_outcomes")
    .select("id, blooms_level")
    .eq("type", "clo")
    .in("id", [...cloIds]);

  if (cloErr) {
    console.error("CLO Bloom's level query failed:", cloErr.message);
    return 0;
  }

  // Count distinct Bloom's levels
  const distinctLevels = new Set(
    (clos ?? [])
      .map((c: { blooms_level: string | null }) => c.blooms_level)
      .filter(Boolean)
  );

  return distinctLevels.size;
}

/**
 * Cooperative: SUM of all team members' individual progress toward the shared goal.
 * For cooperative challenges, the participant is the team, and progress is the
 * collective team total. The underlying metric depends on what the cooperative
 * challenge is tracking — we use XP earned by all team members as the default.
 */
// deno-lint-ignore no-explicit-any
async function computeCooperativeProgress(
  supabase: any,
  teamId: string,
  courseId: string,
  startDate: string,
  endDate: string
): Promise<number> {
  // Get all active team members
  const { data: members, error: membersErr } = await supabase
    .from("team_members")
    .select("student_id")
    .eq("team_id", teamId)
    .is("left_at", null);

  if (membersErr || !members || members.length === 0) {
    console.error(
      "Cooperative progress: team members query failed:",
      membersErr?.message
    );
    return 0;
  }

  const memberIds = members.map((m: { student_id: string }) => m.student_id);

  // Sum XP earned by all team members in this course during the challenge period
  const { data: transactions, error: xpErr } = await supabase
    .from("xp_transactions")
    .select("xp_amount")
    .in("student_id", memberIds)
    .eq("course_id", courseId)
    .gte("created_at", startDate)
    .lte("created_at", endDate);

  if (xpErr) {
    console.error("Cooperative progress XP query failed:", xpErr.message);
    return 0;
  }

  return (transactions ?? []).reduce(
    (sum: number, t: { xp_amount: number }) => sum + (t.xp_amount ?? 0),
    0
  );
}

// ─── Reward Distribution ────────────────────────────────────────────────────

/**
 * Triggers reward distribution via the award-xp Edge Function.
 * For team challenges, calls award-xp for EACH team member individually.
 * Uses the reward_granted flag to prevent double-awarding.
 */
// deno-lint-ignore no-explicit-any
async function distributeReward(
  supabase: any,
  challenge: ActiveChallenge,
  progressRecord: ChallengeProgressRecord
): Promise<void> {
  // Already rewarded — skip (idempotency)
  if (progressRecord.reward_granted) return;

  if (progressRecord.participant_type === "team") {
    // For team challenges: award XP to EACH team member individually
    const { data: members, error: membersErr } = await supabase
      .from("team_members")
      .select("student_id")
      .eq("team_id", progressRecord.participant_id)
      .is("left_at", null);

    if (membersErr || !members || members.length === 0) {
      console.error(
        "Reward distribution: failed to fetch team members:",
        membersErr?.message
      );
      return;
    }

    for (const member of members) {
      try {
        await supabase.functions.invoke("award-xp", {
          body: {
            student_id: member.student_id,
            xp_amount: challenge.reward_xp,
            source: "challenge_reward",
            reference_id: `challenge_reward:${challenge.id}:${member.student_id}`,
            note: `Challenge reward: ${challenge.id}`,
            course_id: challenge.course_id,
            challenge_id: challenge.id,
            participant_type: "team",
          },
        });
      } catch (err) {
        console.error(
          `Reward distribution failed for member ${member.student_id}:`,
          err
        );
      }
    }
  } else {
    // Individual challenge: award XP to the participant directly
    try {
      await supabase.functions.invoke("award-xp", {
        body: {
          student_id: progressRecord.participant_id,
          xp_amount: challenge.reward_xp,
          source: "challenge_reward",
          reference_id: `challenge_reward:${challenge.id}:${progressRecord.participant_id}`,
          note: `Challenge reward: ${challenge.id}`,
          course_id: challenge.course_id,
          challenge_id: challenge.id,
          participant_type: "individual",
        },
      });
    } catch (err) {
      console.error(
        `Reward distribution failed for individual ${progressRecord.participant_id}:`,
        err
      );
    }
  }

  // Mark reward as granted (idempotency flag)
  const { error: updateErr } = await supabase
    .from("challenge_progress")
    .update({ reward_granted: true })
    .eq("id", progressRecord.id);

  if (updateErr) {
    console.error("Failed to set reward_granted flag:", updateErr.message);
  }
}

// ─── Main Handler ───────────────────────────────────────────────────────────

serve(async (req) => {
  // Handle CORS preflight
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

    const { event_type, student_id, course_id } = validation.data;

    // Determine which challenge types this event can affect
    const matchingTypes = getMatchingChallengeTypes(event_type);

    if (matchingTypes.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No matching challenge types for this event",
          challenges_updated: 0,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Query active challenges for this course matching the event type
    const now = new Date().toISOString();
    const { data: challenges, error: chalErr } = await supabase
      .from("social_challenges")
      .select(
        "id, challenge_type, participation_mode, goal_target, start_date, end_date, reward_xp, reward_badge_id, course_id"
      )
      .eq("course_id", course_id)
      .eq("status", "active")
      .lte("start_date", now)
      .gte("end_date", now)
      .in("challenge_type", matchingTypes);

    if (chalErr) {
      console.error("Active challenges query failed:", chalErr.message);
      return new Response(
        JSON.stringify({
          error: "Failed to query active challenges",
          detail: chalErr.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!challenges || challenges.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No active challenges found for this course and event type",
          challenges_updated: 0,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let challengesUpdated = 0;
    let completionsTriggered = 0;

    // Process each matching challenge
    for (const challenge of challenges as ActiveChallenge[]) {
      try {
        // Determine the participant ID and type
        let participantId = student_id;
        let participantType: "team" | "individual" =
          challenge.participation_mode === "team" ? "team" : "individual";

        if (challenge.participation_mode === "team") {
          // Find the student's active team in this course
          const { data: membership } = await supabase
            .from("team_members")
            .select("team_id, teams!inner(id, course_id)")
            .eq("student_id", student_id)
            .eq("teams.course_id", course_id)
            .is("left_at", null)
            .limit(1)
            .maybeSingle();

          if (!membership) {
            // Student is not on a team in this course — skip this challenge
            continue;
          }

          participantId = membership.team_id;
          participantType = "team";
        }

        // Get or create the challenge_progress record
        let { data: progressRecord, error: progressErr } = await supabase
          .from("challenge_progress")
          .select("*")
          .eq("challenge_id", challenge.id)
          .eq("participant_id", participantId)
          .maybeSingle();

        if (progressErr) {
          console.error(
            `Progress record query failed for challenge ${challenge.id}:`,
            progressErr.message
          );
          continue;
        }

        // If no progress record exists, create one (auto-enrollment)
        if (!progressRecord) {
          const { data: newRecord, error: insertErr } = await supabase
            .from("challenge_progress")
            .insert({
              challenge_id: challenge.id,
              participant_type: participantType,
              participant_id: participantId,
              current_progress: 0,
              reward_granted: false,
            })
            .select()
            .single();

          if (insertErr) {
            // Handle unique constraint violation (concurrent insert)
            if (insertErr.code === "23505") {
              const { data: existingRecord } = await supabase
                .from("challenge_progress")
                .select("*")
                .eq("challenge_id", challenge.id)
                .eq("participant_id", participantId)
                .maybeSingle();
              progressRecord = existingRecord;
            } else {
              console.error(
                `Progress record insert failed for challenge ${challenge.id}:`,
                insertErr.message
              );
              continue;
            }
          } else {
            progressRecord = newRecord;
          }
        }

        if (!progressRecord) continue;

        // Skip if already completed and rewarded
        if (progressRecord.completed_at && progressRecord.reward_granted) {
          continue;
        }

        // ── Compute current progress (idempotent — recomputed from source data) ──
        let computedProgress = 0;

        if (challenge.challenge_type === "cooperative") {
          // Cooperative: collective team progress
          if (participantType === "team") {
            computedProgress = await computeCooperativeProgress(
              supabase,
              participantId,
              course_id,
              challenge.start_date,
              challenge.end_date
            );
          }
        } else {
          // For non-cooperative challenges, compute based on challenge type
          switch (challenge.challenge_type) {
            case "academic":
              computedProgress = await computeAcademicProgress(
                supabase,
                participantType === "team" ? student_id : participantId,
                course_id,
                challenge.start_date,
                challenge.end_date
              );
              break;

            case "habit":
              computedProgress = await computeHabitProgress(
                supabase,
                participantType === "team" ? student_id : participantId,
                course_id,
                challenge.start_date,
                challenge.end_date
              );
              break;

            case "xp_race":
              computedProgress = await computeXpRaceProgress(
                supabase,
                participantType === "team" ? student_id : participantId,
                course_id,
                challenge.start_date,
                challenge.end_date
              );
              break;

            case "blooms_climb":
              computedProgress = await computeBloomsClimbProgress(
                supabase,
                participantType === "team" ? student_id : participantId,
                course_id,
                challenge.start_date,
                challenge.end_date
              );
              break;
          }

          // For team challenges with non-cooperative types, if participation_mode
          // is "team", we need to aggregate across all team members
          if (
            participantType === "team" &&
            challenge.challenge_type !== "cooperative"
          ) {
            // Get all active team members
            const { data: members } = await supabase
              .from("team_members")
              .select("student_id")
              .eq("team_id", participantId)
              .is("left_at", null);

            if (members && members.length > 0) {
              let teamTotal = 0;
              for (const member of members) {
                let memberProgress = 0;
                switch (challenge.challenge_type) {
                  case "academic":
                    memberProgress = await computeAcademicProgress(
                      supabase,
                      member.student_id,
                      course_id,
                      challenge.start_date,
                      challenge.end_date
                    );
                    break;
                  case "habit":
                    memberProgress = await computeHabitProgress(
                      supabase,
                      member.student_id,
                      course_id,
                      challenge.start_date,
                      challenge.end_date
                    );
                    break;
                  case "xp_race":
                    memberProgress = await computeXpRaceProgress(
                      supabase,
                      member.student_id,
                      course_id,
                      challenge.start_date,
                      challenge.end_date
                    );
                    break;
                  case "blooms_climb":
                    memberProgress = await computeBloomsClimbProgress(
                      supabase,
                      member.student_id,
                      course_id,
                      challenge.start_date,
                      challenge.end_date
                    );
                    break;
                }
                teamTotal += memberProgress;
              }
              computedProgress = teamTotal;
            }
          }
        }

        // ── Update progress record ──────────────────────────────────────
        const updatePayload: Record<string, unknown> = {
          current_progress: computedProgress,
          updated_at: new Date().toISOString(),
        };

        // ── Completion detection ────────────────────────────────────────
        // If progress >= goal_target and not yet completed
        const isNowComplete =
          computedProgress >= challenge.goal_target &&
          !progressRecord.completed_at;

        if (isNowComplete) {
          updatePayload.completed_at = new Date().toISOString();
        }

        const { error: updateErr } = await supabase
          .from("challenge_progress")
          .update(updatePayload)
          .eq("id", progressRecord.id);

        if (updateErr) {
          console.error(
            `Progress update failed for challenge ${challenge.id}:`,
            updateErr.message
          );
          continue;
        }

        challengesUpdated++;

        // ── Trigger reward distribution on completion ───────────────────
        if (isNowComplete && !progressRecord.reward_granted) {
          await distributeReward(supabase, challenge, {
            ...progressRecord,
            current_progress: computedProgress,
            completed_at: updatePayload.completed_at as string,
          });
          completionsTriggered++;
        }
      } catch (challengeErr) {
        console.error(
          `Error processing challenge ${challenge.id}:`,
          challengeErr
        );
        // Continue processing other challenges
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        challenges_updated: challengesUpdated,
        completions_triggered: completionsTriggered,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("update-challenge-progress error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
