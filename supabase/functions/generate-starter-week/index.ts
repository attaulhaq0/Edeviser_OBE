import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ─── Types ──────────────────────────────────────────────────────────────────

interface GenerateStarterWeekRequest {
  student_id: string;
  self_efficacy_score: number; // 0-100
  enrolled_course_ids: string[]; // optional, will fetch if empty
}

interface StarterWeekSession {
  course_id: string | null;
  session_type: 'reading' | 'practice' | 'review' | 'exploration';
  suggested_date: string; // ISO date
  suggested_time_slot: 'morning' | 'afternoon' | 'evening';
  duration_minutes: number;
  description: string;
}

interface CourseWithDeadline {
  course_id: string;
  course_name: string;
  nearest_deadline_days: number | null; // days until nearest deadline, null = no deadline
}

// ─── Constants ──────────────────────────────────────────────────────────────

const SELF_EFFICACY_TIER_THRESHOLDS = {
  low: 40,
  moderate: 70,
} as const;

const STARTER_SESSION_TIERS = {
  low: { sessions: 5, duration: 25 },
  moderate: { sessions: 4, duration: 35 },
  high: { sessions: 3, duration: 45 },
} as const;

const SESSION_TYPES = ['reading', 'practice', 'review', 'exploration'] as const;
const TIME_SLOTS = ['morning', 'afternoon', 'evening'] as const;

const DEADLINE_PROXIMITY = {
  imminent: 3,  // days — review sessions
  mid: 7,       // days — practice sessions
  // > 7 days — reading sessions
} as const;

// ─── Helpers ────────────────────────────────────────────────────────────────

