// Task 134.4: Challenge progress update Edge Function
// Also handles 134.6: 90% notification trigger for course-wide challenges

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

    const { student_id, action_type, course_id, value } = await req.json();

    if (!student_id || !action_type || !course_id) {
      return new Response(
        JSON.stringify({ error: 'student_id, action_type, and course_id are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Map action_type to goal_metric
    const metricMap: Record<string, string> = {
      xp_earned: 'total_xp',
      habit_completed: 'habits_completed',
      assignment_submitted: 'assignments_submitted',
      quiz_completed: 'quiz_score_avg',
    };

    const goalMetric = metricMap[action_type];
    if (!goalMetric) {
      return new Response(
        JSON.stringify({ success: true, message: 'No matching challenge metric' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Find active challenges for this course and metric
    const { data: challenges, error: chalErr } = await supabase
      .from('social_challenges')
      .select('id, challenge_type, goal_metric, goal_target, notification_sent_90, course_id')
      .eq('course_id', course_id)
      .eq('status', 'active')
      .eq('goal_metric', goalMetric);

    if (chalErr) throw chalErr;
    if (!challenges || challenges.length === 0) {
      return new Response(
        JSON.stringify({ success: true, challenges_updated: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    let updated = 0;
    const increment = value ?? 1;

    for (const challenge of challenges) {
      let participantId = student_id;

      if (challenge.challenge_type === 'team') {
        // For team challenges: find the student's team
        const { data: membership } = await supabase
          .from('team_members')
          .select('team_id')
          .eq('student_id', student_id)
          .limit(1)
          .maybeSingle();

        if (!membership) continue;
        participantId = membership.team_id;
      }

      // Upsert participant progress
      const { data: existing } = await supabase
        .from('challenge_participants')
        .select('id, current_progress')
        .eq('challenge_id', challenge.id)
        .eq('participant_id', participantId)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('challenge_participants')
          .update({ current_progress: existing.current_progress + increment })
          .eq('id', existing.id);
      } else {
        await supabase.from('challenge_participants').insert({
          challenge_id: challenge.id,
          participant_id: participantId,
          participant_type: challenge.challenge_type === 'team' ? 'team' : 'student',
          current_progress: increment,
        });
      }
      updated++;

      // Task 134.6: 90% notification trigger for course-wide challenges
      if (
        challenge.challenge_type === 'course_wide' &&
        !challenge.notification_sent_90
      ) {
        // Calculate aggregate progress for course-wide challenge
        const { data: allParticipants } = await supabase
          .from('challenge_participants')
          .select('current_progress')
          .eq('challenge_id', challenge.id);

        const totalProgress = (allParticipants ?? []).reduce(
          (sum: number, p: { current_progress: number }) => sum + p.current_progress,
          0,
        );

        const threshold = challenge.goal_target * 0.9;

        if (totalProgress >= threshold) {
          const progressPercent = Math.round((totalProgress / challenge.goal_target) * 100);

          // Get all enrolled students in the course
          const { data: enrolledStudents } = await supabase
            .from('student_courses')
            .select('student_id')
            .eq('course_id', challenge.course_id);

          if (enrolledStudents && enrolledStudents.length > 0) {
            const notifications = enrolledStudents.map(
              (s: { student_id: string }) => ({
                user_id: s.student_id,
                title: 'Challenge Almost Complete!',
                message: `Almost there — ${progressPercent}% of the goal reached.`,
                type: 'challenge_90_percent',
                reference_id: challenge.id,
                is_read: false,
              }),
            );

            await supabase.from('notifications').insert(notifications);
          }

          // Mark notification as sent (send once per challenge)
          await supabase
            .from('social_challenges')
            .update({ notification_sent_90: true })
            .eq('id', challenge.id);
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, challenges_updated: updated }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
