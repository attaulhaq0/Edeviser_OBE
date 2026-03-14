import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ─── Types ──────────────────────────────────────────────────────────────────

interface SuggestGoalsRequest {
  student_id: string;
  week_start: string; // ISO date (Monday)
}

interface GoalSuggestion {
  goal_text: string;
  smart_specific: string;
  smart_measurable: string;
  smart_achievable: string;
  smart_relevant: string;
  smart_timebound: string;
  difficulty: 'easy' | 'moderate' | 'ambitious';
  cohort_completion_rate: number;
}

interface CourseAttainment {
  course_id: string;
  course_name: string;
  avg_attainment: number;
  clo_id: string | null;
  clo_title: string | null;
}

interface UpcomingDeadline {
  assignment_id: string;
  assignment_title: string;
  course_id: string;
  course_name: string;
  due_date: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const GOAL_DIFFICULTY_THRESHOLDS = {
  easy: 80,
  moderate: 50,
} as const;

// ─── Helpers ────────────────────────────────────────────────────────────────

function isValidUUID(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function isValidISODate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !isNaN(Date.parse(value));
}

function validatePayload(
  payload: unknown,
): { valid: true; data: SuggestGoalsRequest } | { valid: false; error: string } {
  if (!payload || typeof payload !== 'object') {
    return { valid: false, error: 'Request body must be a JSON object' };
  }

  const body = payload as Record<string, unknown>;

  if (typeof body.student_id !== 'string' || !isValidUUID(body.student_id)) {
    return { valid: false, error: 'student_id must be a valid UUID' };
  }

  if (typeof body.week_start !== 'string' || !isValidISODate(body.week_start)) {
    return { valid: false, error: 'week_start must be a valid ISO date (YYYY-MM-DD)' };
  }

  return {
    valid: true,
    data: {
      student_id: body.student_id,
      week_start: body.week_start,
    },
  };
}

function classifyDifficulty(cohortCompletionRate: number): 'easy' | 'moderate' | 'ambitious' {
  if (cohortCompletionRate >= GOAL_DIFFICULTY_THRESHOLDS.easy) return 'easy';
  if (cohortCompletionRate >= GOAL_DIFFICULTY_THRESHOLDS.moderate) return 'moderate';
  return 'ambitious';
}

function composeGoalText(fields: {
  specific: string;
  measurable: string;
  achievable: string;
  relevant: string;
  timebound: string;
}): string {
  return `${fields.specific} by ${fields.timebound}, measuring progress through ${fields.measurable}. This is achievable because ${fields.achievable} and relevant to ${fields.relevant}.`;
}

function getWeekEndDate(weekStart: string): string {
  const date = new Date(weekStart);
  date.setDate(date.getDate() + 6); // Sunday of the same week
  return date.toISOString().slice(0, 10);
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

    const { student_id, week_start } = validation.data;
    const week_end = getWeekEndDate(week_start);

    // ── 3.3.1 JWT validation and student_id verification ────────────────

    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: authError } = await userClient.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (user.id !== student_id) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: student_id does not match authenticated user' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ── 3.3.2 Fetch student's enrolled courses, attainment levels, self-efficacy score ──

    const { data: enrollments, error: enrollErr } = await supabase
      .from('student_courses')
      .select('course_id, courses(id, name)')
      .eq('student_id', student_id);

