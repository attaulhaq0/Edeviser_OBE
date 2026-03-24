import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const allowedOrigin = Deno.env.get('ALLOWED_ORIGIN') ?? 'https://edeviser.vercel.app';

const corsHeaders = {
  'Access-Control-Allow-Origin': allowedOrigin,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ─── Types ──────────────────────────────────────────────────────────────────

interface RubricSelection {
  criterion_id: string;
  level_index: number;
}

interface CriterionLevel {
  label: string;
  description: string;
  points: number;
}

interface RubricCriterion {
  id: string;
  criterion_name: string;
  levels: CriterionLevel[];
  max_points: number;
  sort_order: number;
}

interface CLOContext {
  title: string;
  blooms_level: string | null;
}

interface HistoricalFeedback {
  overall_feedback: string | null;
  rubric_selections: unknown;
}

interface CriterionDraft {
  criterion_id: string;
  criterion_title: string;
  draft_comment: string;
}

interface FeedbackDraftResponse {
  criterion_drafts: CriterionDraft[];
  overall_draft: string;
}

// ─── Feedback Template Helpers ──────────────────────────────────────────────

const BLOOMS_LABELS: Record<string, string> = {
  remembering: 'Remembering',
  understanding: 'Understanding',
  applying: 'Applying',
  analyzing: 'Analyzing',
  evaluating: 'Evaluating',
  creating: 'Creating',
};

const BLOOMS_ACTION_PHRASES: Record<string, string> = {
  remembering: 'recalling and identifying key concepts',
  understanding: 'explaining and interpreting ideas',
  applying: 'applying concepts to new situations',
  analyzing: 'breaking down and examining relationships',
  evaluating: 'making judgments and defending positions',
  creating: 'producing original and innovative work',
};

/**
 * Determine performance tier from level position within the rubric.
 * Returns 'top', 'upper', 'mid', or 'low' based on where the selected
 * level falls relative to the total number of levels.
 */
export function getPerformanceTier(
  levelIndex: number,
  totalLevels: number,
): 'top' | 'upper' | 'mid' | 'low' {
  if (totalLevels <= 1) return 'top';
  const ratio = levelIndex / (totalLevels - 1);
  if (ratio >= 0.9) return 'top';
  if (ratio >= 0.6) return 'upper';
  if (ratio >= 0.3) return 'mid';
  return 'low';
}

/**
 * Build a draft feedback comment for a single rubric criterion based on:
 * - The criterion name and selected performance level description
 * - The performance tier (top/upper/mid/low)
 * - CLO context (title and Bloom's level)
 * - Historical feedback patterns (recurring themes from past grades)
 */
export function buildCriterionDraft(
  criterionName: string,
  selectedLevel: CriterionLevel,
  levelIndex: number,
  totalLevels: number,
  cloContext: CLOContext | null,
  historicalThemes: string[],
): string {
  const tier = getPerformanceTier(levelIndex, totalLevels);
  const parts: string[] = [];

  // Opening based on performance tier
  switch (tier) {
    case 'top':
      parts.push(
        `Excellent work on ${criterionName}. Your response demonstrates strong mastery at the "${selectedLevel.label}" level.`,
      );
      break;
    case 'upper':
      parts.push(
        `Good effort on ${criterionName}. You've reached the "${selectedLevel.label}" level, showing solid understanding.`,
      );
      break;
    case 'mid':
      parts.push(
        `Adequate work on ${criterionName}. At the "${selectedLevel.label}" level, there is room for growth.`,
      );
      break;
    case 'low':
      parts.push(
        `${criterionName} needs improvement. At the "${selectedLevel.label}" level, significant development is needed.`,
      );
      break;
  }

  // Add level description context
  if (selectedLevel.description) {
    parts.push(`Specifically: ${selectedLevel.description}`);
  }

  // Add CLO-aligned guidance
  if (cloContext) {
    const bloomsKey = cloContext.blooms_level?.toLowerCase() ?? '';
    const actionPhrase = BLOOMS_ACTION_PHRASES[bloomsKey];
    if (actionPhrase && (tier === 'mid' || tier === 'low')) {
      parts.push(
        `To improve, focus on ${actionPhrase} as required by the "${cloContext.title}" learning outcome.`,
      );
    } else if (actionPhrase && (tier === 'top' || tier === 'upper')) {
      parts.push(
        `This aligns well with the "${cloContext.title}" outcome's focus on ${actionPhrase}.`,
      );
    }
  }

  // Add historical pattern note if available
  if (historicalThemes.length > 0) {
    const theme = historicalThemes[0];
    if (tier === 'mid' || tier === 'low') {
      parts.push(`Note: Previous feedback has highlighted similar areas — "${theme}". Consider reviewing past guidance.`);
    }
  }

  return parts.join(' ');
}

/**
 * Build an overall draft feedback summarizing strengths and areas for improvement
 * across all rubric criteria.
 */
export function buildOverallDraft(
  criterionResults: Array<{
    criterionName: string;
    tier: 'top' | 'upper' | 'mid' | 'low';
    levelLabel: string;
  }>,
  cloContext: CLOContext | null,
): string {
  const strengths = criterionResults.filter((c) => c.tier === 'top' || c.tier === 'upper');
  const improvements = criterionResults.filter((c) => c.tier === 'mid' || c.tier === 'low');

  const parts: string[] = [];

  if (strengths.length > 0) {
    const names = strengths.map((s) => s.criterionName).join(', ');
    parts.push(`Strengths: Strong performance in ${names}.`);
  }

  if (improvements.length > 0) {
    const names = improvements.map((s) => s.criterionName).join(', ');
    parts.push(`Areas for improvement: ${names} need${improvements.length === 1 ? 's' : ''} further development.`);
  }

  if (cloContext) {
    const bloomsLabel = BLOOMS_LABELS[cloContext.blooms_level?.toLowerCase() ?? ''] ?? '';
    if (bloomsLabel) {
      parts.push(
        `This assessment targets the "${cloContext.title}" outcome at the ${bloomsLabel} level of Bloom's Taxonomy.`,
      );
    }
  }

  if (strengths.length === criterionResults.length) {
    parts.push('Overall, this is a well-executed submission. Keep up the excellent work.');
  } else if (improvements.length === criterionResults.length) {
    parts.push('Overall, this submission needs significant revision. Please review the rubric criteria and resubmit if possible.');
  } else {
    parts.push('Continue building on your strengths while addressing the identified areas for improvement.');
  }

  return parts.join(' ');
}

/**
 * Extract recurring feedback themes from historical grades.
 * Looks at past overall_feedback strings and finds common short phrases.
 */
export function extractHistoricalThemes(
  historicalFeedback: HistoricalFeedback[],
): string[] {
  const feedbackTexts = historicalFeedback
    .map((h) => h.overall_feedback)
    .filter((f): f is string => !!f && f.trim().length > 0);

  if (feedbackTexts.length === 0) return [];

  // Simple keyword extraction: find sentences that appear in multiple feedback entries
  const sentenceMap = new Map<string, number>();

  for (const text of feedbackTexts) {
    // Split into sentences and normalize
    const sentences = text
      .split(/[.!?]+/)
      .map((s) => s.trim().toLowerCase())
      .filter((s) => s.length > 10 && s.length < 200);

    const seen = new Set<string>();
    for (const sentence of sentences) {
      if (!seen.has(sentence)) {
        seen.add(sentence);
        sentenceMap.set(sentence, (sentenceMap.get(sentence) ?? 0) + 1);
      }
    }
  }

  // Return sentences that appear in at least 2 feedback entries, sorted by frequency
  return Array.from(sentenceMap.entries())
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([sentence]) => sentence);
}

