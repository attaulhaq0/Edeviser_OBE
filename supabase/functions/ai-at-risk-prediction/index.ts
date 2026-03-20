import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ─── pg_cron schedule: 0 3 * * * (nightly 3 AM) ────────────────────────────
// Predicts students likely to fail a CLO ≥7 days before the next assignment
// due date. Uses signals from compute-at-risk-signals (stored in
// student_gamification.at_risk_signals) plus additional data to calculate a
// probability score (0–100%). Predictions with probability ≥50% are stored
// in ai_feedback with suggestion_type = 'at_risk_prediction'.

// ─── Signal Weights ─────────────────────────────────────────────────────────
const WEIGHT_LOGIN_FREQUENCY = 0.3;
const WEIGHT_ATTAINMENT_TREND = 0.4;
const WEIGHT_SUBMISSION_PATTERN = 0.3;

// ─── Probability Threshold ──────────────────────────────────────────────────
const PREDICTION_THRESHOLD = 50; // Only store predictions ≥50%
const UPCOMING_DAYS = 14; // Look ahead 14 days for assignments
const MIN_DAYS_BEFORE_DUE = 7; // Predict ≥7 days before due date

// ─── Types ──────────────────────────────────────────────────────────────────

interface AtRiskSignals {
  days_since_last_login: number;
  clo_attainment_trend: 'improving' | 'declining' | 'stagnant';
  submission_pattern: 'early' | 'on_time' | 'late' | 'missed';
  computed_at: string;
}

interface StudentWithSignals {
  student_id: string;
  at_risk_signals: AtRiskSignals | null;
}

interface UpcomingAssignment {
  id: string;
  course_id: string;
  due_date: string;
  clo_ids: string[];
}

interface CLOAttainment {
  outcome_id: string;
  attainment_percent: number;
}

// ─── Pure Scoring Helpers ───────────────────────────────────────────────────

/**
 * Score login frequency signal (0–100).
 * Higher score = higher risk.
 */
export function scoreLoginFrequency(daysSinceLastLogin: number): number {
  if (daysSinceLastLogin <= 1) return 10;
  if (daysSinceLastLogin <= 3) return 30;
  if (daysSinceLastLogin <= 7) return 60;
  if (daysSinceLastLogin <= 14) return 80;
  return 100;
}

/**
 * Classify login frequency for contributing signals display.
 */
export function classifyLoginFrequency(daysSinceLastLogin: number): 'low' | 'medium' | 'high' {
  if (daysSinceLastLogin <= 3) return 'high';
  if (daysSinceLastLogin <= 7) return 'medium';
  return 'low';
}

/**
 * Score attainment trend signal (0–100).
 * Higher score = higher risk.
 */
export function scoreAttainmentTrend(trend: 'improving' | 'declining' | 'stagnant'): number {
  switch (trend) {
    case 'improving': return 10;
    case 'stagnant': return 50;
    case 'declining': return 90;
  }
}

/**
 * Score submission pattern signal (0–100).
 * Higher score = higher risk.
 */
export function scoreSubmissionPattern(pattern: 'early' | 'on_time' | 'late' | 'missed'): number {
  switch (pattern) {
    case 'early': return 5;
    case 'on_time': return 20;
    case 'late': return 65;
    case 'missed': return 95;
  }
}

/**
 * Calculate overall risk probability (0–100%) from weighted signal scores.
 * Applies a CLO attainment modifier: if current attainment is already low,
 * the risk is amplified.
 */
export function calculateRiskProbability(
  loginScore: number,
  trendScore: number,
  patternScore: number,
  currentAttainment: number | null,
): number {
  const baseScore =
    loginScore * WEIGHT_LOGIN_FREQUENCY +
    trendScore * WEIGHT_ATTAINMENT_TREND +
    patternScore * WEIGHT_SUBMISSION_PATTERN;

  // Apply attainment modifier: low attainment amplifies risk
  let attainmentModifier = 1.0;
  if (currentAttainment !== null) {
    if (currentAttainment < 50) {
      attainmentModifier = 1.3;
    } else if (currentAttainment < 70) {
      attainmentModifier = 1.15;
    } else {
      // Already meeting target — reduce risk
      attainmentModifier = 0.7;
    }
  }

  const finalScore = Math.round(Math.min(100, Math.max(0, baseScore * attainmentModifier)));
  return finalScore;
}

