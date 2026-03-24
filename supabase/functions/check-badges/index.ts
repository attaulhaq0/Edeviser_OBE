import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const allowedOrigin = Deno.env.get('ALLOWED_ORIGIN') ?? 'https://edeviser.vercel.app';

const corsHeaders = {
  'Access-Control-Allow-Origin': allowedOrigin,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ─── Types ──────────────────────────────────────────────────────────────────

type BadgeTrigger = 'xp_award' | 'submission' | 'streak_update' | 'grade' | 'journal' | 'habit_log';

interface CheckBadgesPayload {
  student_id: string;
  trigger: BadgeTrigger;
  context?: Record<string, unknown>;
}

interface BadgeDef {
  id: string;
  name: string;
  xpReward: number;
}

// ─── Badge Definitions (server-side only) ───────────────────────────────────
// Duplicated from src/lib/badgeDefinitions.ts for Deno runtime (no npm imports)

const BADGE_XP: Record<string, number> = {
  streak_7: 50,
  streak_14: 75,
  streak_30: 100,
  streak_60: 150,
  streak_100: 250,
  first_submission: 25,
  perfect_score: 75,
  all_clos_met: 100,
  journal_10: 50,
  perfect_week: 100,
  speed_demon: 75,
  night_owl: 75,
  perfectionist: 100,
  habit_master: 100,
  wellness_warrior: 75,
  full_spectrum: 150,
  bloom_explorer: 75,
  bloom_challenger: 100,
  bloom_pioneer: 150,
};

// ─── Validation ─────────────────────────────────────────────────────────────

const VALID_TRIGGERS: BadgeTrigger[] = [
  'xp_award', 'submission', 'streak_update', 'grade', 'journal', 'habit_log',
];

function validatePayload(
  payload: unknown,
): { valid: true; data: CheckBadgesPayload } | { valid: false; error: string } {
  if (!payload || typeof payload !== 'object') {
    return { valid: false, error: 'Request body must be a JSON object' };
  }

  const p = payload as Record<string, unknown>;

  if (!p.student_id || typeof p.student_id !== 'string') {
    return { valid: false, error: 'student_id is required and must be a string' };
  }

  if (!p.trigger || typeof p.trigger !== 'string' || !VALID_TRIGGERS.includes(p.trigger as BadgeTrigger)) {
    return { valid: false, error: `trigger is required and must be one of: ${VALID_TRIGGERS.join(', ')}` };
  }

  return {
    valid: true,
    data: {
      student_id: p.student_id as string,
      trigger: p.trigger as BadgeTrigger,
      context: (p.context && typeof p.context === 'object') ? p.context as Record<string, unknown> : undefined,
    },
  };
}

// ─── Badge Condition Checkers ───────────────────────────────────────────────

interface SupabaseClient {
  from: (table: string) => unknown;
  functions: { invoke: (name: string, options: { body: unknown }) => Promise<unknown> };
}

async function checkStreakBadges(
  supabase: ReturnType<typeof createClient>,
  studentId: string,
  existingBadgeIds: Set<string>,
): Promise<string[]> {
  const newBadges: string[] = [];

  const { data: gamification } = await supabase
    .from('student_gamification')
    .select('streak_count')
    .eq('student_id', studentId)
    .maybeSingle();

  if (!gamification) return newBadges;

  const streakCount = gamification.streak_count ?? 0;
  const streakBadges: Array<{ id: string; threshold: number }> = [
    { id: 'streak_7', threshold: 7 },
    { id: 'streak_14', threshold: 14 },
    { id: 'streak_30', threshold: 30 },
    { id: 'streak_60', threshold: 60 },
    { id: 'streak_100', threshold: 100 },
  ];

  for (const badge of streakBadges) {
    if (streakCount >= badge.threshold && !existingBadgeIds.has(badge.id)) {
      newBadges.push(badge.id);
    }
  }

  return newBadges;
}

async function checkAcademicBadges(
  supabase: ReturnType<typeof createClient>,
  studentId: string,
  existingBadgeIds: Set<string>,
): Promise<string[]> {
  const newBadges: string[] = [];

  // First Submission badge
  if (!existingBadgeIds.has('first_submission')) {
    const { count } = await supabase
      .from('submissions')
      .select('id', { count: 'exact', head: true })
      .eq('student_id', studentId);

    if (count !== null && count >= 1) {
      newBadges.push('first_submission');
    }
  }

  // Perfect Score badge — score 100% on any grade
  if (!existingBadgeIds.has('perfect_score')) {
    const { data: perfectGrades } = await supabase
      .from('grades')
      .select('id, submission_id')
      .eq('score_percent', 100)
      .limit(1);

    if (perfectGrades && perfectGrades.length > 0) {
      // Verify the grade belongs to this student via submission
      const { data: submission } = await supabase
        .from('submissions')
        .select('id')
        .eq('student_id', studentId)
        .in('id', perfectGrades.map((g: { submission_id: string }) => g.submission_id))
        .limit(1);

      if (submission && submission.length > 0) {
        newBadges.push('perfect_score');
      }
    }
  }

  // All CLOs Met badge — ≥70% on all CLOs in any course
  if (!existingBadgeIds.has('all_clos_met')) {
    // Get courses the student is enrolled in
    const { data: enrollments } = await supabase
      .from('student_courses')
      .select('course_id')
      .eq('student_id', studentId)
      .eq('status', 'active');

    if (enrollments && enrollments.length > 0) {
      for (const enrollment of enrollments) {
        // Get all CLOs for this course
        const { data: clos } = await supabase
          .from('learning_outcomes')
          .select('id')
          .eq('course_id', enrollment.course_id)
          .eq('type', 'CLO');

        if (!clos || clos.length === 0) continue;

        // Get attainment for all CLOs in this course for this student
        const { data: attainments } = await supabase
          .from('outcome_attainment')
          .select('outcome_id, attainment_percent')
          .eq('student_id', studentId)
          .eq('course_id', enrollment.course_id)
          .eq('scope', 'student_course')
          .in('outcome_id', clos.map((c: { id: string }) => c.id));

        if (!attainments || attainments.length < clos.length) continue;

        const allMet = attainments.every(
          (a: { attainment_percent: number }) => a.attainment_percent >= 70,
        );

        if (allMet) {
          newBadges.push('all_clos_met');
          break; // Only need one course to qualify
        }
      }
    }
  }

  return newBadges;
}

async function checkEngagementBadges(
  supabase: ReturnType<typeof createClient>,
  studentId: string,
  existingBadgeIds: Set<string>,
): Promise<string[]> {
  const newBadges: string[] = [];

  // Journal 10 badge
  if (!existingBadgeIds.has('journal_10')) {
    const { count } = await supabase
      .from('journal_entries')
      .select('id', { count: 'exact', head: true })
      .eq('student_id', studentId);

    if (count !== null && count >= 10) {
      newBadges.push('journal_10');
    }
  }

  // Perfect Week badge — all 4 habits for 7 consecutive days
  if (!existingBadgeIds.has('perfect_week')) {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    const startDate = sevenDaysAgo.toISOString().slice(0, 10);

    const { data: habitLogs } = await supabase
      .from('habit_logs')
      .select('date, habit_type')
      .eq('student_id', studentId)
      .gte('date', startDate)
      .not('completed_at', 'is', null);

    if (habitLogs && habitLogs.length > 0) {
      // Group by date and check if all 4 habits completed each day
      const habitsByDate = new Map<string, Set<string>>();
      for (const log of habitLogs) {
        const dateStr = log.date as string;
        if (!habitsByDate.has(dateStr)) {
          habitsByDate.set(dateStr, new Set());
        }
        habitsByDate.get(dateStr)!.add(log.habit_type as string);
      }

      // Check for 7 consecutive perfect days
      let consecutivePerfectDays = 0;
      const today = new Date();
      for (let i = 6; i >= 0; i--) {
        const checkDate = new Date(today);
        checkDate.setDate(today.getDate() - i);
        const dateStr = checkDate.toISOString().slice(0, 10);
        const habits = habitsByDate.get(dateStr);
        if (habits && habits.size >= 4) {
          consecutivePerfectDays++;
        } else {
          consecutivePerfectDays = 0;
        }
      }

      if (consecutivePerfectDays >= 7) {
        newBadges.push('perfect_week');
      }
    }
  }

  return newBadges;
}

// ─── Mystery Badge Checkers (hidden conditions) ─────────────────────────────

async function checkMysteryBadges(
  supabase: ReturnType<typeof createClient>,
  studentId: string,
  existingBadgeIds: Set<string>,
): Promise<string[]> {
  const newBadges: string[] = [];

  // Speed Demon — submit an assignment within 1 hour of it being published
  if (!existingBadgeIds.has('speed_demon')) {
    const { data: submissions } = await supabase
      .from('submissions')
      .select('id, assignment_id, submitted_at')
      .eq('student_id', studentId)
      .order('submitted_at', { ascending: false })
      .limit(50);

    if (submissions && submissions.length > 0) {
      for (const sub of submissions) {
        const { data: assignment } = await supabase
          .from('assignments')
          .select('created_at')
          .eq('id', sub.assignment_id)
          .maybeSingle();

        if (assignment) {
          const publishedAt = new Date(assignment.created_at).getTime();
          const submittedAt = new Date(sub.submitted_at).getTime();
          const diffHours = (submittedAt - publishedAt) / (1000 * 60 * 60);

          if (diffHours >= 0 && diffHours <= 1) {
            newBadges.push('speed_demon');
            break;
          }
        }
      }
    }
  }

  // Night Owl — submit 3 assignments between midnight and 5 AM
  if (!existingBadgeIds.has('night_owl')) {
    const { data: submissions } = await supabase
      .from('submissions')
      .select('submitted_at')
      .eq('student_id', studentId);

    if (submissions && submissions.length > 0) {
      let nightSubmissions = 0;
      for (const sub of submissions) {
        const hour = new Date(sub.submitted_at).getUTCHours();
        if (hour >= 0 && hour < 5) {
          nightSubmissions++;
        }
      }

      if (nightSubmissions >= 3) {
        newBadges.push('night_owl');
      }
    }
  }

  // Perfectionist — score 100% on 5 different assignments
  if (!existingBadgeIds.has('perfectionist')) {
    // Get all student submissions
    const { data: studentSubmissions } = await supabase
      .from('submissions')
      .select('id')
      .eq('student_id', studentId);

    if (studentSubmissions && studentSubmissions.length > 0) {
      const submissionIds = studentSubmissions.map((s: { id: string }) => s.id);

      const { data: perfectGrades } = await supabase
        .from('grades')
        .select('submission_id')
        .eq('score_percent', 100)
        .in('submission_id', submissionIds);

      if (perfectGrades && perfectGrades.length >= 5) {
        newBadges.push('perfectionist');
      }
    }
  }

  return newBadges;
}

// ─── Habit Badge Checkers ────────────────────────────────────────────────────

async function checkHabitBadges(
  supabase: ReturnType<typeof createClient>,
  studentId: string,
  existingBadgeIds: Set<string>,
): Promise<string[]> {
  const newBadges: string[] = [];

  const now = new Date();
  const yearStart = `${now.getFullYear()}-01-01`;
  const yearEnd = `${now.getFullYear()}-12-31`;

  let semesterStart = yearStart;
  let semesterEnd = yearEnd;

  const { data: semester } = await supabase
    .from('semesters')
    .select('start_date, end_date')
    .lte('start_date', now.toISOString().slice(0, 10))
    .gte('end_date', now.toISOString().slice(0, 10))
    .maybeSingle();

  if (semester) {
    semesterStart = semester.start_date;
    semesterEnd = semester.end_date;
  }

  if (!existingBadgeIds.has('habit_master')) {
    const { data: academicDays } = await supabase
      .from('habit_tracking')
      .select('habit_date')
      .eq('student_id', studentId)
      .gte('habit_date', semesterStart)
      .lte('habit_date', semesterEnd)
      .or('login.eq.true,submit.eq.true,journal.eq.true,read_content.eq.true');

    const { data: wellnessDays } = await supabase
      .from('wellness_habit_logs')
      .select('date')
      .eq('student_id', studentId)
      .gte('date', semesterStart)
      .lte('date', semesterEnd);

    const activeDates = new Set<string>();
    if (academicDays) {
      for (const row of academicDays) {
        activeDates.add(row.habit_date as string);
      }
    }
    if (wellnessDays) {
      for (const row of wellnessDays) {
        activeDates.add(row.date as string);
      }
    }

    if (activeDates.size >= 30) {
      newBadges.push('habit_master');
    }
  }

  if (!existingBadgeIds.has('wellness_warrior')) {
    const { data: wellnessLogs } = await supabase
      .from('wellness_habit_logs')
      .select('date')
      .eq('student_id', studentId)
      .order('date', { ascending: true });

    if (wellnessLogs && wellnessLogs.length > 0) {
      const distinctDates = [...new Set(wellnessLogs.map((l: { date: string }) => l.date))].sort() as string[];

      let longestConsecutive = 1;
      let currentConsecutive = 1;

      for (let i = 1; i < distinctDates.length; i++) {
        const prevDate = new Date(distinctDates[i - 1]);
        const currDate = new Date(distinctDates[i]);
        const diffMs = currDate.getTime() - prevDate.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);

        if (diffDays === 1) {
          currentConsecutive++;
          longestConsecutive = Math.max(longestConsecutive, currentConsecutive);
        } else {
          currentConsecutive = 1;
        }
      }

      if (longestConsecutive >= 14) {
        newBadges.push('wellness_warrior');
      }
    }
  }

  if (!existingBadgeIds.has('full_spectrum')) {
    const { data: perfectAcademicDays } = await supabase
      .from('habit_tracking')
      .select('habit_date')
      .eq('student_id', studentId)
      .eq('login', true)
      .eq('submit', true)
      .eq('journal', true)
      .eq('read_content', true)
      .gte('habit_date', semesterStart)
      .lte('habit_date', semesterEnd);

    if (perfectAcademicDays && perfectAcademicDays.length > 0) {
      const perfectDates = new Set(
        perfectAcademicDays.map((d: { habit_date: string }) => d.habit_date),
      );

      const { data: wellnessDates } = await supabase
        .from('wellness_habit_logs')
        .select('date')
        .eq('student_id', studentId)
        .gte('date', semesterStart)
        .lte('date', semesterEnd);

      if (wellnessDates) {
        const wellnessDateSet = new Set(
          wellnessDates.map((d: { date: string }) => d.date),
        );

        let fullSpectrumDays = 0;
        for (const date of perfectDates) {
          if (wellnessDateSet.has(date)) {
            fullSpectrumDays++;
          }
        }

        if (fullSpectrumDays >= 7) {
          newBadges.push('full_spectrum');
        }
      }
    }
  }

  return newBadges;
}

