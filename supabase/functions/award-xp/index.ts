import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ─── Types ──────────────────────────────────────────────────────────────────

type XPSource =
  | 'login'
  | 'submission'
  | 'badge'
  | 'admin_adjustment'
  | 'perfect_day'
  | 'first_attempt_bonus'
  | 'perfect_rubric'
  | 'bonus_event'
  | 'discussion_question'
  | 'discussion_answer'
  | 'survey_completion'
  | 'quiz_completion'
  | 'streak_milestone'
  | 'journal'
  | 'grade'
  | 'onboarding_personality'
  | 'onboarding_learning_style'
  | 'onboarding_baseline'
  | 'onboarding_complete'
  | 'onboarding_self_efficacy'
  | 'onboarding_study_strategy'
  | 'micro_assessment'
  | 'profile_complete'
  | 'starter_session_complete';

interface XPAwardPayload {
  student_id: string;
  xp_amount: number;
  source: XPSource;
  reference_id?: string;
  note?: string;
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

// ─── Validation ─────────────────────────────────────────────────────────────

const VALID_SOURCES: XPSource[] = [
  'login', 'submission', 'badge', 'admin_adjustment', 'perfect_day',
  'first_attempt_bonus', 'perfect_rubric', 'bonus_event',
  'discussion_question', 'discussion_answer', 'survey_completion',
  'quiz_completion', 'streak_milestone', 'journal', 'grade',
  'onboarding_personality', 'onboarding_learning_style', 'onboarding_baseline',
  'onboarding_complete', 'onboarding_self_efficacy', 'onboarding_study_strategy',
  'micro_assessment', 'profile_complete', 'starter_session_complete',
];

function validatePayload(payload: unknown): { valid: true; data: XPAwardPayload } | { valid: false; error: string } {
  if (!payload || typeof payload !== 'object') {
    return { valid: false, error: 'Request body must be a JSON object' };
  }

  const p = payload as Record<string, unknown>;

  if (!p.student_id || typeof p.student_id !== 'string') {
    return { valid: false, error: 'student_id is required and must be a string' };
  }

  if (p.xp_amount === undefined || p.xp_amount === null || typeof p.xp_amount !== 'number') {
    return { valid: false, error: 'xp_amount is required and must be a number' };
  }

  if (!p.source || typeof p.source !== 'string' || !VALID_SOURCES.includes(p.source as XPSource)) {
    return { valid: false, error: `source is required and must be one of: ${VALID_SOURCES.join(', ')}` };
  }

  return {
    valid: true,
    data: {
      student_id: p.student_id as string,
      xp_amount: p.xp_amount as number,
      source: p.source as XPSource,
      reference_id: typeof p.reference_id === 'string' ? p.reference_id : undefined,
      note: typeof p.note === 'string' ? p.note : undefined,
    },
  };
}

// ─── Peer Milestone Notification ────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function notifyPeersOfLevelUp(supabase: any, studentId: string, newLevel: number): Promise<void> {
  // Check if student is in anonymous leaderboard mode — skip if so
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, leaderboard_anonymous')
    .eq('id', studentId)
    .maybeSingle();

  if (!profile || profile.leaderboard_anonymous) return;

  const studentName = profile.full_name ?? 'A classmate';

  // Find all courses the student is enrolled in
  const { data: enrollments } = await supabase
    .from('student_courses')
    .select('course_id')
    .eq('student_id', studentId);

  if (!enrollments || enrollments.length === 0) return;

  const courseIds = enrollments.map((e: { course_id: string }) => e.course_id);

  // Find all peer students in those courses (excluding the triggering student)
  const { data: peerEnrollments } = await supabase
    .from('student_courses')
    .select('student_id')
    .in('course_id', courseIds)
    .neq('student_id', studentId);

  if (!peerEnrollments || peerEnrollments.length === 0) return;

  // Deduplicate peer IDs (a peer may share multiple courses)
  const peerIds = [...new Set(peerEnrollments.map((e: { student_id: string }) => e.student_id))];

  const message = `Your classmate ${studentName} just hit Level ${newLevel}!`;

  // Batch insert notifications for all peers
  const notifications = peerIds.map((peerId) => ({
    user_id: peerId,
    type: 'peer_milestone',
    title: 'Classmate Leveled Up',
    message,
    is_read: false,
    metadata: {
      milestone_type: 'level_up',
      triggering_student_id: studentId,
      level: newLevel,
    },
  }));

  const { error } = await supabase.from('notifications').insert(notifications);
  if (error) {
    console.error('Failed to insert peer milestone notifications:', error.message);
  }
}