/**
 * Build prediction suggestion text for the ai_feedback record.
 */
export function buildPredictionText(
  studentName: string,
  cloTitle: string,
  probability: number,
  loginFreq: 'low' | 'medium' | 'high',
  trend: 'improving' | 'declining' | 'stagnant',
  pattern: 'early' | 'on_time' | 'late' | 'missed',
): string {
  const signals: string[] = [];
  if (loginFreq === 'low') signals.push('low login frequency');
  if (trend === 'declining') signals.push('declining attainment trend');
  if (trend === 'stagnant') signals.push('stagnant attainment trend');
  if (pattern === 'late') signals.push('late submission pattern');
  if (pattern === 'missed') signals.push('missed submissions');

  const signalText = signals.length > 0
    ? ` Key signals: ${signals.join(', ')}.`
    : '';

  return (
    `${studentName} has a ${probability}% probability of failing "${cloTitle}".${signalText}`
  );
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

    const nowISO = new Date().toISOString();
    const todayDate = nowISO.slice(0, 10);

    // ── Step 1: Fetch all students with pre-computed at-risk signals ────

    const { data: students, error: studentsErr } = await supabase
      .from('student_gamification')
      .select('student_id, at_risk_signals');

    if (studentsErr) {
      console.error('Failed to fetch students:', studentsErr.message);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch students', detail: studentsErr.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (!students || students.length === 0) {
      return new Response(
        JSON.stringify({ success: true, predictions_made: 0, message: 'No students found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ── Step 2: Find upcoming assignments (due in next 14 days, ≥7 days away)

    const minDueDate = new Date(Date.now() + MIN_DAYS_BEFORE_DUE * 86_400_000)
      .toISOString()
      .slice(0, 10);
    const maxDueDate = new Date(Date.now() + UPCOMING_DAYS * 86_400_000)
      .toISOString()
      .slice(0, 10);

    const { data: upcomingAssignments, error: assignErr } = await supabase
      .from('assignments')
      .select('id, course_id, due_date, clo_ids')
      .gte('due_date', minDueDate)
      .lte('due_date', maxDueDate);

    if (assignErr) {
      console.error('Failed to fetch assignments:', assignErr.message);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch assignments', detail: assignErr.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (!upcomingAssignments || upcomingAssignments.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          predictions_made: 0,
          message: 'No upcoming assignments in prediction window',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Build a map of course_id → CLO IDs from upcoming assignments
    const courseCloMap = new Map<string, Set<string>>();
    for (const assignment of upcomingAssignments) {
      if (!assignment.clo_ids || assignment.clo_ids.length === 0) continue;
      const existing = courseCloMap.get(assignment.course_id) ?? new Set<string>();
      for (const cloId of assignment.clo_ids) {
        existing.add(cloId);
      }
      courseCloMap.set(assignment.course_id, existing);
    }

    // ── Step 3: Fetch CLO details for all relevant CLOs ─────────────────

    const allCloIds = [...new Set([...courseCloMap.values()].flatMap((s) => [...s]))];

    if (allCloIds.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          predictions_made: 0,
          message: 'No CLOs linked to upcoming assignments',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { data: cloDetails } = await supabase
      .from('learning_outcomes')
      .select('id, title')
      .in('id', allCloIds)
      .eq('type', 'CLO');

    const cloTitleMap = new Map<string, string>();
    for (const clo of cloDetails ?? []) {
      cloTitleMap.set(clo.id, clo.title);
    }

    // ── Step 4: Fetch student names ─────────────────────────────────────

    const studentIds = students.map((s: StudentWithSignals) => s.student_id);

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', studentIds);

    const nameMap = new Map<string, string>();
    for (const p of profiles ?? []) {
      nameMap.set(p.id, p.full_name ?? 'Unknown Student');
    }

    // ── Step 5: Fetch enrollments to know which students are in which courses

    const courseIds = [...courseCloMap.keys()];

    const { data: enrollments } = await supabase
      .from('student_courses')
      .select('student_id, course_id')
      .in('student_id', studentIds)
      .in('course_id', courseIds)
      .eq('status', 'active');

    // Build student → courses map
    const studentCourseMap = new Map<string, string[]>();
    for (const e of enrollments ?? []) {
      const courses = studentCourseMap.get(e.student_id) ?? [];
      courses.push(e.course_id);
      studentCourseMap.set(e.student_id, courses);
    }

    // ── Step 6: Fetch current CLO attainment for all students ───────────

    const { data: attainmentRecords } = await supabase
      .from('outcome_attainment')
      .select('student_id, outcome_id, attainment_percent')
      .in('student_id', studentIds)
      .in('outcome_id', allCloIds)
      .eq('scope', 'student_course');

    // Build student+clo → attainment map
    const attainmentMap = new Map<string, number>();
    for (const a of attainmentRecords ?? []) {
      attainmentMap.set(`${a.student_id}:${a.outcome_id}`, a.attainment_percent);
    }

    // ── Step 7: Generate predictions ────────────────────────────────────

    let predictionsMade = 0;
    const errors: Array<{ student_id: string; error: string }> = [];
    const predictions: Array<Record<string, unknown>> = [];

    for (const student of students as StudentWithSignals[]) {
      try {
        const signals = student.at_risk_signals;
        if (!signals) continue; // No signals computed yet

        const enrolledCourses = studentCourseMap.get(student.student_id) ?? [];
        if (enrolledCourses.length === 0) continue;

        const studentName = nameMap.get(student.student_id) ?? 'Unknown Student';

        for (const courseId of enrolledCourses) {
          const cloIds = courseCloMap.get(courseId);
          if (!cloIds) continue;

          for (const cloId of cloIds) {
            const cloTitle = cloTitleMap.get(cloId) ?? 'Unknown CLO';
            const currentAttainment = attainmentMap.get(`${student.student_id}:${cloId}`) ?? null;

            // Score each signal
            const loginScore = scoreLoginFrequency(signals.days_since_last_login);
            const trendScore = scoreAttainmentTrend(signals.clo_attainment_trend);
            const patternScore = scoreSubmissionPattern(signals.submission_pattern);

            // Calculate overall probability
            const probability = calculateRiskProbability(
              loginScore,
              trendScore,
              patternScore,
              currentAttainment,
            );

            // Only store predictions above threshold
            if (probability < PREDICTION_THRESHOLD) continue;

            const loginFreq = classifyLoginFrequency(signals.days_since_last_login);
            const suggestionText = buildPredictionText(
              studentName,
              cloTitle,
              probability,
              loginFreq,
              signals.clo_attainment_trend,
              signals.submission_pattern,
            );

            predictions.push({
              student_id: student.student_id,
              suggestion_type: 'at_risk_prediction',
              suggestion_text: suggestionText,
              suggestion_data: {
                at_risk_clo_id: cloId,
                at_risk_clo_title: cloTitle,
                probability_score: probability,
                contributing_signals: {
                  login_frequency: loginFreq,
                  submission_pattern: signals.submission_pattern,
                  attainment_trend: signals.clo_attainment_trend,
                },
                prediction_date: todayDate,
                current_attainment: currentAttainment,
              },
            });
          }
        }
      } catch (err) {
        errors.push({ student_id: student.student_id, error: (err as Error).message });
      }
    }

    // ── Step 8: Batch insert predictions ────────────────────────────────

    if (predictions.length > 0) {
      const { error: insertErr } = await supabase
        .from('ai_feedback')
        .insert(predictions);

      if (insertErr) {
        console.error('Failed to store predictions:', insertErr.message);
        return new Response(
          JSON.stringify({ error: 'Failed to store predictions', detail: insertErr.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      predictionsMade = predictions.length;
    }

    // ── Step 9: Return summary ──────────────────────────────────────────

    return new Response(
      JSON.stringify({
        success: true,
        predictions_made: predictionsMade,
        students_processed: students.length,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('ai-at-risk-prediction error:', (error as Error).message);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
