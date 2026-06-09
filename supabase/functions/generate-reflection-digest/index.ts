// =============================================================================
// generate-reflection-digest — Monthly digest generation for students
// with ≥3 reflections. Analyzes themes, growth, sentiment, focus areas.
//
// I-5 orphan decision (full-profile-audit-remediation, Task 13): INTENTIONALLY
// RETAINED, not removed. This function populates the `reflection_digests` table,
// which IS consumed in production by the client (`useReflectionDigest` →
// ReflectionDigestCard on the student WeeklyPlannerPage). It is a monthly,
// schedule-driven generator that currently has no wired cron trigger; rather
// than delete a legitimate edge function that produces live-consumed data, it is
// kept so it can be attached to a pg_cron schedule when monthly digests are
// turned on. The only defect (the CORS `x-content-type` typo) is fixed above.
// =============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ─── Theme Extraction ────────────────────────────────────────────────────────

const THEME_KEYWORDS: Record<string, string[]> = {
  "Time Management": [
    "time",
    "schedule",
    "deadline",
    "late",
    "early",
    "plan",
    "organize",
  ],
  "Study Techniques": [
    "study",
    "practice",
    "review",
    "memorize",
    "notes",
    "flashcard",
  ],
  "Problem Solving": ["problem", "solve", "solution", "figure", "debug", "fix"],
  Collaboration: ["team", "group", "partner", "discuss", "collaborate", "peer"],
  "Understanding Concepts": [
    "understand",
    "concept",
    "theory",
    "principle",
    "grasp",
  ],
  Motivation: ["motivat", "energy", "tired", "excited", "bored", "engaged"],
  Confidence: [
    "confident",
    "unsure",
    "doubt",
    "believe",
    "capable",
    "struggle",
  ],
  Focus: ["focus", "distract", "concentrate", "attention", "zone"],
};

function extractThemes(
  reflections: string[]
): Array<{ topic: string; count: number }> {
  const combined = reflections.join(" ").toLowerCase();
  const themes: Array<{ topic: string; count: number }> = [];

  for (const [topic, keywords] of Object.entries(THEME_KEYWORDS)) {
    const count = keywords.filter((kw) => combined.includes(kw)).length;
    if (count >= 2) {
      themes.push({ topic, count });
    }
  }

  return themes.sort((a, b) => b.count - a.count).slice(0, 5);
}

// ─── Growth Pattern Detection ────────────────────────────────────────────────

function detectGrowthPatterns(
  reflections: string[]
): Array<{ area: string; description: string }> {
  const patterns: Array<{ area: string; description: string }> = [];

  const growthIndicators = [
    {
      area: "Self-awareness",
      keywords: ["realized", "noticed", "aware", "recognize"],
    },
    {
      area: "Adaptability",
      keywords: ["differently", "change", "adapt", "adjust", "try"],
    },
    {
      area: "Persistence",
      keywords: ["keep", "continue", "persist", "despite", "overcome"],
    },
    {
      area: "Critical Thinking",
      keywords: ["analyze", "evaluate", "compare", "question", "why"],
    },
  ];

  const combined = reflections.join(" ").toLowerCase();

  for (const indicator of growthIndicators) {
    const matches = indicator.keywords.filter((kw) => combined.includes(kw));
    if (matches.length >= 2) {
      patterns.push({
        area: indicator.area,
        description: `Demonstrated through use of reflective language (${matches
          .slice(0, 3)
          .join(", ")})`,
      });
    }
  }

  return patterns.slice(0, 4);
}

// ─── Emotional Trend Detection ───────────────────────────────────────────────

function detectEmotionalTrends(
  reflections: string[]
): Array<{ label: string }> {
  const emotionKeywords: Record<string, string[]> = {
    Confident: ["confident", "proud", "accomplished", "capable"],
    Curious: ["curious", "wonder", "interesting", "explore"],
    Frustrated: ["frustrated", "stuck", "difficult", "hard"],
    Motivated: ["motivated", "excited", "eager", "inspired"],
    Calm: ["calm", "relaxed", "comfortable", "peaceful"],
    Anxious: ["anxious", "worried", "nervous", "stressed"],
  };

  const combined = reflections.join(" ").toLowerCase();
  const trends: Array<{ label: string; count: number }> = [];

  for (const [label, keywords] of Object.entries(emotionKeywords)) {
    const count = keywords.filter((kw) => combined.includes(kw)).length;
    if (count >= 1) {
      trends.push({ label, count });
    }
  }

  return trends
    .sort((a, b) => b.count - a.count)
    .slice(0, 4)
    .map(({ label }) => ({ label }));
}

