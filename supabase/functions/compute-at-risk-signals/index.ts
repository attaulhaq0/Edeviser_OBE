import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ─── pg_cron schedule: 0 2 * * * (nightly 2 AM) ────────────────────────────
// Computes at-risk signals for every active student:
//   • days_since_last_login
//   • clo_attainment_trend  (improving | declining | stagnant)
//   • submission_pattern    (early | on_time | late | missed)
// Stores the computed signals as JSONB in student_gamification.at_risk_signals.

// ─── Types ──────────────────────────────────────────────────────────────────

interface AtRiskSignals {
  days_since_last_login: number;
  clo_attainment_trend: 'improving' | 'declining' | 'stagnant';
  submission_pattern: 'early' | 'on_time' | 'late' | 'missed';
  computed_at: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function daysBetween(dateA: string, dateB: string): number {
  const a = new Date(dateA);
  const b = new Date(dateB);
  return Math.floor(Math.abs(a.getTime() - b.getTime()) / 86_400_000);
}

/**
 * Determine CLO attainment trend by comparing the average of recent attainment
 * records (last 30 days) against older ones (30-60 days).
 */
function computeAttainmentTrend(
  records: Array<{ attainment_percent: number; last_calculated_at: string }>,
): 'improving' | 'declining' | 'stagnant' {
  if (records.length < 2) return 'stagnant';

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86_400_000).toISOString();
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 86_400_000).toISOString();

  const recent = records.filter((r) => r.last_calculated_at >= thirtyDaysAgo);
  const older = records.filter(
    (r) => r.last_calculated_at >= sixtyDaysAgo && r.last_calculated_at < thirtyDaysAgo,
  );

  if (recent.length === 0 || older.length === 0) return 'stagnant';

  const avgRecent = recent.reduce((s, r) => s + r.attainment_percent, 0) / recent.length;
  const avgOlder = older.reduce((s, r) => s + r.attainment_percent, 0) / older.length;

  const delta = avgRecent - avgOlder;
  if (delta > 3) return 'improving';
  if (delta < -3) return 'declining';
  return 'stagnant';
}

/**
 * Determine submission timing pattern from recent submissions.
 * Compares submitted_at against assignment due_date.
 */
function computeSubmissionPattern(
  submissions: Array<{ submitted_at: string; is_late: boolean }>,
  totalAssignments: number,
): 'early' | 'on_time' | 'late' | 'missed' {
  if (totalAssignments === 0) return 'on_time'; // no assignments yet
  if (submissions.length === 0) return 'missed';

  const submissionRate = submissions.length / totalAssignments;
  if (submissionRate < 0.5) return 'missed';

  const lateCount = submissions.filter((s) => s.is_late).length;
  const lateRatio = lateCount / submissions.length;

  if (lateRatio > 0.5) return 'late';
  if (lateRatio < 0.1) return 'early';
  return 'on_time';
}

// ─── Main Handler ───────────────────────────────────────────────────────────

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

    const nowISO = new Date().toISOString();
    const todayUTC = nowISO.slice(0, 10);

    // ── Step 1: Fetch all active students with gamification data ─────────

    const { data: students, error: studentsErr } = await supabase
      .from('student_gamification')
      .select('student_id, last_login_date');

    if (studentsErr) {
      console.error('Failed to fetch students:', studentsErr.message);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch students', detail: studentsErr.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (!students || students.length === 0) {
      return new Response(
        JSON.stringify({ success: true, processed: 0, message: 'No students found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    let processed = 0;
    const errors: Array<{ student_id: string; error: string }> = [];

    for (const student of students) {
      try {
        // ── Days since last login ─────────────────────────────────────
        const daysSinceLogin = student.last_login_date
          ? daysBetween(student.last_login_date, todayUTC)
          : 999; // never logged in

        // ── CLO attainment trend ──────────────────────────────────────
        const sixtyDaysAgo = new Date(Date.now() - 60 * 86_400_000).toISOString();

        const { data: attainmentRecords } = await supabase
          .from('outcome_attainment')
          .select('attainment_percent, last_calculated_at')
          .eq('student_id', student.student_id)
          .eq('scope', 'student_course')
          .gte('last_calculated_at', sixtyDaysAgo)
          .order('last_calculated_at', { ascending: true });

        const cloTrend = computeAttainmentTrend(attainmentRecords ?? []);

        // ── Submission timing pattern ─────────────────────────────────
        // Get student's enrolled course IDs
        const { data: enrollments } = await supabase
          .from('student_courses')
          .select('course_id')
          .eq('student_id', student.student_id)
          .eq('status', 'active');

        const courseIds = (enrollments ?? []).map(
          (e: { course_id: string }) => e.course_id,
        );

        let submissionPattern: AtRiskSignals['submission_pattern'] = 'on_time';

        if (courseIds.length > 0) {
          // Count total assignments in enrolled courses
          const { count: totalAssignments } = await supabase
            .from('assignments')
            .select('id', { count: 'exact', head: true })
            .in('course_id', courseIds);

          // Get student's recent submissions (last 60 days)
          const { data: recentSubmissions } = await supabase
            .from('submissions')
            .select('submitted_at, is_late')
            .eq('student_id', student.student_id)
            .gte('submitted_at', sixtyDaysAgo);

          submissionPattern = computeSubmissionPattern(
            recentSubmissions ?? [],
            totalAssignments ?? 0,
          );
        }

        // ── Store computed signals ────────────────────────────────────
        const signals: AtRiskSignals = {
          days_since_last_login: daysSinceLogin,
          clo_attainment_trend: cloTrend,
          submission_pattern: submissionPattern,
          computed_at: nowISO,
        };

        const { error: updateErr } = await supabase
          .from('student_gamification')
          .update({ at_risk_signals: signals })
          .eq('student_id', student.student_id);

        if (updateErr) {
          errors.push({ student_id: student.student_id, error: updateErr.message });
        } else {
          processed++;
        }
      } catch (err) {
        errors.push({ student_id: student.student_id, error: (err as Error).message });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed,
        total: students.length,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('compute-at-risk-signals error:', (error as Error).message);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