// ─── Bloom's Progression Badge Checkers ─────────────────────────────────

async function checkBloomsBadges(
  supabase: ReturnType<typeof createClient>,
  studentId: string,
  existingBadgeIds: Set<string>,
): Promise<string[]> {
  const newBadges: string[] = [];

  if (
    existingBadgeIds.has('bloom_explorer') &&
    existingBadgeIds.has('bloom_challenger') &&
    existingBadgeIds.has('bloom_pioneer')
  ) {
    return newBadges;
  }

  const { data: progressions } = await supabase
    .from('blooms_progression')
    .select('bloom_explorer_awarded, bloom_challenger_awarded, bloom_pioneer_awarded')
    .eq('student_id', studentId)
    .or(
      'bloom_explorer_awarded.eq.true,bloom_challenger_awarded.eq.true,bloom_pioneer_awarded.eq.true',
    );

  if (!progressions || progressions.length === 0) return newBadges;

  let hasExplorer = false;
  let hasChallenger = false;
  let hasPioneer = false;

  for (const row of progressions) {
    if (row.bloom_explorer_awarded) hasExplorer = true;
    if (row.bloom_challenger_awarded) hasChallenger = true;
    if (row.bloom_pioneer_awarded) hasPioneer = true;
  }

  if (hasExplorer && !existingBadgeIds.has('bloom_explorer')) {
    newBadges.push('bloom_explorer');
  }
  if (hasChallenger && !existingBadgeIds.has('bloom_challenger')) {
    newBadges.push('bloom_challenger');
  }
  if (hasPioneer && !existingBadgeIds.has('bloom_pioneer')) {
    newBadges.push('bloom_pioneer');
  }

  return newBadges;
}