// ─── Main Handler ───────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const body = await req.json();
    const validation = validatePayload(body);

    if (!validation.valid) {
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { student_id, source, note } = validation.data;

    // ── Permission Validation ───────────────────────────────────────────
    // Verify caller is either:
    //   a) Using service_role key (server-to-server calls from other edge functions)
    //   b) The student themselves for self-triggered sources (login, submission, journal)
    // Reject with 403 Forbidden if neither condition is met

    const authHeader = req.headers.get('Authorization') ?? '';
    const isServiceRole = authHeader.includes(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    // Server-side canonical XP amounts for self-triggered sources.
    // Students cannot choose their own XP — the server enforces these values.
    // Submission is handled separately to derive late/on-time XP from trusted data.
    const SELF_TRIGGERED_XP: Partial<Record<XPSource, number>> = {
      login: 10,
      journal: 20,
    };
    const selfTriggeredSources: XPSource[] = ['login', 'submission', 'journal'];

    if (!isServiceRole) {
      // Create user-scoped client to get the caller's identity
      const userClient = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: authHeader } } },
      );
      const { data: { user } } = await userClient.auth.getUser();

      if (!user || !selfTriggeredSources.includes(source) || user.id !== student_id) {
        return new Response(
          JSON.stringify({ error: 'Forbidden: insufficient permissions' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      if (source === 'submission') {
        // Derive XP from trusted server data: look up the assignment's due_date
        // and compare against now to determine late vs on-time.
        const assignmentId = validation.data.reference_id;
        if (!assignmentId) {
          return new Response(
            JSON.stringify({ error: 'reference_id (assignment_id) is required for submission XP' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        }

        const { data: assignment, error: assignmentErr } = await supabase
          .from('assignments')
          .select('id, due_date, late_window_hours')
          .eq('id', assignmentId)
          .maybeSingle();

        if (assignmentErr || !assignment) {
          return new Response(
            JSON.stringify({ error: 'Assignment not found or query failed' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
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

    // Re-destructure after potential overrides
    const { xp_amount: resolvedXpAmount, reference_id: resolvedReferenceId } = validation.data;

    // Handle zero XP — still record the transaction but skip level recalculation
    if (resolvedXpAmount === 0) {
      const { error: insertErr } = await supabase
        .from('xp_transactions')
        .insert({
          student_id,
          xp_amount: 0,
          source,
          reference_id: resolvedReferenceId ?? null,
          note: note ?? null,
        });

      if (insertErr) {
        console.error('XP transaction insert failed:', insertErr.message);
        return new Response(
          JSON.stringify({ error: 'Failed to insert XP transaction', detail: insertErr.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      return new Response(
        JSON.stringify({ success: true, xp_awarded: 0, new_total: 0, level_up: false, new_level: 1 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ── Step 1: Check for active bonus XP events ──────────────────────────

    let finalXP = resolvedXpAmount;

    const { data: bonusEvents, error: bonusErr } = await supabase
      .from('bonus_xp_events')
      .select('multiplier')
      .lte('start_date', new Date().toISOString())
      .gte('end_date', new Date().toISOString());

    if (bonusErr) {
      console.error('Bonus event query failed:', bonusErr.message);
      // Continue without multiplier — don't block XP award
    }

    if (bonusEvents && bonusEvents.length > 0) {
      // Apply the highest active multiplier
      const maxMultiplier = Math.max(...bonusEvents.map((e: { multiplier: number }) => e.multiplier));
      if (maxMultiplier > 1) {
        finalXP = Math.floor(resolvedXpAmount * maxMultiplier);
      }
    }

    // ── Step 2: Insert XP transaction (atomic idempotency via unique constraint) ─

    // The DB has a unique partial index on (student_id, reference_id) WHERE
    // reference_id IS NOT NULL. We attempt the insert and catch the conflict
    // to avoid race-condition duplicates.

    const insertPayload = {
      student_id,
      xp_amount: finalXP,
      source,
      reference_id: resolvedReferenceId ?? null,
      note: note ?? null,
    };

    const { error: insertErr } = await supabase
      .from('xp_transactions')
      .insert(insertPayload);

    if (insertErr) {
      // Postgres unique_violation code = 23505
      if (insertErr.code === '23505' && resolvedReferenceId) {
        return new Response(
          JSON.stringify({ success: true, xp_awarded: 0, duplicate: true, reference_id: resolvedReferenceId }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
      console.error('XP transaction insert failed:', insertErr.message);
      return new Response(
        JSON.stringify({ error: 'Failed to insert XP transaction', detail: insertErr.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ── Step 3: Recalculate xp_total ──────────────────────────────────────

    const { data: sumResult, error: sumErr } = await supabase
      .from('xp_transactions')
      .select('xp_amount')
      .eq('student_id', student_id);

    if (sumErr) {
      console.error('XP sum query failed:', sumErr.message);
      return new Response(
        JSON.stringify({ error: 'Failed to calculate XP total', detail: sumErr.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const newTotal = (sumResult ?? []).reduce(
      (sum: number, row: { xp_amount: number }) => sum + row.xp_amount,
      0,
    );

    // ── Step 4: Calculate new level ───────────────────────────────────────

    const newLevel = calculateLevel(newTotal);

    // Fetch current gamification record to detect level-up
    const { data: currentGamification } = await supabase
      .from('student_gamification')
      .select('level')
      .eq('student_id', student_id)
      .maybeSingle();

    const previousLevel = currentGamification?.level ?? 1;
    const levelUp = newLevel > previousLevel;

    // ── Step 5: UPSERT student_gamification ───────────────────────────────

    const { error: upsertErr } = await supabase
      .from('student_gamification')
      .upsert(
        {
          student_id,
          xp_total: newTotal,
          level: newLevel,
        },
        { onConflict: 'student_id' },
      );

    if (upsertErr) {
      console.error('Gamification upsert failed:', upsertErr.message);
      return new Response(
        JSON.stringify({ error: 'Failed to update gamification record', detail: upsertErr.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ── Step 6: Peer milestone notification on level-up ──────────────────

    if (levelUp) {
      // Fire-and-forget — never block the XP response
      notifyPeersOfLevelUp(supabase, student_id, newLevel).catch((err) => {
        console.error('Peer milestone notification failed:', err);
      });
    }

    // ── Response ──────────────────────────────────────────────────────────

    return new Response(
      JSON.stringify({
        success: true,
        xp_awarded: finalXP,
        new_total: newTotal,
        level_up: levelUp,
        new_level: newLevel,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
