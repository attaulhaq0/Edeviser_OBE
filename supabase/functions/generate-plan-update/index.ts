// ─── Generate Plan Update Edge Function ─────────────────────────────────────
// Triggered by chat-with-tutor when a student reaches 5 interactions on the
// same CLO within 7 days. Generates a learning plan update suggestion.
//
// Pipeline:
// 1. Fetch student CLO attainment and recent tutor messages
// 2. Retrieve top 3 relevant materials via RAG (pgvector similarity search)
// 3. Generate study time and planner recommendations via LLM (OpenRouter)
// 4. Persist suggestion to tutor_plan_updates table

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PlanUpdateRequest {
  student_id: string;
  clo_id: string;
  course_id: string;
  conversation_id: string;
  institution_id: string;
  recent_interaction_count: number;
}

interface LearningPlanUpdate {
  id: string;
  clo_id: string;
  clo_title: string;
  study_time_recommendation: string;
  recommended_materials: Array<{
    chunk_id: string;
    source_filename: string;
    section_title: string;
  }>;
  suggested_planner_sessions: number;
  interaction_count: number;
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

    const body = (await req.json()) as PlanUpdateRequest;
    const { student_id, clo_id, course_id, conversation_id, institution_id, recent_interaction_count } = body;

    if (!student_id || !clo_id || !course_id || !conversation_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ── 15.2.1: Fetch student CLO attainment and recent tutor messages ────

    const { data: cloData } = await supabase
      .from('clos')
      .select('id, title, bloom_level')
      .eq('id', clo_id)
      .maybeSingle();

    const cloTitle = (cloData?.title as string) ?? 'Unknown CLO';

    const { data: attainment } = await supabase
      .from('outcome_attainment')
      .select('attainment_percentage')
      .eq('student_id', student_id)
      .eq('outcome_id', clo_id)
      .eq('scope', 'clo')
      .maybeSingle();

    const attainmentPercent = (attainment?.attainment_percentage as number) ?? 0;

    // Fetch recent messages from conversations about this CLO
    const { data: recentMessages } = await supabase
      .from('tutor_messages')
      .select('content, role')
      .eq('conversation_id', conversation_id)
      .order('created_at', { ascending: false })
      .limit(10);

    const messageContext = (recentMessages ?? [])
      .reverse()
      .map((m: Record<string, unknown>) => `${m.role}: ${(m.content as string).slice(0, 200)}`)
      .join('\n');

    // ── 15.2.2: Retrieve top 3 relevant materials via RAG ────────────────

    let recommendedMaterials: Array<{
      chunk_id: string;
      source_filename: string;
      section_title: string;
    }> = [];

    try {
      // Generate embedding for the CLO title to find relevant materials
      const openaiKey = Deno.env.get('OPENAI_API_KEY');
      if (openaiKey) {
        const embResponse = await fetch('https://api.openai.com/v1/embeddings', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${openaiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'text-embedding-ada-002',
            input: cloTitle,
          }),
        });

        if (embResponse.ok) {
          const embResult = await embResponse.json();
          const queryEmbedding = embResult.data[0].embedding;
          const embeddingStr = `[${queryEmbedding.join(',')}]`;

          const { data: searchResults } = await supabase.rpc('search_course_materials', {
            query_embedding: embeddingStr,
            match_threshold: 0.5,
            match_count: 3,
            filter_course_id: course_id,
          });

          if (searchResults && Array.isArray(searchResults)) {
            recommendedMaterials = searchResults.map((r: Record<string, unknown>) => ({
              chunk_id: r.id as string,
              source_filename: r.source_filename as string,
              section_title: `${r.material_type} — ${(r.chunk_text as string).slice(0, 60)}...`,
            }));
          }
        }
      }
    } catch (err) {
      console.error('RAG search failed (non-blocking):', (err as Error).message);
    }

    // Ensure at least 1 material entry (fallback)
    if (recommendedMaterials.length === 0) {
      recommendedMaterials = [{
        chunk_id: '',
        source_filename: 'Course materials',
        section_title: `Review materials related to: ${cloTitle}`,
      }];
    }

    // ── 15.2.3: Generate study time and planner recommendations via LLM ──

    let studyTimeRecommendation = `Increase study time for "${cloTitle}" to 2-3 hours per week`;
    let suggestedPlannerSessions = 2;

    try {
      const openRouterKey = Deno.env.get('OPENROUTER_API_KEY');
      if (openRouterKey) {
        const llmResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${openRouterKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': Deno.env.get('SUPABASE_URL') ?? '',
          },
          body: JSON.stringify({
            model: Deno.env.get('TUTOR_PRIMARY_MODEL') ?? 'openai/gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content:
                  'You are a learning advisor. Generate a brief study plan recommendation. ' +
                  'Respond with JSON: { "study_time": "string recommendation", "sessions_per_week": number }. ' +
                  'Keep study_time under 100 characters. sessions_per_week should be 1-5.',
              },
              {
                role: 'user',
                content:
                  `Student CLO: "${cloTitle}" (Bloom: ${cloData?.bloom_level ?? 'Unknown'})\n` +
                  `Current attainment: ${attainmentPercent}%\n` +
                  `Interactions in last 7 days: ${recent_interaction_count}\n` +
                  `Recent conversation topics:\n${messageContext.slice(0, 500)}`,
              },
            ],
            max_tokens: 200,
            temperature: 0.5,
          }),
        });

        if (llmResponse.ok) {
          const llmResult = await llmResponse.json();
          const content = llmResult.choices?.[0]?.message?.content ?? '';
          try {
            const parsed = JSON.parse(content);
            if (parsed.study_time) studyTimeRecommendation = parsed.study_time;
            if (parsed.sessions_per_week) suggestedPlannerSessions = Math.max(1, Math.min(5, parsed.sessions_per_week));
          } catch {
            // Use defaults if LLM response isn't valid JSON
          }
        }
      }
    } catch (err) {
      console.error('LLM recommendation failed (non-blocking):', (err as Error).message);
    }

    // ── 15.2.4: Persist suggestion to tutor_plan_updates table ───────────

    const { data: planUpdate, error: insertError } = await supabase
      .from('tutor_plan_updates')
      .insert({
        student_id,
        institution_id,
        course_id,
        clo_id,
        conversation_id,
        study_time_recommendation: studyTimeRecommendation,
        recommended_materials: recommendedMaterials,
        suggested_planner_sessions: suggestedPlannerSessions,
        interaction_count: recent_interaction_count,
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Failed to persist plan update:', insertError.message);
      return new Response(
        JSON.stringify({ error: 'Failed to save plan update' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const result: LearningPlanUpdate = {
      id: planUpdate.id as string,
      clo_id,
      clo_title: cloTitle,
      study_time_recommendation: studyTimeRecommendation,
      recommended_materials: recommendedMaterials,
      suggested_planner_sessions: suggestedPlannerSessions,
      interaction_count: recent_interaction_count,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Generate plan update error:', (error as Error).message);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