// ─── Focus Suggestions ───────────────────────────────────────────────────────

function suggestFocus(
  themes: Array<{ topic: string; count: number }>,
  patterns: Array<{ area: string }>
): Array<{ area: string; reason: string }> {
  const suggestions: Array<{ area: string; reason: string }> = [];

  // Suggest based on most frequent themes
  if (themes.length > 0) {
    suggestions.push({
      area: themes[0].topic,
      reason: `This was your most discussed topic this month (${themes[0].count} mentions)`,
    });
  }

  // Suggest areas not showing growth
  const growthAreas = new Set(patterns.map((p) => p.area));
  const allAreas = [
    "Self-awareness",
    "Adaptability",
    "Persistence",
    "Critical Thinking",
  ];
  const missingAreas = allAreas.filter((a) => !growthAreas.has(a));

  if (missingAreas.length > 0) {
    suggestions.push({
      area: missingAreas[0],
      reason:
        "This area did not appear in your reflections — consider exploring it next month",
    });
  }

  return suggestions.slice(0, 3);
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

    // Determine the month to process (previous month by default)
    const now = new Date();
    const targetMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const monthStr = `${targetMonth.getFullYear()}-${String(
      targetMonth.getMonth() + 1
    ).padStart(2, "0")}`;
    const monthStart = `${monthStr}-01`;
    const monthEnd = new Date(
      targetMonth.getFullYear(),
      targetMonth.getMonth() + 1,
      0
    );
    const monthEndStr = `${monthStr}-${String(monthEnd.getDate()).padStart(
      2,
      "0"
    )}`;

    // Find students with ≥3 reflections in the month
    const { data: sessionReflections } = await supabase
      .from("session_reflections")
      .select("student_id, content")
      .gte("created_at", `${monthStart}T00:00:00Z`)
      .lte("created_at", `${monthEndStr}T23:59:59Z`);

    const { data: journalEntries } = await supabase
      .from("journal_entries")
      .select("student_id, content")
      .gte("created_at", `${monthStart}T00:00:00Z`)
      .lte("created_at", `${monthEndStr}T23:59:59Z`);

    // Group by student
    const studentReflections = new Map<string, string[]>();

    for (const r of (sessionReflections ?? []) as Array<{
      student_id: string;
      content: string;
    }>) {
      const existing = studentReflections.get(r.student_id) ?? [];
      existing.push(r.content);
      studentReflections.set(r.student_id, existing);
    }

    for (const j of (journalEntries ?? []) as Array<{
      student_id: string;
      content: string;
    }>) {
      const existing = studentReflections.get(j.student_id) ?? [];
      existing.push(j.content);
      studentReflections.set(j.student_id, existing);
    }

    let digestsGenerated = 0;

    for (const [studentId, reflections] of studentReflections) {
      // Only generate for students with ≥3 reflections
      if (reflections.length < 3) continue;

      const themes = extractThemes(reflections);
      const growthPatterns = detectGrowthPatterns(reflections);
      const emotionalTrends = detectEmotionalTrends(reflections);
      const suggestedFocus = suggestFocus(themes, growthPatterns);

      // Upsert digest (one per student per month)
      const { error } = await supabase.from("reflection_digests").upsert(
        {
          student_id: studentId,
          month: monthStr,
          themes,
          growth_patterns: growthPatterns,
          emotional_trends: emotionalTrends,
          suggested_focus: suggestedFocus,
          shared_with: [],
        },
        { onConflict: "student_id,month" }
      );

      if (error) {
        console.error(
          `Failed to upsert digest for ${studentId}:`,
          error.message
        );
        continue;
      }

      digestsGenerated++;
    }

    return new Response(
      JSON.stringify({
        success: true,
        month: monthStr,
        digests_generated: digestsGenerated,
        students_processed: studentReflections.size,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