function isValidUUID(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function validatePayload(
  payload: unknown,
): { valid: true; data: GenerateStarterWeekRequest } | { valid: false; error: string } {
  if (!payload || typeof payload !== 'object') {
    return { valid: false, error: 'Request body must be a JSON object' };
  }

  const body = payload as Record<string, unknown>;

  if (typeof body.student_id !== 'string' || !isValidUUID(body.student_id)) {
    return { valid: false, error: 'student_id must be a valid UUID' };
  }

  if (typeof body.self_efficacy_score !== 'number' || body.self_efficacy_score < 0 || body.self_efficacy_score > 100) {
    return { valid: false, error: 'self_efficacy_score must be a number between 0 and 100' };
  }

  const enrolled_course_ids = Array.isArray(body.enrolled_course_ids) ? body.enrolled_course_ids : [];
  for (const id of enrolled_course_ids) {
    if (typeof id !== 'string' || !isValidUUID(id)) {
      return { valid: false, error: `Invalid course ID: ${id}` };
    }
  }

  return {
    valid: true,
    data: {
      student_id: body.student_id,
      self_efficacy_score: body.self_efficacy_score,
      enrolled_course_ids,
    },
  };
}

/**
 * Determine the self-efficacy tier based on score.
 * Low: 0–39, Moderate: 40–69, High: 70–100
 */
function getSelfEfficacyTier(score: number): 'low' | 'moderate' | 'high' {
  if (score < SELF_EFFICACY_TIER_THRESHOLDS.low) return 'low';
  if (score < SELF_EFFICACY_TIER_THRESHOLDS.moderate) return 'moderate';
  return 'high';
}

/**
 * Determine session type based on deadline proximity.
 * - Imminent (≤3 days): review
 * - Mid-range (4–7 days): practice
 * - Distant (>7 days): reading
 * - No deadline: exploration
 */
function getSessionType(deadlineDays: number | null): StarterWeekSession['session_type'] {
  if (deadlineDays === null) return 'exploration';
  if (deadlineDays <= DEADLINE_PROXIMITY.imminent) return 'review';
  if (deadlineDays <= DEADLINE_PROXIMITY.mid) return 'practice';
  return 'reading';
}

/**
 * Generate a human-readable description for a session.
 */
function generateDescription(
  sessionType: StarterWeekSession['session_type'],
  courseName: string | null,
  deadlineDays: number | null,
): string {
  if (!courseName) {
    switch (sessionType) {
      case 'exploration':
        return 'Explore your course materials and familiarize yourself with the platform';
      case 'reading':
        return 'Review study techniques and plan your learning approach for the semester';
      case 'practice':
        return 'Practice organizing your study schedule and setting up your workspace';
      case 'review':
        return 'Review your onboarding results and set initial learning goals';
    }
  }

  switch (sessionType) {
    case 'review':
      return `Review key concepts for ${courseName} — deadline in ${deadlineDays} day${deadlineDays === 1 ? '' : 's'}`;
    case 'practice':
      return `Practice exercises for ${courseName} to prepare for upcoming assignments`;
    case 'reading':
      return `Read ahead in ${courseName} materials to build foundational understanding`;
    case 'exploration':
      return `Explore additional resources and supplementary materials for ${courseName}`;
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

    const { student_id, self_efficacy_score, enrolled_course_ids } = validation.data;

    // ── 3.2.1 JWT validation and student_id verification ────────────────

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

    // ── 3.2.2 Fetch enrolled courses with schedules and upcoming deadlines (14 days) ──

    let courseIds = enrolled_course_ids;

    // If no course IDs provided, fetch from student_courses
    if (courseIds.length === 0) {
      const { data: enrollments, error: enrollErr } = await supabase
        .from('student_courses')
        .select('course_id')
        .eq('student_id', student_id);

      if (enrollErr) {
        console.error('Failed to fetch enrollments:', enrollErr.message);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch enrolled courses', detail: enrollErr.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      courseIds = (enrollments ?? []).map((e: { course_id: string }) => e.course_id);
    }

    // ── 3.2.7 Handle edge case: no enrolled courses → generate generic study habit sessions ──

    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);

    if (courseIds.length === 0) {
      const tier = getSelfEfficacyTier(self_efficacy_score);
      const { sessions: sessionCount, duration } = STARTER_SESSION_TIERS[tier];

      const genericSessions: StarterWeekSession[] = [];
      const genericTypes: StarterWeekSession['session_type'][] = [
        'exploration', 'reading', 'practice', 'review', 'exploration',
      ];

      for (let i = 0; i < sessionCount; i++) {
        const sessionDate = new Date(today);
        sessionDate.setDate(today.getDate() + i + 1); // start from tomorrow
        genericSessions.push({
          course_id: null,
          session_type: genericTypes[i % genericTypes.length],
          suggested_date: sessionDate.toISOString().slice(0, 10),
          suggested_time_slot: TIME_SLOTS[i % TIME_SLOTS.length],
          duration_minutes: duration,
          description: generateDescription(genericTypes[i % genericTypes.length], null, null),
        });
      }

      // INSERT generic sessions
      const rows = genericSessions.map((s) => ({
        student_id,
        course_id: s.course_id,
        session_type: s.session_type,
        suggested_date: s.suggested_date,
        suggested_time_slot: s.suggested_time_slot,
        duration_minutes: s.duration_minutes,
        description: s.description,
        status: 'suggested',
      }));

      const { error: insertErr } = await supabase
        .from('starter_week_sessions')
        .insert(rows);

      if (insertErr) {
        console.error('Failed to insert generic sessions:', insertErr.message);
        return new Response(
          JSON.stringify({ error: 'Failed to save starter week sessions', detail: insertErr.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      return new Response(
        JSON.stringify({ success: true, sessions: genericSessions }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Fetch course details
    const { data: courses, error: coursesErr } = await supabase
      .from('courses')
      .select('id, name')
      .in('id', courseIds);

    if (coursesErr) {
      console.error('Failed to fetch courses:', coursesErr.message);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch course details', detail: coursesErr.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const courseMap = new Map(
      (courses ?? []).map((c: { id: string; name: string }) => [c.id, c.name]),
    );

    // Fetch upcoming deadlines (next 14 days)
    const fourteenDaysLater = new Date(today);
    fourteenDaysLater.setDate(today.getDate() + 14);
    const deadlineCutoff = fourteenDaysLater.toISOString().slice(0, 10);

    const { data: assignments, error: assignmentsErr } = await supabase
      .from('assignments')
      .select('id, course_id, due_date')
      .in('course_id', courseIds)
      .gte('due_date', todayStr)
      .lte('due_date', deadlineCutoff)
      .order('due_date', { ascending: true });

    if (assignmentsErr) {
      console.error('Failed to fetch assignments:', assignmentsErr.message);
      // Non-fatal — proceed without deadline data
    }

    // Build course-to-nearest-deadline map
    const courseDeadlines = new Map<string, number>();
    for (const a of (assignments ?? [])) {
      const dueDate = new Date(a.due_date as string);
      const daysUntil = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      const existing = courseDeadlines.get(a.course_id as string);
      if (existing === undefined || daysUntil < existing) {
        courseDeadlines.set(a.course_id as string, daysUntil);
      }
    }

    // ── 3.2.3 Fetch historical cohort study patterns for similar courses ──

    const { data: cohortPatterns, error: cohortErr } = await supabase
      .from('starter_week_sessions')
      .select('course_id, session_type, suggested_time_slot')
      .in('course_id', courseIds)
      .eq('status', 'completed')
      .limit(100);

    if (cohortErr) {
      console.error('Failed to fetch cohort patterns:', cohortErr.message);
      // Non-fatal — proceed without cohort data
    }

    // Determine preferred time slots from cohort data
    const slotCounts: Record<string, number> = { morning: 0, afternoon: 0, evening: 0 };
    for (const p of (cohortPatterns ?? [])) {
      const slot = p.suggested_time_slot as string;
      if (slot in slotCounts) {
        slotCounts[slot]++;
      }
    }

    // ── 3.2.4 Determine session count and duration based on self-efficacy tier ──

    const tier = getSelfEfficacyTier(self_efficacy_score);
    const { sessions: sessionCount, duration } = STARTER_SESSION_TIERS[tier];

    // ── 3.2.5 Distribute sessions across 7-day window, assign session types ──

    // Build a list of courses sorted by deadline proximity (nearest first)
    const coursesWithDeadlines: CourseWithDeadline[] = courseIds.map((cid) => ({
      course_id: cid,
      course_name: courseMap.get(cid) ?? 'Unknown Course',
      nearest_deadline_days: courseDeadlines.get(cid) ?? null,
    }));

    // Sort: courses with deadlines first (nearest first), then courses without deadlines
    coursesWithDeadlines.sort((a, b) => {
      if (a.nearest_deadline_days === null && b.nearest_deadline_days === null) return 0;
      if (a.nearest_deadline_days === null) return 1;
      if (b.nearest_deadline_days === null) return -1;
      return a.nearest_deadline_days - b.nearest_deadline_days;
    });

    const sessions: StarterWeekSession[] = [];

    for (let i = 0; i < sessionCount; i++) {
      // Round-robin across courses, prioritizing those with nearest deadlines
      const courseInfo = coursesWithDeadlines[i % coursesWithDeadlines.length];

      // Distribute across 7-day window starting from tomorrow
      const dayOffset = Math.floor((i * 7) / sessionCount) + 1;
      const sessionDate = new Date(today);
      sessionDate.setDate(today.getDate() + dayOffset);

      const sessionType = getSessionType(courseInfo.nearest_deadline_days);
      const timeSlot = TIME_SLOTS[i % TIME_SLOTS.length];

      sessions.push({
        course_id: courseInfo.course_id,
        session_type: sessionType,
        suggested_date: sessionDate.toISOString().slice(0, 10),
        suggested_time_slot: timeSlot,
        duration_minutes: duration,
        description: generateDescription(sessionType, courseInfo.course_name, courseInfo.nearest_deadline_days),
      });
    }

    // ── 3.2.6 INSERT sessions into starter_week_sessions table ──────────

    const rows = sessions.map((s) => ({
      student_id,
      course_id: s.course_id,
      session_type: s.session_type,
      suggested_date: s.suggested_date,
      suggested_time_slot: s.suggested_time_slot,
      duration_minutes: s.duration_minutes,
      description: s.description,
      status: 'suggested',
    }));

    const { error: insertErr } = await supabase
      .from('starter_week_sessions')
      .insert(rows);

    if (insertErr) {
      console.error('Failed to insert starter week sessions:', insertErr.message);
      return new Response(
        JSON.stringify({ error: 'Failed to save starter week sessions', detail: insertErr.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({ success: true, sessions }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