// ─── Peer Milestone Notification for Rare Badges ────────────────────────────

const BADGE_DISPLAY_NAMES: Record<string, string> = {
  streak_30: '30-Day Legend',
  streak_60: '60-Day Legend',
  streak_100: '100-Day Legend',
  speed_demon: 'Speed Demon',
  night_owl: 'Night Owl',
  perfectionist: 'Perfectionist',
  bloom_explorer: "Bloom's Explorer",
  bloom_challenger: "Bloom's Challenger",
  bloom_pioneer: "Bloom's Pioneer",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function notifyPeersOfRareBadge(supabase: any, studentId: string, badgeIds: string[]): Promise<void> {
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

  // Create a notification per rare badge per peer
  const notifications = [];
  for (const badgeId of badgeIds) {
    const badgeName = BADGE_DISPLAY_NAMES[badgeId] ?? badgeId;
    const message = `${studentName} just earned the ${badgeName} badge!`;

    for (const peerId of peerIds) {
      notifications.push({
        user_id: peerId,
        type: 'peer_milestone',
        title: 'Badge Achievement',
        message,
        is_read: false,
        metadata: {
          milestone_type: 'rare_badge',
          triggering_student_id: studentId,
          badge_id: badgeId,
        },
      });
    }
  }

  if (notifications.length > 0) {
    const { error } = await supabase.from('notifications').insert(notifications);
    if (error) {
      console.error('Failed to insert peer badge notifications:', error.message);
    }
  }
}

// ─── Main Handler ───────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // ── Auth: require service role or teacher/admin ──────────────────
    const authHeader = req.headers.get('Authorization') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const isServiceRole = serviceRoleKey && authHeader.includes(serviceRoleKey);

    if (!isServiceRole) {
      if (!authHeader) {
        return new Response(
          JSON.stringify({ error: 'Missing authorization header' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
      const userClient = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: authHeader } } },
      );
      const { data: { user: caller }, error: authError } = await userClient.auth.getUser();
      if (authError || !caller) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
    }

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

    const { student_id, trigger } = validation.data;

    // ── Step 1: Fetch existing badges for this student ──────────────────

    const { data: existingBadges, error: fetchErr } = await supabase
      .from('student_badges')
      .select('badge_id')
      .eq('student_id', student_id);

    if (fetchErr) {
      console.error('Failed to fetch existing badges:', fetchErr.message);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch existing badges', detail: fetchErr.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const existingBadgeIds = new Set(
      (existingBadges ?? []).map((b: { badge_id: string }) => b.badge_id),
    );

    // ── Step 2: Check badge conditions based on trigger ─────────────────

    const newBadgeIds: string[] = [];

    // Streak badges — check on streak_update or xp_award
    if (trigger === 'streak_update' || trigger === 'xp_award') {
      const streakBadges = await checkStreakBadges(supabase, student_id, existingBadgeIds);
      newBadgeIds.push(...streakBadges);
    }

    // Academic badges — check on submission, grade
    if (trigger === 'submission' || trigger === 'grade') {
      const academicBadges = await checkAcademicBadges(supabase, student_id, existingBadgeIds);
      newBadgeIds.push(...academicBadges);
    }

    // Engagement badges — check on journal, xp_award
    if (trigger === 'journal' || trigger === 'xp_award') {
      const engagementBadges = await checkEngagementBadges(supabase, student_id, existingBadgeIds);
      newBadgeIds.push(...engagementBadges);
    }

    // Habit badges — check on habit_log trigger
    if (trigger === 'habit_log') {
      const habitBadges = await checkHabitBadges(supabase, student_id, existingBadgeIds);
      newBadgeIds.push(...habitBadges);
    }

    // Mystery badges — always check on any trigger
    const mysteryBadges = await checkMysteryBadges(supabase, student_id, existingBadgeIds);
    newBadgeIds.push(...mysteryBadges);

    // Bloom's progression badges — check on grade or submission (quiz attempt completion)
    if (trigger === 'grade' || trigger === 'submission') {
      const bloomsBadges = await checkBloomsBadges(supabase, student_id, existingBadgeIds);
      newBadgeIds.push(...bloomsBadges);
    }

    // ── Step 3: Insert new badges idempotently ──────────────────────────

    const awardedBadges: string[] = [];

    for (const badgeId of newBadgeIds) {
      const { error: insertErr } = await supabase
        .from('student_badges')
        .insert({
          student_id,
          badge_id: badgeId,
          awarded_at: new Date().toISOString(),
        })
        .select()
        .maybeSingle();

      // If insert fails due to unique constraint, badge already exists — skip
      if (insertErr) {
        if (insertErr.code === '23505') {
          // Unique violation — idempotent, badge already awarded
          continue;
        }
        console.error(`Failed to insert badge ${badgeId}:`, insertErr.message);
        continue;
      }

      awardedBadges.push(badgeId);

      // Award badge XP
      const xpReward = BADGE_XP[badgeId] ?? 0;
      if (xpReward > 0) {
        try {
          await supabase.functions.invoke('award-xp', {
            body: {
              student_id,
              xp_amount: xpReward,
              source: 'badge',
              reference_id: badgeId,
              note: `Badge earned: ${badgeId}`,
            },
          });
        } catch (xpErr) {
          // Log but don't fail badge award
          console.error(`Failed to award XP for badge ${badgeId}:`, (xpErr as Error).message);
        }
      }
    }

    // ── Step 4: Notify peers of rare badge awards ─────────────────────

    const RARE_BADGES = new Set([
      'streak_30', 'streak_60', 'streak_100',
      'speed_demon', 'night_owl', 'perfectionist',
      'bloom_explorer', 'bloom_challenger', 'bloom_pioneer',
    ]);

    const rareBadgesAwarded = awardedBadges.filter((b) => RARE_BADGES.has(b));
    if (rareBadgesAwarded.length > 0) {
      notifyPeersOfRareBadge(supabase, student_id, rareBadgesAwarded).catch((err) => {
        console.error('Peer badge notification failed:', err);
      });
    }

    // ── Step 5: Get total badge count ───────────────────────────────────

    const totalBadges = existingBadgeIds.size + awardedBadges.length;

    // ── Response ────────────────────────────────────────────────────────

    return new Response(
      JSON.stringify({
        success: true,
        new_badges: awardedBadges,
        total_badges: totalBadges,
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
