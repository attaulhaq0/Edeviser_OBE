import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ─── Types ──────────────────────────────────────────────────────────────────

interface ProcessStreakPayload {
  student_id: string;
}

interface StreakState {
  streak_count: number;
  last_login_date: string | null;
  streak_freezes_available: number;
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
  const a = new Date(dateA + 'T00:00:00Z');
  const b = new Date(dateB + 'T00:00:00Z');
  return Math.floor(Math.abs(a.getTime() - b.getTime()) / 86_400_000);
}

function getTodayUTC(): string {
  const now = new Date();
  return now.toISOString().slice(0, 10); // YYYY-MM-DD
}

// ─── Validation ─────────────────────────────────────────────────────────────

function validatePayload(
  payload: unknown,
): { valid: true; data: ProcessStreakPayload } | { valid: false; error: string } {
  if (!payload || typeof payload !== 'object') {
    return { valid: false, error: 'Request body must be a JSON object' };
  }

  const p = payload as Record<string, unknown>;

  if (!p.student_id || typeof p.student_id !== 'string') {
    return { valid: false, error: 'student_id is required and must be a string' };
  }

  return { valid: true, data: { student_id: p.student_id } };
}

// ─── Peer Milestone Notification for Streak ─────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function notifyPeersOfStreakMilestone(supabase: any, studentId: string, streakDays: number): Promise<void> {
  // Check if student is in anonymous leaderboard mode
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, leaderboard_anonymous')
    .eq('id', studentId)
    .maybeSingle();

  if (!profile || profile.leaderboard_anonymous) return;

  const studentName = profile.full_name ?? 'A classmate';

  // Find peer students in shared courses
  const { data: enrollments } = await supabase
    .from('student_courses')
    .select('course_id')
    .eq('student_id', studentId);

  if (!enrollments || enrollments.length === 0) return;

  const courseIds = enrollments.map((e: { course_id: string }) => e.course_id);

  const { data: peerEnrollments } = await supabase
    .from('student_courses')
    .select('student_id')
    .in('course_id', courseIds)
    .neq('student_id', studentId);

  if (!peerEnrollments || peerEnrollments.length === 0) return;

  const peerIds = [...new Set(peerEnrollments.map((e: { student_id: string }) => e.student_id))];

  const message = `${studentName} is on a ${streakDays}-day streak!`;

  const notifications = peerIds.map((peerId) => ({
    user_id: peerId,
    type: 'peer_milestone',
    title: 'Streak Achievement',
    message,
    is_read: false,
    metadata: {
      milestone_type: 'streak_milestone',
      triggering_student_id: studentId,
      streak_days: streakDays,
    },
  }));

  const { error } = await supabase.from('notifications').insert(notifications);
  if (error) {
    console.error('Failed to insert peer streak notifications:', error.message);
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

    const { student_id } = validation.data;
    const todayUTC = getTodayUTC();

    // ── Step 1: Fetch current gamification record ───────────────────────

    const { data: current, error: fetchErr } = await supabase
      .from('student_gamification')
      .select('streak_count, last_login_date, streak_freezes_available')
      .eq('student_id', student_id)
      .maybeSingle();

    if (fetchErr) {
      console.error('Failed to fetch gamification record:', fetchErr.message);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch gamification record', detail: fetchErr.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const state: StreakState | null = current
      ? {
          streak_count: current.streak_count ?? 0,
          last_login_date: current.last_login_date ?? null,
          streak_freezes_available: current.streak_freezes_available ?? 0,
        }
      : null;

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
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      if (dayDiff === 1) {
        // Consecutive day
        newStreakCount = state.streak_count + 1;
      } else if (dayDiff === 2 && state.streak_freezes_available > 0) {
        // Missed exactly 1 day, freeze available
        newStreakCount = state.streak_count + 1;
        streakFrozen = true;
        freezeConsumed = true;
      } else {
        // Missed too many days — reset
        newStreakCount = 1;
      }
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
    };

    if (freezeConsumed && state) {
      updateData.streak_freezes_available = state.streak_freezes_available - 1;
    }

    const { error: upsertErr } = await supabase
      .from('student_gamification')
      .upsert(updateData, { onConflict: 'student_id' });

    if (upsertErr) {
      console.error('Failed to update gamification record:', upsertErr.message);
      return new Response(
        JSON.stringify({ error: 'Failed to update gamification record', detail: upsertErr.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ── Step 4: Award milestone XP if applicable ────────────────────────

    if (milestoneReached !== null) {
      const xpAmount = MILESTONE_XP[milestoneReached];
      if (xpAmount) {
        try {
          await supabase.functions.invoke('award-xp', {
            body: {
              student_id,
              xp_amount: xpAmount,
              source: 'streak_milestone',
              note: `Streak milestone: ${milestoneReached} days`,
            },
          });
        } catch (xpErr) {
          // Log but don't fail the streak update
          console.error('Failed to award milestone XP:', (xpErr as Error).message);
        }
      }

      // Notify peers for notable streak milestones (7, 30, 100)
      const PEER_NOTIFY_MILESTONES = [7, 30, 100];
      if (PEER_NOTIFY_MILESTONES.includes(milestoneReached)) {
        notifyPeersOfStreakMilestone(supabase, student_id, milestoneReached).catch((err) => {
          console.error('Peer streak notification failed:', err);
        });
      }
    }

    // ── Response ────────────────────────────────────────────────────────

    return new Response(
      JSON.stringify({
        success: true,
        streak_count: newStreakCount,
        milestone_reached: milestoneReached,
        streak_frozen: streakFrozen,
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
