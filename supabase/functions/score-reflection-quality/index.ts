// =============================================================================
// score-reflection-quality — Score reflection quality (originality, relevance, depth)
// Fetches recent reflections for comparison, computes scores, persists result.
// =============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ScoreRequest {
  reflection_id: string;
  reflection_type: "session_reflection" | "journal_entry";
  student_id: string;
  content: string;
}

interface QualityScoreResult {
  score: number;
  originality_score: number;
  relevance_score: number;
  depth_score: number;
  flags: string[];
}

// ─── Scoring Logic ───────────────────────────────────────────────────────────

function computeScores(
  content: string,
  recentReflections: string[]
): QualityScoreResult {
  const words = content
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0);
  const wordCount = words.length;
  const flags: string[] = [];

  // --- Depth Score (0-100) ---
  // Based on word count, sentence variety, and use of analytical language
  let depthScore = 0;
  if (wordCount >= 100) depthScore += 40;
  else if (wordCount >= 50) depthScore += 25;
  else if (wordCount >= 30) depthScore += 15;
  else depthScore += 5;

  // Check for analytical keywords
  const analyticalKeywords = [
    "because",
    "therefore",
    "however",
    "although",
    "realized",
    "learned",
    "understand",
    "improve",
    "strategy",
    "approach",
    "differently",
    "next time",
    "challenge",
    "overcome",
    "reflect",
    "analyze",
    "evaluate",
    "conclude",
    "plan",
    "goal",
  ];
  const lowerContent = content.toLowerCase();
  const analyticalCount = analyticalKeywords.filter((kw) =>
    lowerContent.includes(kw)
  ).length;
  depthScore += Math.min(analyticalCount * 6, 30);

  // Sentence count variety
  const sentences = content.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  if (sentences.length >= 5) depthScore += 20;
  else if (sentences.length >= 3) depthScore += 10;
  else depthScore += 5;

  depthScore = Math.min(depthScore, 100);

  // --- Originality Score (0-100) ---
  // Compare against recent reflections for similarity
  let originalityScore = 80; // Start high, deduct for similarity

  if (recentReflections.length > 0) {
    const contentWords = new Set(
      words
        .map((w) => w.toLowerCase().replace(/[^a-z]/g, ""))
        .filter((w) => w.length > 3)
    );

    for (const prev of recentReflections) {
      const prevWords = new Set(
        prev
          .split(/\s+/)
          .map((w) => w.toLowerCase().replace(/[^a-z]/g, ""))
          .filter((w) => w.length > 3)
      );
      const intersection = [...contentWords].filter((w) => prevWords.has(w));
      const similarity =
        contentWords.size > 0 ? intersection.length / contentWords.size : 0;

      if (similarity > 0.7) {
        originalityScore -= 30;
        flags.push("high_similarity_to_recent");
        break;
      } else if (similarity > 0.5) {
        originalityScore -= 15;
      }
    }
  }

  // Bonus for unique vocabulary
  const uniqueWords = new Set(words.map((w) => w.toLowerCase()));
  const vocabularyRatio = uniqueWords.size / Math.max(wordCount, 1);
  if (vocabularyRatio > 0.7) originalityScore += 10;
  else if (vocabularyRatio < 0.4) originalityScore -= 10;

  originalityScore = Math.max(0, Math.min(originalityScore, 100));

  // --- Relevance Score (0-100) ---
  // Check for learning-related content
  const relevanceKeywords = [
    "learn",
    "study",
    "course",
    "assignment",
    "quiz",
    "exam",
    "concept",
    "topic",
    "skill",
    "practice",
    "review",
    "understand",
    "knowledge",
    "progress",
    "CLO",
    "outcome",
    "attainment",
    "session",
    "focus",
    "timer",
    "pomodoro",
  ];
  const relevanceCount = relevanceKeywords.filter((kw) =>
    lowerContent.includes(kw)
  ).length;
  let relevanceScore = Math.min(40 + relevanceCount * 8, 100);

  // Penalize very short or generic content
  if (wordCount < 20) {
    relevanceScore = Math.min(relevanceScore, 30);
    flags.push("too_short");
  }

  relevanceScore = Math.max(0, Math.min(relevanceScore, 100));

  // --- Overall Score ---
  const score = Math.round(
    originalityScore * 0.3 + relevanceScore * 0.3 + depthScore * 0.4
  );

  if (score < 30) flags.push("low_quality");

  return {
    score: Math.max(0, Math.min(score, 100)),
    originality_score: originalityScore,
    relevance_score: relevanceScore,
    depth_score: depthScore,
    flags,
  };
}

function getSuggestions(scores: QualityScoreResult): string[] {
  const suggestions: string[] = [];

  if (scores.depth_score < 50) {
    suggestions.push(
      "Try explaining why something happened, not just what happened"
    );
  }
  if (scores.originality_score < 50) {
    suggestions.push(
      "Include specific examples from this session that are unique to your experience"
    );
  }
  if (scores.relevance_score < 50) {
    suggestions.push(
      "Connect your reflection to specific learning outcomes or course concepts"
    );
  }
  if (scores.flags.includes("too_short")) {
    suggestions.push(
      "Expand your reflection with more detail — aim for at least 50 words"
    );
  }

  return suggestions;
}

// ─── Handler ─────────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = (await req.json()) as ScoreRequest;
    const { reflection_id, reflection_type, student_id, content } = body;

    if (!reflection_id || !reflection_type || !student_id || !content) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Fetch last 10 reflections for originality comparison
    let recentReflections: string[] = [];

    if (reflection_type === "session_reflection") {
      const { data } = await supabase
        .from("session_reflections")
        .select("content")
        .eq("student_id", student_id)
        .neq("id", reflection_id)
        .order("created_at", { ascending: false })
        .limit(10);
      recentReflections = (data ?? []).map(
        (r: { content: string }) => r.content
      );
    } else {
      const { data } = await supabase
        .from("journal_entries")
        .select("content")
        .eq("student_id", student_id)
        .order("created_at", { ascending: false })
        .limit(10);
      recentReflections = (data ?? []).map(
        (r: { content: string }) => r.content
      );
    }

    // Compute scores
    const scores = computeScores(content, recentReflections);
    const suggestions = getSuggestions(scores);

    // Persist to reflection_quality_scores
    const { data: insertedScore, error: insertError } = await supabase
      .from("reflection_quality_scores")
      .insert({
        reflection_id,
        reflection_type,
        student_id,
        score: scores.score,
        originality_score: scores.originality_score,
        relevance_score: scores.relevance_score,
        depth_score: scores.depth_score,
        flags: scores.flags,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Failed to insert quality score:", insertError.message);
      // Return scores even if persistence fails
      return new Response(JSON.stringify({ score: scores, suggestions }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ score: insertedScore, suggestions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
