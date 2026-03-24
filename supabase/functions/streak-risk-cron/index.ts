import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const allowedOrigin = Deno.env.get('ALLOWED_ORIGIN') ?? 'https://edeviser.vercel.app';

const corsHeaders = {
  'Access-Control-Allow-Origin': allowedOrigin,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ─── pg_cron schedule: 0 20 * * * (daily 8 PM) ─────────────────────────────
// Queries students with active streaks who have NOT logged in today.
// Sends a streak_risk email notification to each via send-email-notification.

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

    const todayUTC = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    // Find students with active streaks (streak_count > 0) whose
    // last_login_date is NOT today — meaning they haven't logged in yet.
    const { data: atRiskStudents, error: queryErr } = await supabase
      .from('student_gamification')
      .select('student_id, streak_count')
      .gt('streak_count', 0)
      .neq('last_login_date', todayUTC);

    if (queryErr) {
      console.error('Failed to query at-risk students:', queryErr.message);
      return new Response(
        JSON.stringify({ error: 'Failed to query at-risk students', detail: queryErr.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (!atRiskStudents || atRiskStudents.length === 0) {
      return new Response(
        JSON.stringify({ success: true, notified: 0, message: 'No at-risk students found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Fetch profiles for these students (email + name)
    const studentIds = atRiskStudents.map((s) => s.student_id);
    const { data: profiles, error: profileErr } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .in('id', studentIds)
      .eq('is_active', true);

    if (profileErr) {
      console.error('Failed to fetch profiles:', profileErr.message);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch profiles', detail: profileErr.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const profileMap = new Map(
      (profiles ?? []).map((p: { id: string; email: string; full_name: string }) => [p.id, p]),
    );

    let notified = 0;
    const errors: Array<{ student_id: string; error: string }> = [];

    const loginUrl = `${Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '.vercel.app') ?? 'https://edeviser.vercel.app'}/login`;

    for (const student of atRiskStudents) {
      const profile = profileMap.get(student.student_id);
      if (!profile) continue;

      try {
        await supabase.functions.invoke('send-email-notification', {
          body: {
            to: profile.email,
            template: 'streak_risk',
            data: {
              student_name: profile.full_name,
              streak_count: student.streak_count,
              login_url: loginUrl,
            },
          },
        });
        notified++;
      } catch (err) {
        errors.push({ student_id: student.student_id, error: (err as Error).message });
      }
    }

    return new Response(
      JSON.stringify({ success: true, notified, total_at_risk: atRiskStudents.length, errors }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('streak-risk-cron error:', (error as Error).message);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