    if (enrollErr) {
      console.error('Failed to fetch enrollments:', enrollErr.message);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch enrolled courses', detail: enrollErr.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const enrolledCourses = (enrollments ?? []).map((e: Record<string, unknown>) => {
      const course = e.courses as { id: string; name: string } | null;
      return {
        course_id: e.course_id as string,
        course_name: course?.name ?? 'Unknown Course',
      };
    });

    // Fetch attainment levels for enrolled courses
    const courseIds = enrolledCourses.map((c: { course_id: string }) => c.course_id);
    const courseNameMap = new Map(
      enrolledCourses.map((c: { course_id: string; course_name: string }) => [c.course_id, c.course_name]),
    );

    let attainmentData: CourseAttainment[] = [];

    if (courseIds.length > 0) {
      const { data: attainments, error: attainErr } = await supabase
        .from('outcome_attainment')
        .select('outcome_id, course_id, score')
        .eq('student_id', student_id)
        .in('course_id', courseIds)
        .eq('scope', 'clo');

      if (attainErr) {
        console.error('Failed to fetch attainment:', attainErr.message);
        // Non-fatal — proceed without attainment data
      }

      if (attainments && attainments.length > 0) {
        attainmentData = attainments.map((a: Record<string, unknown>) => ({
          course_id: a.course_id as string,
          course_name: courseNameMap.get(a.course_id as string) ?? 'Unknown Course',
          avg_attainment: a.score as number,
          clo_id: a.outcome_id as string,
          clo_title: null, // will be enriched below if needed
        }));
      }
    }

    // Fetch self-efficacy score from student_profiles
    const { data: studentProfile, error: profileErr } = await supabase
      .from('student_profiles')
      .select('self_efficacy, profile_completeness')
      .eq('student_id', student_id)
      .order('assessment_version', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (profileErr) {
      console.error('Failed to fetch student profile:', profileErr.message);
      // Non-fatal — proceed without self-efficacy data
    }

    const selfEfficacy = studentProfile?.self_efficacy as { overall: number } | null;
    const selfEfficacyScore = selfEfficacy?.overall ?? 50; // default to moderate

    // ── 3.3.3 Fetch upcoming deadlines for the week ─────────────────────

    let deadlines: UpcomingDeadline[] = [];

    if (courseIds.length > 0) {
      const { data: assignments, error: assignErr } = await supabase
        .from('assignments')
        .select('id, title, course_id, due_date')
        .in('course_id', courseIds)
        .gte('due_date', week_start)
        .lte('due_date', week_end)
        .order('due_date', { ascending: true });

      if (assignErr) {
        console.error('Failed to fetch assignments:', assignErr.message);
        // Non-fatal — proceed without deadline data
      }

      deadlines = (assignments ?? []).map((a: Record<string, unknown>) => ({
        assignment_id: a.id as string,
        assignment_title: a.title as string,
        course_id: a.course_id as string,
        course_name: courseNameMap.get(a.course_id as string) ?? 'Unknown Course',
        due_date: a.due_date as string,
      }));
    }

    // ── 3.3.4 Fetch historical cohort goal completion rates ─────────────

    let cohortRates: Record<string, number> = {
      easy: 85,
      moderate: 65,
      ambitious: 35,
    };

    if (courseIds.length > 0) {
      const { data: cohortGoals, error: cohortErr } = await supabase
        .from('goal_suggestions')
        .select('difficulty, status')
        .in('student_id', (
          await supabase
            .from('student_courses')
            .select('student_id')
            .in('course_id', courseIds)
        ).data?.map((s: { student_id: string }) => s.student_id) ?? []
        )
        .neq('student_id', student_id); // exclude current student

      if (!cohortErr && cohortGoals && cohortGoals.length > 0) {
        const difficultyGroups: Record<string, { total: number; completed: number }> = {};

        for (const goal of cohortGoals) {
          const diff = goal.difficulty as string;
          if (!difficultyGroups[diff]) {
            difficultyGroups[diff] = { total: 0, completed: 0 };
          }
          difficultyGroups[diff].total++;
          if (goal.status === 'completed') {
            difficultyGroups[diff].completed++;
          }
        }

        for (const [diff, counts] of Object.entries(difficultyGroups)) {
          if (counts.total > 0) {
            cohortRates[diff] = Math.round((counts.completed / counts.total) * 100);
          }
        }
      } else if (cohortErr) {
        console.error('Failed to fetch cohort goal data:', cohortErr.message);
        // Non-fatal — use default rates
      }
    }

    // ── 3.3.5 Generate 3 goal suggestions ───────────────────────────────
    // Easy ≥80%, Moderate 50–79%, Ambitious <50% cohort completion

    const suggestions: GoalSuggestion[] = [];

    // Pick a primary course (first enrolled or one with nearest deadline)
    const primaryCourse = deadlines.length > 0
      ? { course_id: deadlines[0].course_id, course_name: deadlines[0].course_name }
      : enrolledCourses[0] ?? { course_id: null, course_name: 'your courses' };

    // Find a secondary course for variety
    const secondaryCourse = enrolledCourses.length > 1
      ? enrolledCourses.find((c: { course_id: string }) => c.course_id !== primaryCourse.course_id) ?? primaryCourse
      : primaryCourse;

    // Find lowest attainment CLO for ambitious goal
    const lowestAttainment = attainmentData.length > 0
      ? attainmentData.reduce((min, curr) => curr.avg_attainment < min.avg_attainment ? curr : min)
      : null;

    const nearestDeadline = deadlines[0] ?? null;

    // ── 3.3.6 Format each goal using SMART structure ────────────────────

    // Goal 1: Easy — routine task with high cohort completion
    const easyRate = cohortRates.easy ?? 85;
    const easySpecific = nearestDeadline
      ? `Complete all readings and preparation for ${nearestDeadline.assignment_title} in ${nearestDeadline.course_name}`
      : `Review all course materials for ${primaryCourse.course_name} this week`;
    const easyFields = {
      specific: easySpecific,
      measurable: 'All assigned readings marked as complete',
      achievable: `Based on your current progress and ${easyRate}% of similar students completing this goal`,
      relevant: primaryCourse.course_name,
      timebound: week_end,
    };

    suggestions.push({
      goal_text: composeGoalText(easyFields),
      smart_specific: easyFields.specific,
      smart_measurable: easyFields.measurable,
      smart_achievable: easyFields.achievable,
      smart_relevant: easyFields.relevant,
      smart_timebound: easyFields.timebound,
      difficulty: classifyDifficulty(easyRate),
      cohort_completion_rate: easyRate,
    });

    // Goal 2: Moderate — practice/review with moderate cohort completion
    const moderateRate = cohortRates.moderate ?? 65;
    const moderateSpecific = nearestDeadline
      ? `Score at least 70% on ${nearestDeadline.assignment_title} in ${nearestDeadline.course_name}`
      : `Complete 3 practice exercises for ${secondaryCourse.course_name}`;
    const moderateFields = {
      specific: moderateSpecific,
      measurable: 'Assignment score of 70% or higher',
      achievable: `Your self-efficacy score of ${selfEfficacyScore} suggests this is within reach with consistent effort`,
      relevant: nearestDeadline?.course_name ?? secondaryCourse.course_name,
      timebound: nearestDeadline?.due_date ?? week_end,
    };

    suggestions.push({
      goal_text: composeGoalText(moderateFields),
      smart_specific: moderateFields.specific,
      smart_measurable: moderateFields.measurable,
      smart_achievable: moderateFields.achievable,
      smart_relevant: moderateFields.relevant,
      smart_timebound: moderateFields.timebound,
      difficulty: classifyDifficulty(moderateRate),
      cohort_completion_rate: moderateRate,
    });

    // Goal 3: Ambitious — stretch goal with low cohort completion
    const ambitiousRate = cohortRates.ambitious ?? 35;
    const ambitiousSpecific = lowestAttainment
      ? `Achieve 85% attainment on ${lowestAttainment.clo_title ?? 'the lowest-scoring learning outcome'} in ${lowestAttainment.course_name}`
      : `Master all key concepts in ${primaryCourse.course_name} and achieve top-tier performance`;
    const ambitiousFields = {
      specific: ambitiousSpecific,
      measurable: lowestAttainment
        ? `Attainment score of 85% or higher (currently ${Math.round(lowestAttainment.avg_attainment)}%)`
        : 'Score in the top 15% of the class on this week\'s assessments',
      achievable: `This is a stretch goal — only ${ambitiousRate}% of similar students achieve this, but your dedication can make the difference`,
      relevant: lowestAttainment?.course_name ?? primaryCourse.course_name,
      timebound: week_end,
    };

    suggestions.push({
      goal_text: composeGoalText(ambitiousFields),
      smart_specific: ambitiousFields.specific,
      smart_measurable: ambitiousFields.measurable,
      smart_achievable: ambitiousFields.achievable,
      smart_relevant: ambitiousFields.relevant,
      smart_timebound: ambitiousFields.timebound,
      difficulty: classifyDifficulty(ambitiousRate),
      cohort_completion_rate: ambitiousRate,
    });

    // ── 3.3.7 INSERT suggestions into goal_suggestions table ────────────

    const rows = suggestions.map((s) => ({
      student_id,
      week_start,
      goal_text: s.goal_text,
      smart_specific: s.smart_specific,
      smart_measurable: s.smart_measurable,
      smart_achievable: s.smart_achievable,
      smart_relevant: s.smart_relevant,
      smart_timebound: s.smart_timebound,
      difficulty: s.difficulty,
      cohort_completion_rate: s.cohort_completion_rate,
      status: 'suggested',
    }));

    const { error: insertErr } = await supabase
      .from('goal_suggestions')
      .insert(rows);

    if (insertErr) {
      console.error('Failed to insert goal suggestions:', insertErr.message);
      return new Response(
        JSON.stringify({ error: 'Failed to save goal suggestions', detail: insertErr.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({ success: true, suggestions }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
