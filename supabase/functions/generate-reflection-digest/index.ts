import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Generate monthly reflection digests for students with >= 3 reflections.
 * In production, this would use an AI model for deeper analysis.
 * This heuristic version extracts themes, patterns, and trends from text.
 */

function extractThemes(texts: string[]): Array<{ topic: string; frequency: number }> {
  const topicKeywords: Record<string, string[]> = {
    'Time Management': ['time', 'schedule', 'deadline', 'plan', 'organize'],
    'Problem Solving': ['problem', 'solve', 'solution', 'debug', 'fix'],
    'Understanding Concepts': ['understand', 'concept', 'learn', 'grasp', 'comprehend'],
    'Practice & Application': ['practice', 'apply', 'exercise', 'implement', 'code'],
    'Collaboration': ['team', 'group', 'discuss', 'help', 'peer'],
    'Focus & Motivation': ['focus', 'motivat', 'distract', 'concentrate', 'energy'],
  };

  const counts: Record<string, number> = {};
  const allText = texts.join(' ').toLowerCase();

  for (const [topic, keywords] of Object.entries(topicKeywords)) {
    const hits = keywords.filter((kw) => allText.includes(kw)).length;
    if (hits > 0) counts[topic] = hits;
  }

  return Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([topic, frequency]) => ({ topic, frequency }));
}

function extractGrowthPatterns(texts: string[]): Array<{ area: string; description: string }> {
  const patterns: Array<{ area: string; description: string }> = [];
  const allText = texts.join(' ').toLowerCase();

  if (allText.includes('improve') || allText.includes('better') || allText.includes('progress')) {
    patterns.push({ area: 'Self-improvement', description: 'Consistent focus on getting better over time' });
  }
  if (allText.includes('challenge') || allText.includes('difficult') || allText.includes('struggle')) {
    patterns.push({ area: 'Resilience', description: 'Willingness to engage with challenging material' });
  }
  if (allText.includes('strategy') || allText.includes('approach') || allText.includes('method')) {
    patterns.push({ area: 'Strategic thinking', description: 'Developing and refining study strategies' });
  }

  return patterns;
}

function extractEmotionalTrends(texts: string[]): Array<{ label: string; sentiment: string }> {
  const trends: Array<{ label: string; sentiment: string }> = [];
  const allText = texts.join(' ').toLowerCase();

  const positiveWords = ['happy', 'confident', 'excited', 'proud', 'satisfied', 'good', 'great', 'enjoy'];
  const negativeWords = ['frustrated', 'confused', 'anxious', 'stressed', 'overwhelmed', 'difficult', 'struggle'];

  const positiveHits = positiveWords.filter((w) => allText.includes(w)).length;
  const negativeHits = negativeWords.filter((w) => allText.includes(w)).length;

  if (positiveHits > negativeHits) {
    trends.push({ label: 'Overall positive outlook', sentiment: 'positive' });
  } else if (negativeHits > positiveHits) {
    trends.push({ label: 'Some challenges noted', sentiment: 'negative' });
  } else {
    trends.push({ label: 'Balanced perspective', sentiment: 'neutral' });
  }

  return trends;
}

function generateFocusAreas(themes: Array<{ topic: string; frequency: number }>): Array<{ area: string; reason: string }> {
  if (themes.length === 0) return [{ area: 'Continue reflecting', reason: 'Build a habit of regular reflection' }];
  const topTheme = themes[0]!;
  return [
    { area: topTheme.topic, reason: `This was your most frequent topic — keep building on it` },
    { area: 'Depth of reflection', reason: 'Try connecting your reflections to specific learning outcomes' },
  ];
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

    const body = await req.json();
    const month = body.month as string; // YYYY-MM-DD (first of month)
    const studentId = body.student_id as string | undefined;

    if (!month) {
      return new Response(
        JSON.stringify({ error: 'month is required (YYYY-MM-DD, first of month)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const monthStart = month;
    const monthEnd = new Date(new Date(month).getFullYear(), new Date(month).getMonth() + 1, 0)
      .toISOString().split('T')[0];

    // If student_id provided, process single student; otherwise process all
    let studentIds: string[] = [];

    if (studentId) {
      studentIds = [studentId];
    } else {
      // Find all students with reflections in this month
      const { data: reflections } = await supabase
        .from('session_reflections')
        .select('student_id')
        .gte('created_at', monthStart)
        .lte('created_at', `${monthEnd}T23:59:59`);

      const { data: journals } = await supabase
        .from('journal_entries')
        .select('student_id')
        .gte('created_at', monthStart)
        .lte('created_at', `${monthEnd}T23:59:59`);

      const allStudentIds = new Set<string>();
      for (const r of (reflections ?? [])) allStudentIds.add((r as Record<string, unknown>).student_id as string);
      for (const j of (journals ?? [])) allStudentIds.add((j as Record<string, unknown>).student_id as string);
      studentIds = Array.from(allStudentIds);
    }

    let generated = 0;

    for (const sid of studentIds) {
      // Fetch session reflections
      const { data: sessionRefs } = await supabase
        .from('session_reflections')
        .select('content')
        .eq('student_id', sid)
        .gte('created_at', monthStart)
        .lte('created_at', `${monthEnd}T23:59:59`);

      // Fetch journal entries
      const { data: journalEntries } = await supabase
        .from('journal_entries')
        .select('content')
        .eq('student_id', sid)
        .gte('created_at', monthStart)
        .lte('created_at', `${monthEnd}T23:59:59`);

      const allTexts: string[] = [];
      for (const r of (sessionRefs ?? [])) allTexts.push((r as Record<string, unknown>).content as string);
      for (const j of (journalEntries ?? [])) allTexts.push((j as Record<string, unknown>).content as string);

      // Minimum 3 entries required
      if (allTexts.length < 3) continue;

      const themes = extractThemes(allTexts);
      const growthPatterns = extractGrowthPatterns(allTexts);
      const emotionalTrends = extractEmotionalTrends(allTexts);
      const suggestedFocus = generateFocusAreas(themes);

      // Upsert digest
      const { error } = await supabase
        .from('reflection_digests')
        .upsert(
          {
            student_id: sid,
            month: monthStart,
            themes,
            growth_patterns: growthPatterns,
            emotional_trends: emotionalTrends,
            suggested_focus: suggestedFocus,
            generated_at: new Date().toISOString(),
          },
          { onConflict: 'student_id,month' },
        );

      if (error) {
        console.error(`Failed to upsert digest for ${sid}:`, error.message);
        continue;
      }

      generated++;
    }

    return new Response(
      JSON.stringify({ success: true, generated, total_students: studentIds.length }),
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
