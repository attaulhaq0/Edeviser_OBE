import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─── CORS Headers ───────────────────────────────────────────────────────────

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ─── Types ──────────────────────────────────────────────────────────────────

interface PlanUpdateRequest {
  student_id: string;
  clo_id: string;
  course_id: string;
  conversation_id: string;
  recent_interaction_count: number;
}

interface RetrievedChunk {
  id: string;
  chunk_text: string;
  source_filename: string;
  material_type: string;
  clo_ids: string[];
  bloom_level: string;
  similarity: number;
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

// ─── Main Handler ───────────────────────────────────────────────────────────

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Parse request body
    const body: PlanUpdateRequest = await req.json();

    const {
      student_id,
      clo_id,
      course_id,
      conversation_id,
      recent_interaction_count,
    } = body;

    // Validate/default interaction_count — the tutor_plan_updates.interaction_count
    // column is NOT NULL with no default, so callers that omit (or send an invalid)
    // recent_interaction_count must not trigger a not-null / type violation.
    const interactionCount =
      Number.isFinite(recent_interaction_count) && recent_interaction_count >= 0
        ? recent_interaction_count
        : 0;

    if (!student_id || !clo_id || !course_id || !conversation_id) {
      return new Response(
        JSON.stringify({
          error:
            "Missing required fields: student_id, clo_id, course_id, conversation_id",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ── 15.2.1: Fetch student CLO attainment and recent tutor messages ──

    // Get CLO details
    const { data: cloData } = await supabase
      .from("learning_outcomes")
      .select("id, title, blooms_level")
      .eq("id", clo_id)
      .maybeSingle();

    const cloTitle = cloData?.title ?? "Unknown CLO";
    const bloomLevel = cloData?.blooms_level ?? "Understanding";

    // Get student attainment for this CLO
    const { data: attainmentData } = await supabase
      .from("outcome_attainment")
      .select("attainment_percent")
      .eq("student_id", student_id)
      .eq("outcome_id", clo_id)
      .maybeSingle();

    const attainmentPercent = attainmentData?.attainment_percent ?? 0;

    // Get institution_id from student profile
    const { data: profileData } = await supabase
      .from("profiles")
      .select("institution_id")
      .eq("id", student_id)
      .maybeSingle();

    const institutionId = profileData?.institution_id ?? "";

    // Fetch recent tutor messages for context (last 5 messages on this CLO)
    const { data: recentMessages } = await supabase
      .from("tutor_messages")
      .select("role, content")
      .eq("conversation_id", conversation_id)
      .order("created_at", { ascending: false })
      .limit(5);

    const messageContext = (recentMessages ?? [])
      .reverse()
      .map((m: { role: string; content: string }) => `${m.role}: ${m.content}`)
      .join("\n");

    // ── 15.2.2: Retrieve top 3 relevant materials via RAG ───────────────

    let retrievedChunks: RetrievedChunk[] = [];

    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    if (openaiApiKey) {
      // Generate embedding for CLO title + bloom level as query
      const queryText = `Study materials for ${cloTitle} at ${bloomLevel} level`;

      try {
        const embeddingResponse = await fetch(
          "https://api.openai.com/v1/embeddings",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${openaiApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "text-embedding-ada-002",
              input: queryText,
            }),
          }
        );

        if (embeddingResponse.ok) {
          const embeddingData = await embeddingResponse.json();
          const queryEmbedding = embeddingData.data[0].embedding;

          const { data: chunks } = await supabase.rpc(
            "search_course_materials",
            {
              query_embedding: JSON.stringify(queryEmbedding),
              match_course_ids: [course_id],
              match_clo_ids: [clo_id],
              match_threshold: 0.6, // slightly lower threshold for broader material coverage
              match_count: 3,
            }
          );

          if (chunks) {
            retrievedChunks = chunks as RetrievedChunk[];
          }
        }
      } catch (err) {
        console.error(
          "RAG retrieval failed (non-blocking):",
          (err as Error).message
        );
      }
    }

    // ── 15.2.3: Generate study time and planner recommendations via LLM ─

    const recommendedMaterials = retrievedChunks.map((chunk) => ({
      chunk_id: chunk.id,
      source_filename: chunk.source_filename,
      section_title: chunk.chunk_text.slice(0, 80).trim(),
    }));

    let studyTimeRecommendation = "";
    let suggestedPlannerSessions = 2;

    const openRouterApiKey = Deno.env.get("OPENROUTER_API_KEY");
    if (openRouterApiKey) {
      const llmPrompt = [
        "You are an educational planning assistant. Based on the following student data, generate a brief study plan recommendation.",
        "",
        `CLO: ${cloTitle} (Bloom's Level: ${bloomLevel})`,
        `Current Attainment: ${attainmentPercent}%`,
        `Tutor Interactions on this CLO: ${interactionCount}`,
        "",
        "Recent conversation context:",
        messageContext || "(no recent messages)",
        "",
        retrievedChunks.length > 0
          ? `Available materials:\n${retrievedChunks
              .map((c, i) => `${i + 1}. ${c.source_filename}`)
              .join("\n")}`
          : "",
        "",
        "Respond with ONLY a JSON object (no markdown, no code fences) with these fields:",
        '- "study_time_recommendation": a short sentence recommending weekly study hours (e.g., "Increase to 3 hours/week focusing on practice problems")',
        '- "suggested_planner_sessions": an integer (1-5) for recommended weekly planner sessions',
      ].join("\n");

      try {
        const model =
          Deno.env.get("TUTOR_PRIMARY_MODEL") ?? "openai/gpt-4o-mini";

        const llmResponse = await fetch(
          "https://openrouter.ai/api/v1/chat/completions",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${openRouterApiKey}`,
              "Content-Type": "application/json",
              "HTTP-Referer": Deno.env.get("SUPABASE_URL") ?? "",
              "X-Title": "Edeviser AI Tutor Plan Update",
            },
            body: JSON.stringify({
              model,
              messages: [{ role: "user", content: llmPrompt }],
              max_tokens: 300,
              temperature: 0.5,
            }),
          }
        );

        if (llmResponse.ok) {
          const llmData = await llmResponse.json();
          const content = llmData.choices?.[0]?.message?.content ?? "";

          try {
            const parsed = JSON.parse(content);
            studyTimeRecommendation = parsed.study_time_recommendation ?? "";
            suggestedPlannerSessions = parsed.suggested_planner_sessions ?? 2;
          } catch {
            // If JSON parsing fails, use the raw content as recommendation
            studyTimeRecommendation = content.trim();
          }
        }
      } catch (err) {
        console.error(
          "LLM recommendation failed (non-blocking):",
          (err as Error).message
        );
      }
    }

    // Fallback if LLM didn't produce a recommendation
    if (!studyTimeRecommendation) {
      if (attainmentPercent < 50) {
        studyTimeRecommendation = `Increase study time to 4 hours/week for "${cloTitle}" — focus on foundational concepts at the ${bloomLevel} level.`;
        suggestedPlannerSessions = 3;
      } else if (attainmentPercent < 70) {
        studyTimeRecommendation = `Dedicate 3 hours/week to "${cloTitle}" — practice applying concepts to strengthen your understanding.`;
        suggestedPlannerSessions = 2;
      } else {
        studyTimeRecommendation = `Maintain 2 hours/week for "${cloTitle}" — review materials and attempt higher-order practice problems.`;
        suggestedPlannerSessions = 1;
      }
    }

    // Clamp planner sessions to valid range
    suggestedPlannerSessions = Math.max(
      1,
      Math.min(5, suggestedPlannerSessions)
    );

    // ── 15.2.4: Persist suggestion to tutor_plan_updates table ──────────

    const { data: planUpdate, error: insertError } = await supabase
      .from("tutor_plan_updates")
      .insert({
        student_id,
        institution_id: institutionId,
        course_id,
        clo_id,
        conversation_id,
        study_time_recommendation: studyTimeRecommendation,
        recommended_materials: recommendedMaterials,
        suggested_planner_sessions: suggestedPlannerSessions,
        interaction_count: interactionCount,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Failed to persist plan update:", insertError.message);
      return new Response(
        JSON.stringify({
          error: "Failed to save learning plan update",
          detail: insertError.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Build the LearningPlanUpdate response
    const result: LearningPlanUpdate = {
      id: planUpdate.id,
      clo_id,
      clo_title: cloTitle,
      study_time_recommendation: studyTimeRecommendation,
      recommended_materials: recommendedMaterials,
      suggested_planner_sessions: suggestedPlannerSessions,
      interaction_count: interactionCount,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("generate-plan-update error:", (error as Error).message);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