// ─── Main Handler ───────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // ── Auth: require teacher or admin ───────────────────────────────
    const authHeader = req.headers.get('Authorization') ?? '';
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
    const callerRole = caller.app_metadata?.role ?? caller.user_metadata?.role ?? '';
    if (!['teacher', 'admin'].includes(callerRole)) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: teacher or admin role required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { submission_id, rubric_id, rubric_selections, student_id, clo_id } = await req.json();

    // ── Validate required fields ────────────────────────────────────────
    if (!submission_id || !rubric_id || !rubric_selections || !student_id || !clo_id) {
      return new Response(
        JSON.stringify({
          error: 'Missing required fields: submission_id, rubric_id, rubric_selections, student_id, clo_id',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (!Array.isArray(rubric_selections) || rubric_selections.length === 0) {
      return new Response(
        JSON.stringify({ error: 'rubric_selections must be a non-empty array' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ── Step 1: Fetch rubric criteria ───────────────────────────────────

    const { data: criteria, error: criteriaErr } = await supabase
      .from('rubric_criteria')
      .select('id, criterion_name, levels, max_points, sort_order')
      .eq('rubric_id', rubric_id)
      .order('sort_order', { ascending: true });

    if (criteriaErr) {
      console.error('Failed to fetch rubric criteria:', criteriaErr.message);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch rubric criteria', detail: criteriaErr.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (!criteria || criteria.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No criteria found for the specified rubric' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Build criteria lookup map
    const criteriaMap = new Map<string, RubricCriterion>();
    for (const c of criteria) {
      criteriaMap.set(c.id, {
        id: c.id,
        criterion_name: c.criterion_name,
        levels: (c.levels ?? []) as CriterionLevel[],
        max_points: c.max_points,
        sort_order: c.sort_order,
      });
    }

    // ── Step 2: Fetch CLO context ───────────────────────────────────────

    let cloContext: CLOContext | null = null;

    const { data: cloData, error: cloErr } = await supabase
      .from('learning_outcomes')
      .select('title, blooms_level')
      .eq('id', clo_id)
      .maybeSingle();

    if (cloErr) {
      console.error('Failed to fetch CLO context:', cloErr.message);
      // Non-fatal: continue without CLO context
    } else if (cloData) {
      cloContext = { title: cloData.title, blooms_level: cloData.blooms_level };
    }

    // ── Step 3: Fetch student's historical feedback ─────────────────────

    // Historical feedback is fetched by looking at past grades for this student's submissions
    const { data: studentSubmissions } = await supabase
      .from('submissions')
      .select('id')
      .eq('student_id', student_id)
      .limit(20);

    let historicalThemes: string[] = [];

    if (studentSubmissions && studentSubmissions.length > 0) {
      const submissionIds = studentSubmissions.map((s: { id: string }) => s.id);

      const { data: pastGrades } = await supabase
        .from('grades')
        .select('overall_feedback, rubric_selections')
        .in('submission_id', submissionIds)
        .not('overall_feedback', 'is', null)
        .order('graded_at', { ascending: false })
        .limit(10);

      if (pastGrades && pastGrades.length > 0) {
        historicalThemes = extractHistoricalThemes(pastGrades as HistoricalFeedback[]);
      }
    }

    // ── Step 4: Generate per-criterion draft feedback ───────────────────

    const criterionDrafts: CriterionDraft[] = [];
    const criterionResults: Array<{
      criterionName: string;
      tier: 'top' | 'upper' | 'mid' | 'low';
      levelLabel: string;
    }> = [];

    for (const selection of rubric_selections as RubricSelection[]) {
      const criterion = criteriaMap.get(selection.criterion_id);
      if (!criterion) continue;

      const levels = criterion.levels;
      const levelIndex = selection.level_index;

      if (levelIndex < 0 || levelIndex >= levels.length) continue;

      const selectedLevel = levels[levelIndex];
      const tier = getPerformanceTier(levelIndex, levels.length);

      const draftComment = buildCriterionDraft(
        criterion.criterion_name,
        selectedLevel,
        levelIndex,
        levels.length,
        cloContext,
        historicalThemes,
      );

      criterionDrafts.push({
        criterion_id: criterion.id,
        criterion_title: criterion.criterion_name,
        draft_comment: draftComment,
      });

      criterionResults.push({
        criterionName: criterion.criterion_name,
        tier,
        levelLabel: selectedLevel.label,
      });
    }

    // ── Step 5: Generate overall draft feedback ─────────────────────────

    const overallDraft = buildOverallDraft(criterionResults, cloContext);

    // ── Step 6: Return structured response ──────────────────────────────

    const response: FeedbackDraftResponse = {
      criterion_drafts: criterionDrafts,
      overall_draft: overallDraft,
    };

    return new Response(
      JSON.stringify({ success: true, ...response }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('ai-feedback-draft error:', (error as Error).message);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
