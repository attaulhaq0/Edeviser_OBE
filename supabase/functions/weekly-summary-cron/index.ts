import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ─── pg_cron schedule: 0 8 * * 1 (Monday 8 AM) ─────────────────────────────
// Aggregates weekly XP, badges, streak, and submission counts per student.
// Sends a weekly_summary email via send-email-notification.

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // ── Auth: cron secret or service role only ──────────────────────
    const cronSecret = req.headers.get('x-cron-secret');
    const expectedSecret = Deno.env.get('CRON_SECRET');
    const authHeader = req.headers.get('Authorization') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const isServiceRole = serviceRoleKey && authHeader.includes(serviceRoleKey);
    const isCron = expectedSecret && cronSecret === expectedSecret;

    if (!isServiceRole && !isCron) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: cron secret or service role required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Calculate the date range for the past week (Monday to Sunday)
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoISO = weekAgo.toISOString();

    // Fetch all active students
    const { data: students, error: studentsErr } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .eq('role', 'student')
      .eq('is_active', true);

    if (studentsErr) {
      console.error('Failed to fetch students:', studentsErr.message);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch students', detail: studentsErr.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (!students || students.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: 'No active students found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    let sent = 0;
    const errors: Array<{ student_id: string; error: string }> = [];
    const dashboardUrl = `${Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '.vercel.app') ?? 'https://edeviser.vercel.app'}/student/dashboard`;

    for (const student of students) {
      try {
        // Aggregate XP earned this week
        const { data: xpRows } = await supabase
          .from('xp_transactions')
          .select('xp_amount')
          .eq('student_id', student.id)
          .gte('created_at', weekAgoISO);

        const xpEarned = (xpRows ?? []).reduce(
          (sum: number, row: { xp_amount: number }) => sum + row.xp_amount,
          0,
        );

        // Count badges earned this week
        const { count: badgesEarned } = await supabase
          .from('student_badges')
          .select('id', { count: 'exact', head: true })
          .eq('student_id', student.id)
          .gte('earned_at', weekAgoISO);

        // Get current streak
        const { data: gamification } = await supabase
          .from('student_gamification')
          .select('streak_count')
          .eq('student_id', student.id)
          .maybeSingle();

        // Count submissions this week
        const { count: submissionsCount } = await supabase
          .from('submissions')
          .select('id', { count: 'exact', head: true })
          .eq('student_id', student.id)
          .gte('created_at', weekAgoISO);

        await supabase.functions.invoke('send-email-notification', {
          body: {
            to: student.email,
            template: 'weekly_summary',
            data: {
              student_name: student.full_name,
              xp_earned: xpEarned,
              badges_earned: badgesEarned ?? 0,
              streak_count: gamification?.streak_count ?? 0,
              submissions_count: submissionsCount ?? 0,
              dashboard_url: dashboardUrl,
            },
          },
        });
        sent++;
      } catch (err) {
        errors.push({ student_id: student.id, error: (err as Error).message });
      }
    }

    return new Response(
      JSON.stringify({ success: true, sent, total_students: students.length, errors }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('weekly-summary-cron error:', (error as Error).message);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
