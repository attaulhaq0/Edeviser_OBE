// Task 134.5: Challenge completion cron Edge Function

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const now = new Date().toISOString();

    // Find active challenges past their end date
    const { data: endedChallenges, error: chalErr } = await supabase
      .from('social_challenges')
      .select('*')
      .eq('status', 'active')
      .lte('end_date', now);

    if (chalErr) throw chalErr;
    if (!endedChallenges || endedChallenges.length === 0) {
      return new Response(
        JSON.stringify({ success: true, completed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    let completedCount = 0;

    for (const challenge of endedChallenges) {
      // Get participants
      const { data: participants } = await supabase
        .from('challenge_participants')
        .select('*')
        .eq('challenge_id', challenge.id);

      if (challenge.challenge_type === 'team') {
        // Auto-cancel if < 2 participating teams
        const teamParticipants = (participants ?? []).filter(
          (p: { participant_type: string }) => p.participant_type === 'team',
        );

        if (teamParticipants.length < 2) {
          await supabase
            .from('social_challenges')
            .update({ status: 'cancelled' })
            .eq('id', challenge.id);
          continue;
        }

        // Determine winning team(s) — highest progress
        const sorted = [...teamParticipants].sort(
          (a: { current_progress: number }, b: { current_progress: number }) =>
            b.current_progress - a.current_progress,
        );
        const topProgress = sorted[0]?.current_progress ?? 0;
        const winners = sorted.filter(
          (p: { current_progress: number }) => p.current_progress === topProgress,
        );

        // Distribute reward to all members of winning team(s)
        for (const winner of winners) {
          const { data: members } = await supabase
            .from('team_members')
            .select('student_id')
            .eq('team_id', winner.participant_id);

          if (members && challenge.reward_type === 'xp_bonus') {
            for (const member of members) {
              await supabase.functions.invoke('award-xp', {
                body: {
                  student_id: member.student_id,
                  xp_amount: challenge.reward_value,
                  source: 'badge',
                  reference_id: `challenge:${challenge.id}`,
                  note: `Challenge reward: ${challenge.title}`,
                },
              });
            }
          }
        }
      } else {
        // Course-wide: reward all students who contributed >= 1
        const contributors = (participants ?? []).filter(
          (p: { current_progress: number }) => p.current_progress >= 1,
        );

        if (challenge.reward_type === 'xp_bonus') {
          for (const contributor of contributors) {
            await supabase.functions.invoke('award-xp', {
              body: {
                student_id: contributor.participant_id,
                xp_amount: challenge.reward_value,
                source: 'badge',
                reference_id: `challenge:${challenge.id}`,
                note: `Challenge reward: ${challenge.title}`,
              },
            });
          }
        }
      }

      // Mark challenge as completed
      await supabase
        .from('social_challenges')
        .update({ status: 'completed' })
        .eq('id', challenge.id);

      completedCount++;
    }

    return new Response(
      JSON.stringify({ success: true, completed: completedCount }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
