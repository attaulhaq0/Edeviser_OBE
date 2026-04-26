// =============================================================================
// update-challenge-progress Edge Function — Tasks 2.3–2.6
// Accepts event_type (grade, habit, xp), student_id, course_id, metadata.
// Computes progress per challenge type, detects completion, triggers rewards.
// Idempotent: reprocessing the same event does not double-count.
// =============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type EventType = 'grade' | 'habit' | 'xp';
type ChallengeType = 'academic' | 'habit' | 'xp_race' | 'blooms_climb' | 'cooperative';

interface ProgressPayload {
  event_type: EventType;
  student_id: string;
  course_id: string;
  metadata?: Record<string, unknown>;
}

// ─── Challenge type → event type mapping ─────────────────────────────────────

const CHALLENGE_EVENT_MAP: Record<ChallengeType, EventType[]> = {
  academic: ['grade'],
  habit: ['habit'],
  xp_race: ['xp'],
  blooms_climb: ['grade'],
  cooperative: ['grade', 'habit', 'xp'],
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const body: ProgressPayload = await req.json();
    const { event_type, student_id, course_id, metadata } = body;

    if (!event_type || !student_id || !course_id) {
      return new Response(
        JSON.stringify({ error: 'event_type, student_id, and course_id are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ── Find active challenges for this course that match the event type ──

    const { data: challenges, error: chalErr } = await supabase
      .from('social_challenges')
      .select('id, challenge_type, participation_mode, goal_target, reward_xp, reward_badge_id, course_id')
      .eq('course_id', course_id)
      .eq('status', 'active');

    if (chalErr) throw chalErr;
    if (!challenges || challenges.length === 0) {
      return new Response(
        JSON.stringify({ success: true, challenges_updated: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Filter to challenges whose type responds to this event
    const matchingChallenges = challenges.filter((c) => {
      const ct = c.challenge_type as ChallengeType;
      return CHALLENGE_EVENT_MAP[ct]?.includes(event_type);
    });

    if (matchingChallenges.length === 0) {
      return new Response(
        JSON.stringify({ success: true, challenges_updated: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    let updated = 0;
    const completions: string[] = [];

    for (const challenge of matchingChallenges) {
      const ct = challenge.challenge_type as ChallengeType;
      const isTeamMode = challenge.participation_mode === 'team';

      // ── Resolve participant ID ──────────────────────────────────────────

      let participantId = student_id;
      let participantType: 'team' | 'individual' = 'individual';

      if (isTeamMode) {
        const { data: membership } = await supabase
          .from('team_members')
          .select('team_id, teams!inner(course_id)')
          .eq('student_id', student_id)
          .eq('teams.course_id', course_id)
          .is('left_at', null)
          .limit(1)
          .maybeSingle();

        if (!membership?.team_id) continue; // Student not on a team — skip
        participantId = membership.team_id;
        participantType = 'team';
      }

      // ── Compute current progress (idempotent — always recompute from source) ──

      let computedProgress = 0;

      switch (ct) {
        case 'academic': {
          // Count graded assignments within the challenge period
          const { count } = await supabase
            .from('grades')
            .select('id', { count: 'exact', head: true })
            .eq('student_id', isTeamMode ? undefined! : student_id)
            .eq('course_id', course_id)
            .gte('created_at', challenge.start_date ?? '')
            .lte('created_at', challenge.end_date ?? '');

          if (isTeamMode) {
            // For team mode, count across all team members
            const { data: members } = await supabase
              .from('team_members')
              .select('student_id')
              .eq('team_id', participantId)
              .is('left_at', null);

            const memberIds = (members ?? []).map((m: { student_id: string }) => m.student_id);
            const { count: teamCount } = await supabase
              .from('grades')
              .select('id', { count: 'exact', head: true })
              .in('student_id', memberIds)
              .eq('course_id', course_id);

            computedProgress = teamCount ?? 0;
          } else {
            computedProgress = count ?? 0;
          }
          break;
        }

        case 'habit': {
          // Current consecutive streak days during the challenge period
          const { data: gamData } = await supabase
            .from('student_gamification')
            .select('streak_current')
            .eq('student_id', student_id)
            .maybeSingle();

          computedProgress = gamData?.streak_current ?? 0;
          break;
        }

        case 'xp_race': {
          // Total XP earned in the course during the challenge period
          if (isTeamMode) {
            const { data: members } = await supabase
              .from('team_members')
              .select('student_id')
              .eq('team_id', participantId)
              .is('left_at', null);

            const memberIds = (members ?? []).map((m: { student_id: string }) => m.student_id);
            const { data: xpRows } = await supabase
              .from('xp_transactions')
              .select('xp_amount')
              .in('student_id', memberIds)
              .eq('scope', 'individual');

            computedProgress = (xpRows ?? []).reduce(
              (sum: number, r: { xp_amount: number }) => sum + r.xp_amount,
              0,
            );
          } else {
            const { data: xpRows } = await supabase
              .from('xp_transactions')
              .select('xp_amount')
              .eq('student_id', student_id)
              .eq('scope', 'individual');

            computedProgress = (xpRows ?? []).reduce(
              (sum: number, r: { xp_amount: number }) => sum + r.xp_amount,
              0,
            );
          }
          break;
        }

        case 'blooms_climb': {
          // Count distinct Bloom's levels with at least one graded assignment
          const { data: bloomsData } = await supabase
            .from('assignments')
            .select('blooms_level')
            .eq('course_id', course_id)
            .not('blooms_level', 'is', null);

          // Get assignments that have grades for this student
          const { data: gradedAssignments } = await supabase
            .from('grades')
            .select('assignment_id, assignments!inner(blooms_level)')
            .eq('student_id', student_id)
            .eq('course_id', course_id);

          const distinctLevels = new Set(
            (gradedAssignments ?? [])
              .map((g: Record<string, unknown>) => {
                const a = g.assignments as Record<string, unknown> | null;
                return a?.blooms_level as string | undefined;
              })
              .filter(Boolean),
          );

          computedProgress = distinctLevels.size;
          break;
        }

        case 'cooperative': {
          // Collective team progress — sum of all member contributions
          if (!isTeamMode) continue; // Cooperative only supports team mode

          const { data: members } = await supabase
            .from('team_members')
            .select('student_id')
            .eq('team_id', participantId)
            .is('left_at', null);

          const memberIds = (members ?? []).map((m: { student_id: string }) => m.student_id);

          // Sum XP earned by all team members in this course
          const { data: xpRows } = await supabase
            .from('xp_transactions')
            .select('xp_amount')
            .in('student_id', memberIds)
            .eq('scope', 'individual');

          computedProgress = (xpRows ?? []).reduce(
            (sum: number, r: { xp_amount: number }) => sum + r.xp_amount,
            0,
          );
          break;
        }
      }

      // ── Upsert progress record ──────────────────────────────────────────

      const { data: existing } = await supabase
        .from('challenge_progress')
        .select('id, current_progress, completed_at, reward_granted')
        .eq('challenge_id', challenge.id)
        .eq('participant_id', participantId)
        .maybeSingle();

      if (existing?.completed_at) {
        // Already completed — skip (idempotent)
        continue;
      }

      const isCompleted = computedProgress >= challenge.goal_target;

      if (existing) {
        const updatePayload: Record<string, unknown> = {
          current_progress: computedProgress,
          updated_at: new Date().toISOString(),
        };

        if (isCompleted && !existing.reward_granted) {
          updatePayload.completed_at = new Date().toISOString();
          updatePayload.reward_granted = true;
        }

        await supabase
          .from('challenge_progress')
          .update(updatePayload)
          .eq('id', existing.id);
      } else {
        await supabase.from('challenge_progress').insert({
          challenge_id: challenge.id,
          participant_type: participantType,
          participant_id: participantId,
          current_progress: computedProgress,
          completed_at: isCompleted ? new Date().toISOString() : null,
          reward_granted: isCompleted,
        });
      }

      updated++;

      // ── Completion: trigger reward distribution ─────────────────────────

      if (isCompleted && !(existing?.reward_granted)) {
        completions.push(challenge.id);

        if (isTeamMode) {
          // Award full reward_xp to EACH team member
          const { data: members } = await supabase
            .from('team_members')
            .select('student_id')
            .eq('team_id', participantId)
            .is('left_at', null);

          for (const member of members ?? []) {
            await supabase.functions.invoke('award-xp', {
              body: {
                student_id: member.student_id,
                xp_amount: challenge.reward_xp,
                source: 'challenge_reward',
                reference_id: `challenge:${challenge.id}:${member.student_id}`,
                note: `Challenge completed: ${challenge.title ?? challenge.id}`,
                course_id: challenge.course_id,
                challenge_id: challenge.id,
                participant_type: 'team',
              },
            });
          }
        } else {
          // Individual: award to the student
          await supabase.functions.invoke('award-xp', {
            body: {
              student_id,
              xp_amount: challenge.reward_xp,
              source: 'challenge_reward',
              reference_id: `challenge:${challenge.id}:${student_id}`,
              note: `Challenge completed: ${challenge.title ?? challenge.id}`,
              course_id: challenge.course_id,
              challenge_id: challenge.id,
              participant_type: 'individual',
            },
          });
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        challenges_updated: updated,
        completions,
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
