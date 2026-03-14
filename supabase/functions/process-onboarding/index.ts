import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ─── Types ──────────────────────────────────────────────────────────────────

type SkippableSection = 'personality' | 'learning_style' | 'baseline' | 'self_efficacy' | 'study_strategy';

interface ProcessOnboardingRequest {
  student_id: string;
  assessment_version: number;
  skipped_sections: SkippableSection[];
  baseline_course_ids: string[];
  is_day1: boolean;
}

interface BigFiveTraits {
  openness: number;
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;
}

interface VARKProfile {
  visual: number;
  auditory: number;
  read_write: number;
  kinesthetic: number;
  dominant_style: 'visual' | 'auditory' | 'read_write' | 'kinesthetic' | 'multimodal';
}

interface SelfEfficacyProfile {
  overall: number;
  general_academic: number;
  course_specific: number;
  self_regulated_learning: number;
}

interface StudyStrategyProfile {
  time_management: number;
  elaboration: number;
  self_testing: number;
  help_seeking: number;
}

interface BaselineResult {
  course_id: string;
  clo_scores: Array<{ clo_id: string; score: number; question_count: number; correct_count: number }>;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const MULTIMODAL_THRESHOLD = 10;

const ONBOARDING_XP: Record<string, number> = {
  personality: 25,
  learning_style: 25,
  self_efficacy: 25,
  study_strategy: 25,
  baseline_per_course: 20,
  complete: 50,
};

/** Micro-assessment schedule: maps day number (2–14) to assessment type */
const MICRO_ASSESSMENT_SCHEDULE: Record<number, string> = {
  2: 'personality',
  3: 'personality',
  4: 'self_efficacy',
  5: 'personality',
  6: 'study_strategy',
  7: 'study_strategy',
  8: 'personality',
  9: 'learning_style',
  10: 'learning_style',
  11: 'self_efficacy',
  12: 'learning_style',
  13: 'learning_style',
  14: 'personality',
};

const TOTAL_PERSONALITY_ITEMS = 25;
const TOTAL_SELF_EFFICACY_ITEMS = 6;
const TOTAL_STUDY_STRATEGY_ITEMS = 8;
const TOTAL_LEARNING_STYLE_ITEMS = 16;

const VALID_SECTIONS: SkippableSection[] = [
  'personality', 'learning_style', 'baseline', 'self_efficacy', 'study_strategy',
];


// ─── Validation ─────────────────────────────────────────────────────────────

function validatePayload(
  payload: unknown,
): { valid: true; data: ProcessOnboardingRequest } | { valid: false; error: string } {
  if (!payload || typeof payload !== 'object') {
    return { valid: false, error: 'Request body must be a JSON object' };
  }

  const p = payload as Record<string, unknown>;

  if (!p.student_id || typeof p.student_id !== 'string') {
    return { valid: false, error: 'student_id is required and must be a string' };
  }

  if (p.assessment_version === undefined || typeof p.assessment_version !== 'number' || p.assessment_version < 1) {
    return { valid: false, error: 'assessment_version is required and must be a positive integer' };
  }

  if (!Array.isArray(p.skipped_sections)) {
    return { valid: false, error: 'skipped_sections must be an array' };
  }

  for (const section of p.skipped_sections) {
    if (!VALID_SECTIONS.includes(section as SkippableSection)) {
      return { valid: false, error: `Invalid skipped section: ${section}` };
    }
  }

  if (!Array.isArray(p.baseline_course_ids)) {
    return { valid: false, error: 'baseline_course_ids must be an array' };
  }

  return {
    valid: true,
    data: {
      student_id: p.student_id as string,
      assessment_version: p.assessment_version as number,
      skipped_sections: p.skipped_sections as SkippableSection[],
      baseline_course_ids: p.baseline_course_ids as string[],
      is_day1: p.is_day1 === true,
    },
  };
}

// ─── Score Calculation Functions ────────────────────────────────────────────

function calculateBigFiveScores(
  responses: Array<{ dimension: string; selected_option: number; weight: number }>,
): BigFiveTraits {
  const dimensions = ['openness', 'conscientiousness', 'extraversion', 'agreeableness', 'neuroticism'] as const;
  const scores: Record<string, number> = {};

  for (const dim of dimensions) {
    const dimResponses = responses.filter((r) => r.dimension === dim);
    if (dimResponses.length === 0) {
      scores[dim] = 0;
      continue;
    }
    const sum = dimResponses.reduce((acc, r) => {
      const contribution = r.weight === 1 ? r.selected_option : 6 - r.selected_option;
      return acc + contribution;
    }, 0);
    const maxPossible = dimResponses.length * 5;
    scores[dim] = Math.round((sum / maxPossible) * 100);
  }

  return scores as unknown as BigFiveTraits;
}

function calculateVARKScores(
  responses: Array<{ selected_modality: string }>,
  totalQuestions: number,
): VARKProfile {
  const counts: Record<string, number> = { visual: 0, auditory: 0, read_write: 0, kinesthetic: 0 };

  for (const r of responses) {
    if (r.selected_modality in counts) {
      counts[r.selected_modality]++;
    }
  }

  const modalities = ['visual', 'auditory', 'read_write', 'kinesthetic'] as const;
  const scores: Record<string, number> = {};
  for (const mod of modalities) {
    scores[mod] = Math.round((counts[mod] / totalQuestions) * 100);
  }

  const maxScore = Math.max(...modalities.map((m) => scores[m]));
  const topModalities = modalities.filter((m) => maxScore - scores[m] <= MULTIMODAL_THRESHOLD);

  let dominant_style: VARKProfile['dominant_style'];
  if (topModalities.length >= 2) {
    dominant_style = 'multimodal';
  } else {
    dominant_style = modalities.reduce((a, b) => (scores[a] > scores[b] ? a : b));
  }

  return {
    visual: scores.visual,
    auditory: scores.auditory,
    read_write: scores.read_write,
    kinesthetic: scores.kinesthetic,
    dominant_style,
  };
}

function calculateBaselineScores(
  responses: Array<{ clo_id: string; selected_option: number; correct_option: number }>,
): Array<{ clo_id: string; score: number; question_count: number; correct_count: number }> {
  const cloMap = new Map<string, { total: number; correct: number }>();

  for (const r of responses) {
    const entry = cloMap.get(r.clo_id) ?? { total: 0, correct: 0 };
    entry.total++;
    if (r.selected_option === r.correct_option) entry.correct++;
    cloMap.set(r.clo_id, entry);
  }

  return Array.from(cloMap.entries()).map(([clo_id, { total, correct }]) => ({
    clo_id,
    score: Math.round((correct / total) * 100),
    question_count: total,
    correct_count: correct,
  }));
}

function calculateSelfEfficacyScores(
  responses: Array<{ domain: string; selected_option: number }>,
): SelfEfficacyProfile {
  const domains = ['general_academic', 'course_specific', 'self_regulated_learning'] as const;
  const scores: Record<string, number> = {};

  for (const domain of domains) {
    const domainResponses = responses.filter((r) => r.domain === domain);
    if (domainResponses.length === 0) {
      scores[domain] = 0;
      continue;
    }
    const sum = domainResponses.reduce((acc, r) => acc + r.selected_option, 0);
    const maxPossible = domainResponses.length * 5;
    scores[domain] = Math.round((sum / maxPossible) * 100);
  }

  const allSum = responses.reduce((acc, r) => acc + r.selected_option, 0);
  const allMax = responses.length * 5;
  scores.overall = allMax > 0 ? Math.round((allSum / allMax) * 100) : 0;

  return scores as unknown as SelfEfficacyProfile;
}

function calculateStudyStrategyScores(
  responses: Array<{ dimension: string; selected_option: number }>,
): StudyStrategyProfile {
  const dimensions = ['time_management', 'elaboration', 'self_testing', 'help_seeking'] as const;
  const scores: Record<string, number> = {};

  for (const dim of dimensions) {
    const dimResponses = responses.filter((r) => r.dimension === dim);
    if (dimResponses.length === 0) {
      scores[dim] = 0;
      continue;
    }
    const sum = dimResponses.reduce((acc, r) => acc + r.selected_option, 0);
    const maxPossible = dimResponses.length * 5;
    scores[dim] = Math.round((sum / maxPossible) * 100);
  }

  return scores as unknown as StudyStrategyProfile;
}

function calculateProfileCompleteness(input: {
  personality_items: number;
  self_efficacy_items: number;
  study_strategy_items: number;
  learning_style_items: number;
  baseline_courses: number;
}): number {
  const personality = Math.min(input.personality_items / TOTAL_PERSONALITY_ITEMS, 1);
  const selfEfficacy = Math.min(input.self_efficacy_items / TOTAL_SELF_EFFICACY_ITEMS, 1);
  const studyStrategies = Math.min(input.study_strategy_items / TOTAL_STUDY_STRATEGY_ITEMS, 1);
  const learningStyle = Math.min(input.learning_style_items / TOTAL_LEARNING_STYLE_ITEMS, 1);
  const baseline = input.baseline_courses > 0 ? 1 : 0;

  const total = personality + selfEfficacy + studyStrategies + learningStyle + baseline;
  return Math.round((total / 5) * 100);
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

    const { student_id, assessment_version, skipped_sections, baseline_course_ids, is_day1 } = validation.data;

    // ── 3.1.1 JWT validation and student_id verification ────────────────

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

    // ── 3.1.2 Fetch onboarding_responses and validate against active questions ──

    const { data: responses, error: responsesErr } = await supabase
      .from('onboarding_responses')
      .select('id, question_id, selected_option, score_contribution')
      .eq('student_id', student_id)
      .eq('assessment_version', assessment_version);

    if (responsesErr) {
      console.error('Failed to fetch responses:', responsesErr.message);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch onboarding responses', detail: responsesErr.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const questionIds = [...new Set((responses ?? []).map((r: { question_id: string }) => r.question_id))];

    // Fetch all active questions that match the student's responses
    let activeQuestions: Array<{
      id: string;
      assessment_type: string;
      dimension: string | null;
      weight: number | null;
      options: unknown;
      correct_option: number | null;
      clo_id: string | null;
      course_id: string | null;
    }> = [];

    if (questionIds.length > 0) {
      const { data: questions, error: questionsErr } = await supabase
        .from('onboarding_questions')
        .select('id, assessment_type, dimension, weight, options, correct_option, clo_id, course_id')
        .in('id', questionIds)
        .eq('is_active', true);

      if (questionsErr) {
        console.error('Failed to fetch questions:', questionsErr.message);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch onboarding questions', detail: questionsErr.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      activeQuestions = questions ?? [];
    }

    // Build a lookup map for active questions
    const questionMap = new Map(activeQuestions.map((q) => [q.id, q]));

    // Filter responses to only those referencing active questions
    const validResponses = (responses ?? []).filter(
      (r: { question_id: string }) => questionMap.has(r.question_id),
    );

    // ── 3.1.15 Handle skipped sections (store null for skipped assessment scores) ──

    const isSkipped = (section: SkippableSection) => skipped_sections.includes(section);

    // ── 3.1.3 Calculate Big Five trait scores ───────────────────────────

    let personalityTraits: BigFiveTraits | null = null;

    if (!isSkipped('personality')) {
      const personalityResponses = validResponses
        .filter((r: { question_id: string }) => {
          const q = questionMap.get(r.question_id);
          return q?.assessment_type === 'personality';
        })
        .map((r: { question_id: string; selected_option: number }) => {
          const q = questionMap.get(r.question_id)!;
          return {
            dimension: q.dimension ?? '',
            selected_option: r.selected_option,
            weight: q.weight ?? 1,
          };
        });

      if (personalityResponses.length > 0) {
        personalityTraits = calculateBigFiveScores(personalityResponses);
      }
    }

    // ── 3.1.4 Calculate VARK scores ─────────────────────────────────────

    let learningStyle: VARKProfile | null = null;

    if (!isSkipped('learning_style')) {
      const varkResponses = validResponses
        .filter((r: { question_id: string }) => {
          const q = questionMap.get(r.question_id);
          return q?.assessment_type === 'learning_style';
        })
        .map((r: { question_id: string; selected_option: number }) => {
          const q = questionMap.get(r.question_id)!;
          const options = q.options as Array<{ modality: string }> | null;
          const selectedModality = options?.[r.selected_option]?.modality ?? 'visual';
          return { selected_modality: selectedModality };
        });

      if (varkResponses.length > 0) {
        const totalVarkQuestions = activeQuestions.filter((q) => q.assessment_type === 'learning_style').length;
        learningStyle = calculateVARKScores(varkResponses, totalVarkQuestions || varkResponses.length);
      }
    }

    // ── 3.1.5 Calculate baseline CLO scores ─────────────────────────────

    const baselineResults: BaselineResult[] = [];

    if (!isSkipped('baseline') && baseline_course_ids.length > 0) {
      for (const courseId of baseline_course_ids) {
        const courseBaselineResponses = validResponses
          .filter((r: { question_id: string }) => {
            const q = questionMap.get(r.question_id);
            return q?.assessment_type === 'baseline' && q?.course_id === courseId;
          })
          .map((r: { question_id: string; selected_option: number }) => {
            const q = questionMap.get(r.question_id)!;
            return {
              clo_id: q.clo_id ?? '',
              selected_option: r.selected_option,
              correct_option: q.correct_option ?? 0,
            };
          });

        if (courseBaselineResponses.length > 0) {
          const cloScores = calculateBaselineScores(courseBaselineResponses);
          baselineResults.push({ course_id: courseId, clo_scores: cloScores });
        }
      }
    }

    // ── 3.1.6 Calculate self-efficacy scores ────────────────────────────

    let selfEfficacy: SelfEfficacyProfile | null = null;

    if (!isSkipped('self_efficacy')) {
      const seResponses = validResponses
        .filter((r: { question_id: string }) => {
          const q = questionMap.get(r.question_id);
          return q?.assessment_type === 'self_efficacy';
        })
        .map((r: { question_id: string; selected_option: number }) => {
          const q = questionMap.get(r.question_id)!;
          return {
            domain: q.dimension ?? '',
            selected_option: r.selected_option,
          };
        });

      if (seResponses.length > 0) {
        selfEfficacy = calculateSelfEfficacyScores(seResponses);
      }
    }

    // ── 3.1.7 Calculate study strategy dimension scores ─────────────────

    let studyStrategies: StudyStrategyProfile | null = null;

    if (!isSkipped('study_strategy')) {
      const ssResponses = validResponses
        .filter((r: { question_id: string }) => {
          const q = questionMap.get(r.question_id);
          return q?.assessment_type === 'study_strategy';
        })
        .map((r: { question_id: string; selected_option: number }) => {
          const q = questionMap.get(r.question_id)!;
          return {
            dimension: q.dimension ?? '',
            selected_option: r.selected_option,
          };
        });

      if (ssResponses.length > 0) {
        studyStrategies = calculateStudyStrategyScores(ssResponses);
      }
    }


    // ── 3.1.8 Calculate profile_completeness percentage ─────────────────

    const personalityItemCount = isSkipped('personality')
      ? 0
      : validResponses.filter((r: { question_id: string }) => questionMap.get(r.question_id)?.assessment_type === 'personality').length;

    const selfEfficacyItemCount = isSkipped('self_efficacy')
      ? 0
      : validResponses.filter((r: { question_id: string }) => questionMap.get(r.question_id)?.assessment_type === 'self_efficacy').length;

    const studyStrategyItemCount = isSkipped('study_strategy')
      ? 0
      : validResponses.filter((r: { question_id: string }) => questionMap.get(r.question_id)?.assessment_type === 'study_strategy').length;

    const learningStyleItemCount = isSkipped('learning_style')
      ? 0
      : validResponses.filter((r: { question_id: string }) => questionMap.get(r.question_id)?.assessment_type === 'learning_style').length;

    const profileCompleteness = calculateProfileCompleteness({
      personality_items: personalityItemCount,
      self_efficacy_items: selfEfficacyItemCount,
      study_strategy_items: studyStrategyItemCount,
      learning_style_items: learningStyleItemCount,
      baseline_courses: baselineResults.length,
    });

    // ── 3.1.9 INSERT/UPSERT student_profiles record ────────────────────

    // Fetch institution_id for the student
    const { data: studentProfile, error: profileFetchErr } = await supabase
      .from('profiles')
      .select('institution_id')
      .eq('id', student_id)
      .maybeSingle();

    if (profileFetchErr || !studentProfile) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch student profile', detail: profileFetchErr?.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { error: upsertProfileErr } = await supabase
      .from('student_profiles')
      .upsert(
        {
          student_id,
          institution_id: studentProfile.institution_id,
          personality_traits: personalityTraits,
          learning_style: learningStyle,
          self_efficacy: selfEfficacy,
          study_strategies: studyStrategies,
          profile_completeness: profileCompleteness,
          assessment_version,
          completed_at: new Date().toISOString(),
        },
        { onConflict: 'student_id,assessment_version' },
      );

    if (upsertProfileErr) {
      console.error('Failed to upsert student profile:', upsertProfileErr.message);
      return new Response(
        JSON.stringify({ error: 'Failed to save student profile', detail: upsertProfileErr.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ── 3.1.10 INSERT baseline_attainment records ───────────────────────

    if (baselineResults.length > 0) {
      const attainmentRows = baselineResults.flatMap((br) =>
        br.clo_scores.map((cs) => ({
          student_id,
          course_id: br.course_id,
          clo_id: cs.clo_id,
          score: cs.score,
          question_count: cs.question_count,
          correct_count: cs.correct_count,
          assessment_version,
        })),
      );

      const { error: attainmentErr } = await supabase
        .from('baseline_attainment')
        .upsert(attainmentRows, { onConflict: 'student_id,course_id,clo_id' });

      if (attainmentErr) {
        console.error('Failed to upsert baseline attainment:', attainmentErr.message);
        // Non-fatal — continue processing
      }
    }

    // ── 3.1.11 UPDATE profiles SET onboarding_completed = true ──────────

    const { error: updateProfileErr } = await supabase
      .from('profiles')
      .update({ onboarding_completed: true })
      .eq('id', student_id);

    if (updateProfileErr) {
      console.error('Failed to update onboarding_completed:', updateProfileErr.message);
      // Non-fatal — continue processing
    }

    // ── 3.1.12 Generate micro-assessment schedule for Day 1 flow ────────

    if (is_day1) {
      const today = new Date();
      const scheduleRows = Object.entries(MICRO_ASSESSMENT_SCHEDULE).map(([dayStr, assessmentType]) => {
        const day = parseInt(dayStr, 10);
        const scheduledDate = new Date(today);
        scheduledDate.setDate(today.getDate() + (day - 1));
        return {
          student_id,
          scheduled_day: day,
          assessment_type: assessmentType,
          question_ids: [],
          status: 'pending',
          dismissal_count: 0,
          scheduled_at: scheduledDate.toISOString().slice(0, 10),
        };
      });

      const { error: scheduleErr } = await supabase
        .from('micro_assessment_schedule')
        .upsert(scheduleRows, { onConflict: 'student_id,scheduled_day' });

      if (scheduleErr) {
        console.error('Failed to insert micro-assessment schedule:', scheduleErr.message);
        // Non-fatal — continue processing
      }
    }


    // ── 3.1.13 Invoke award-xp for each completed section + completion bonus ──

    let totalXpAwarded = 0;
    const xpAwards: Array<{ source: string; amount: number }> = [];

    // Only award XP for first assessment (assessment_version === 1)
    if (assessment_version === 1) {
      // Personality XP
      if (!isSkipped('personality') && personalityTraits !== null) {
        xpAwards.push({ source: 'onboarding_personality', amount: ONBOARDING_XP.personality });
      }

      // Learning style XP
      if (!isSkipped('learning_style') && learningStyle !== null) {
        xpAwards.push({ source: 'onboarding_learning_style', amount: ONBOARDING_XP.learning_style });
      }

      // Self-efficacy XP
      if (!isSkipped('self_efficacy') && selfEfficacy !== null) {
        xpAwards.push({ source: 'onboarding_self_efficacy', amount: ONBOARDING_XP.self_efficacy });
      }

      // Study strategy XP
      if (!isSkipped('study_strategy') && studyStrategies !== null) {
        xpAwards.push({ source: 'onboarding_study_strategy', amount: ONBOARDING_XP.study_strategy });
      }

      // Baseline XP (per course)
      for (const br of baselineResults) {
        xpAwards.push({ source: 'onboarding_baseline', amount: ONBOARDING_XP.baseline_per_course });
      }

      // Completion bonus
      xpAwards.push({ source: 'onboarding_complete', amount: ONBOARDING_XP.complete });
    }

    for (const award of xpAwards) {
      try {
        await supabase.functions.invoke('award-xp', {
          body: {
            student_id,
            xp_amount: award.amount,
            source: award.source,
            reference_id: `${award.source}:${student_id}:v${assessment_version}`,
            note: `Onboarding ${award.source} (v${assessment_version})`,
          },
        });
        totalXpAwarded += award.amount;
      } catch (xpErr) {
        console.error(`Failed to award XP for ${award.source}:`, (xpErr as Error).message);
        // Non-fatal — continue with other awards
      }
    }

    // ── 3.1.14 Invoke check-badges for "Self-Aware Scholar" and "Thorough Explorer" ──

    const badgesEarned: string[] = [];

    try {
      const badgeResponse = await supabase.functions.invoke('check-badges', {
        body: {
          student_id,
          trigger: 'xp_award',
          context: {
            onboarding_complete: true,
            personality_completed: !isSkipped('personality') && personalityTraits !== null,
            learning_style_completed: !isSkipped('learning_style') && learningStyle !== null,
            baseline_completed: baselineResults.length > 0,
            self_efficacy_completed: !isSkipped('self_efficacy') && selfEfficacy !== null,
            study_strategy_completed: !isSkipped('study_strategy') && studyStrategies !== null,
            skipped_sections,
          },
        },
      });

      if (badgeResponse.data?.new_badges) {
        badgesEarned.push(...badgeResponse.data.new_badges);
      }
    } catch (badgeErr) {
      console.error('Failed to check badges:', (badgeErr as Error).message);
      // Non-fatal
    }

    // Check "Self-Aware Scholar": personality + learning_style + at least one baseline
    const selfAwareScholarEligible =
      !isSkipped('personality') && personalityTraits !== null &&
      !isSkipped('learning_style') && learningStyle !== null &&
      baselineResults.length > 0;

    // Check "Thorough Explorer": no skipped sections
    const thoroughExplorerEligible = skipped_sections.length === 0;

    // Award onboarding-specific badges directly if not already handled by check-badges
    if (selfAwareScholarEligible && !badgesEarned.includes('self_aware_scholar')) {
      const { error: badgeInsertErr } = await supabase
        .from('student_badges')
        .upsert(
          { student_id, badge_id: 'self_aware_scholar', awarded_at: new Date().toISOString() },
          { onConflict: 'student_id,badge_id' },
        );
      if (!badgeInsertErr) {
        badgesEarned.push('self_aware_scholar');
      }
    }

    if (thoroughExplorerEligible && !badgesEarned.includes('thorough_explorer')) {
      const { error: badgeInsertErr } = await supabase
        .from('student_badges')
        .upsert(
          { student_id, badge_id: 'thorough_explorer', awarded_at: new Date().toISOString() },
          { onConflict: 'student_id,badge_id' },
        );
      if (!badgeInsertErr) {
        badgesEarned.push('thorough_explorer');
      }
    }

    // ── 3.1.16 If Day 1: invoke generate-starter-week Edge Function ─────

    if (is_day1) {
      try {
        await supabase.functions.invoke('generate-starter-week', {
          body: {
            student_id,
            self_efficacy_score: selfEfficacy?.overall ?? 50,
            enrolled_course_ids: baseline_course_ids,
          },
        });
      } catch (starterErr) {
        console.error('Failed to invoke generate-starter-week:', (starterErr as Error).message);
        // Non-fatal — starter week is a nice-to-have
      }
    }

    // ── Response ────────────────────────────────────────────────────────

    return new Response(
      JSON.stringify({
        success: true,
        profile: {
          personality_traits: personalityTraits,
          learning_style: learningStyle,
          self_efficacy: selfEfficacy,
          study_strategies: studyStrategies,
          baseline_scores: baselineResults,
          profile_completeness: profileCompleteness,
        },
        xp_awarded: totalXpAwarded,
        badges_earned: badgesEarned,
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
