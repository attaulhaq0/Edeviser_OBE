import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScoreRequest {
  text: string;
  student_id: string;
  reflection_id: string;
  reflection_type: 'session_reflection' | 'journal_entry';
}

interface QualityResult {
  score: number;
  originality_score: number;
  relevance_score: number;
  depth_score: number;
  flags: string[];
  category: 'thoughtful' | 'good_effort' | 'needs_detail';
  suggestions: string[];
}

function getCategory(score: number): 'thoughtful' | 'good_effort' | 'needs_detail' {
  if (score >= 80) return 'thoughtful';
  if (score >= 30) return 'good_effort';
  return 'needs_detail';
}

function getSuggestions(
  originality: number,
  relevance: number,
  depth: number,
): string[] {
  const suggestions: string[] = [];
  if (originality < 50) suggestions.push('Try to express your thoughts in your own words rather than repeating previous reflections.');
  if (relevance < 50) suggestions.push('Connect your reflection to specific CLOs or course concepts you studied.');
  if (depth < 50) suggestions.push('Go deeper — explain why something worked or what you would change next time.');
  if (suggestions.length === 0) suggestions.push('Great reflection! Keep up the thoughtful writing.');
  return suggestions;
}

/**
 * Simple heuristic-based quality scoring.
 * In production, this would call an AI model for deeper analysis.
 */
function scoreReflection(
  text: string,
  previousTexts: string[],
): QualityResult {
  const words = text.trim().split(/\s+/).filter((w) => w.length > 0);
  const wordCount = words.length;

  // Originality: check similarity to previous reflections
  let maxSimilarity = 0;
  for (const prev of previousTexts) {
    const prevWords = new Set(prev.toLowerCase().split(/\s+/));
    const currentWords = words.map((w) => w.toLowerCase());
    const overlap = currentWords.filter((w) => prevWords.has(w)).length;
    const similarity = currentWords.length > 0 ? overlap / currentWords.length : 0;
    maxSimilarity = Math.max(maxSimilarity, similarity);
  }
  const originalityScore = Math.max(0, Math.min(100, Math.round((1 - maxSimilarity) * 100)));

  // Relevance: check for learning-related keywords
  const learningKeywords = [
    'learn', 'understand', 'concept', 'practice', 'study', 'review',
    'assignment', 'course', 'clo', 'outcome', 'skill', 'knowledge',
    'improve', 'progress', 'challenge', 'difficult', 'easy', 'focus',
    'strategy', 'technique', 'method', 'approach', 'problem', 'solution',
  ];
  const lowerText = text.toLowerCase();
  const keywordHits = learningKeywords.filter((kw) => lowerText.includes(kw)).length;
  const relevanceScore = Math.min(100, Math.round((keywordHits / 5) * 100));

  // Depth: check for metacognitive indicators
  const depthIndicators = [
    'because', 'therefore', 'however', 'although', 'realized',
    'next time', 'differently', 'improve', 'reflect', 'analyze',
    'why', 'how', 'what if', 'plan', 'goal', 'strategy',
    'felt', 'think', 'believe', 'wonder', 'question',
  ];
  const depthHits = depthIndicators.filter((ind) => lowerText.includes(ind)).length;
  const lengthBonus = Math.min(30, Math.round((wordCount / 100) * 30));
  const depthScore = Math.min(100, Math.round((depthHits / 4) * 70) + lengthBonus);

  // Overall score: weighted average
  const score = Math.round(originalityScore * 0.3 + relevanceScore * 0.3 + depthScore * 0.4);

  // Flags
  const flags: string[] = [];
  if (maxSimilarity > 0.6) flags.push('similar_to_previous');
  if (relevanceScore < 20) flags.push('off_topic');

  const category = getCategory(score);
  const suggestions = getSuggestions(originalityScore, relevanceScore, depthScore);

  return {
    score,
    originality_score: originalityScore,
    relevance_score: relevanceScore,
    depth_score: depthScore,
    flags,
    category,
    suggestions,
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const body = (await req.json()) as ScoreRequest;

    if (!body.text || !body.student_id || !body.reflection_id || !body.reflection_type) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: text, student_id, reflection_id, reflection_type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Fetch last 10 reflections for similarity check
    const previousTexts: string[] = [];

    if (body.reflection_type === 'session_reflection') {
      const { data } = await supabase
        .from('session_reflections')
        .select('content')
        .eq('student_id', body.student_id)
        .order('created_at', { ascending: false })
        .limit(10);
      if (data) {
        for (const r of data) {
          previousTexts.push((r as Record<string, unknown>).content as string);
        }
      }
    } else {
      const { data } = await supabase
        .from('journal_entries')
        .select('content')
        .eq('student_id', body.student_id)
        .order('created_at', { ascending: false })
        .limit(10);
      if (data) {
        for (const r of data) {
          previousTexts.push((r as Record<string, unknown>).content as string);
        }
      }
    }

    const result = scoreReflection(body.text, previousTexts);

    // Insert quality score record
    const { error: insertErr } = await supabase
      .from('reflection_quality_scores')
      .insert({
        reflection_id: body.reflection_id,
        reflection_type: body.reflection_type,
        student_id: body.student_id,
        score: result.score,
        originality_score: result.originality_score,
        relevance_score: result.relevance_score,
        depth_score: result.depth_score,
        flags: result.flags,
      });

    if (insertErr) {
      console.error('Failed to insert quality score:', insertErr.message);
    }

    return new Response(
      JSON.stringify({
        success: true,
        score: result.score,
        category: result.category,
        suggestions: result.suggestions,
        flags: result.flags,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
