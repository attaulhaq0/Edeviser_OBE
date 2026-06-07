import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ─── Bloom's level ordering (lower index = lower cognitive complexity) ───────
const BLOOMS_ORDER: Record<string, number> = {
  remembering: 0,
  understanding: 1,
  applying: 2,
  analyzing: 3,
  evaluating: 4,
  creating: 5,
};

// ─── Types ──────────────────────────────────────────────────────────────────

interface WeakCLO {
  outcome_id: string;
  course_id: string;
  attainment_percent: number;
  title: string;
  blooms_level: string | null;
}

interface PrerequisiteCLO {
  id: string;
  title: string;
  blooms_level: string | null;
}

interface SuggestionRecord {
  student_id: string;
  suggestion_type: string;
  suggestion_text: string;
  suggestion_data: Record<string, unknown>;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Build suggestion text explaining the CLO gap and recommended focus area.
 */
function buildSuggestionText(
  weakTitle: string,
  weakBlooms: string | null,
  weakAttainment: number,
  prereq: PrerequisiteCLO | null
): string {
  const bloomsLabel = weakBlooms
    ? weakBlooms.charAt(0).toUpperCase() + weakBlooms.slice(1)
    : "Unknown";

  if (prereq && prereq.blooms_level) {
    const prereqBlooms =
      prereq.blooms_level.charAt(0).toUpperCase() +
      prereq.blooms_level.slice(1);
    return (
      `Before you tackle "${weakTitle}" (${bloomsLabel}), strengthen your ` +
      `"${prereq.title}" (${prereqBlooms}) skills — your attainment is at ${weakAttainment}%.`
    );
  }

  return (
    `Focus on improving "${weakTitle}" (${bloomsLabel}) — your current attainment ` +
    `is ${weakAttainment}%, which is below the 70% target.`
  );
}

/**
 * Find the best prerequisite CLO for a weak CLO.
 * A prerequisite is a CLO in the same course that:
 *   1. Maps to at least one shared PLO (via outcome_mappings)
 *   2. Has a lower Bloom's taxonomy level
 * Returns the prerequisite with the closest (highest) Bloom's level below the weak CLO.
 */
async function findPrerequisiteCLO(
  supabase: ReturnType<typeof createClient>,
  weakCloId: string,
  weakCourseId: string,
  weakBlooms: string | null
): Promise<PrerequisiteCLO | null> {
  if (!weakBlooms || !(weakBlooms in BLOOMS_ORDER)) return null;

  const weakLevel = BLOOMS_ORDER[weakBlooms];
  if (weakLevel === 0) return null; // lowest level, no prerequisite possible

  // Find PLOs that the weak CLO maps to
  const { data: weakCloMappings } = await supabase
    .from("outcome_mappings")
    .select("target_outcome_id")
    .eq("source_outcome_id", weakCloId);

  if (!weakCloMappings || weakCloMappings.length === 0) return null;

  const sharedPloIds = weakCloMappings.map(
    (m: { target_outcome_id: string }) => m.target_outcome_id
  );

  // Find other CLOs in the same course that also map to those PLOs
  const { data: siblingMappings } = await supabase
    .from("outcome_mappings")
    .select("source_outcome_id")
    .in("target_outcome_id", sharedPloIds)
    .neq("source_outcome_id", weakCloId);

  if (!siblingMappings || siblingMappings.length === 0) return null;

  const siblingCloIds = [
    ...new Set(
      siblingMappings.map(
        (m: { source_outcome_id: string }) => m.source_outcome_id
      )
    ),
  ];

  // Fetch those CLOs and filter to same course + lower Bloom's level
  const { data: siblingCLOs } = await supabase
    .from("learning_outcomes")
    .select("id, title, blooms_level, course_id")
    .in("id", siblingCloIds)
    .eq("course_id", weakCourseId)
    .eq("type", "CLO");

  if (!siblingCLOs || siblingCLOs.length === 0) return null;

  // Pick the sibling with the highest Bloom's level that is still below the weak CLO
  let bestPrereq: PrerequisiteCLO | null = null;
  let bestLevel = -1;

  for (const clo of siblingCLOs) {
    const level = clo.blooms_level ? BLOOMS_ORDER[clo.blooms_level] ?? -1 : -1;
    if (level >= 0 && level < weakLevel && level > bestLevel) {
      bestLevel = level;
      bestPrereq = {
        id: clo.id,
        title: clo.title,
        blooms_level: clo.blooms_level,
      };
    }
  }

  return bestPrereq;
}

/**
 * Query historical cohort data to generate social proof text.
 * Finds how many students improved on a similar CLO and their average improvement.
 */
async function buildSocialProof(
  supabase: ReturnType<typeof createClient>,
  weakCloId: string,
  prereqCloId: string | null
): Promise<string | null> {
  if (!prereqCloId) return null;

  // Find students who have attainment records for both the prerequisite and weak CLO
  const { data: prereqAttainments } = await supabase
    .from("outcome_attainment")
    .select("student_id, attainment_percent")
    .eq("outcome_id", prereqCloId)
    .eq("scope", "student_course")
    .gte("attainment_percent", 70);

  if (!prereqAttainments || prereqAttainments.length === 0) return null;

  const studentIds = prereqAttainments.map(
    (a: { student_id: string }) => a.student_id
  );

  // Get those students' attainment on the weak CLO
  const { data: weakAttainments } = await supabase
    .from("outcome_attainment")
    .select("student_id, attainment_percent")
    .eq("outcome_id", weakCloId)
    .eq("scope", "student_course")
    .in("student_id", studentIds);

  if (!weakAttainments || weakAttainments.length === 0) return null;

  // Get all students' attainment on the weak CLO (for comparison)
  const { data: allWeakAttainments } = await supabase
    .from("outcome_attainment")
    .select("attainment_percent")
    .eq("outcome_id", weakCloId)
    .eq("scope", "student_course");

  if (!allWeakAttainments || allWeakAttainments.length === 0) return null;

  const avgWithPrereq =
    weakAttainments.reduce(
      (s: number, a: { attainment_percent: number }) =>
        s + a.attainment_percent,
      0
    ) / weakAttainments.length;

  const avgAll =
    allWeakAttainments.reduce(
      (s: number, a: { attainment_percent: number }) =>
        s + a.attainment_percent,
      0
    ) / allWeakAttainments.length;

  const improvement = Math.round(avgWithPrereq - avgAll);

  if (improvement <= 0) return null;

  return (
    `Students who mastered the prerequisite CLO before attempting this one ` +
    `scored ${improvement}% higher on average.`
  );
}

// ─── Main Handler ───────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ── Auth: require authenticated user ─────────────────────────────
    const authHeader = req.headers.get("Authorization") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const isServiceRole =
      serviceRoleKey && authHeader.replace("Bearer ", "") === serviceRoleKey;

    if (!isServiceRole) {
      if (!authHeader) {
        return new Response(
          JSON.stringify({ error: "Missing authorization header" }),
          {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      const userClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );
      const {
        data: { user: caller },
        error: authError,
      } = await userClient.auth.getUser();
      if (authError || !caller) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Role lives in profiles, not the JWT (app_metadata is empty here).
      const adminClientForRole = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      const { data: callerProfile } = await adminClientForRole
        .from("profiles")
        .select("role")
        .eq("id", caller.id)
        .maybeSingle();
      const callerRole =
        (callerProfile?.role as string) ??
        caller.app_metadata?.role ??
        caller.user_metadata?.role ??
        "";
      if (!["student", "teacher", "admin"].includes(callerRole)) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { student_id } = await req.json();

    if (!student_id) {
      return new Response(JSON.stringify({ error: "student_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Step 1: Find CLOs with attainment < 70% for this student ────────

    const { data: weakAttainments, error: attainmentErr } = await supabase
      .from("outcome_attainment")
      .select("outcome_id, course_id, attainment_percent")
      .eq("student_id", student_id)
      .eq("scope", "student_course")
      .lt("attainment_percent", 70);

    if (attainmentErr) {
      console.error("Failed to fetch attainment:", attainmentErr.message);
      return new Response(
        JSON.stringify({
          error: "Failed to fetch attainment data",
          detail: attainmentErr.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!weakAttainments || weakAttainments.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          suggestions: [],
          message: "No weak CLOs found",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch CLO details for the weak outcomes
    const outcomeIds = weakAttainments.map(
      (a: { outcome_id: string }) => a.outcome_id
    );

    const { data: cloDetails, error: cloErr } = await supabase
      .from("learning_outcomes")
      .select("id, title, blooms_level, course_id")
      .in("id", outcomeIds)
      .eq("type", "CLO");

    if (cloErr) {
      console.error("Failed to fetch CLO details:", cloErr.message);
      return new Response(
        JSON.stringify({
          error: "Failed to fetch CLO details",
          detail: cloErr.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Build a lookup map for CLO details
    const cloMap = new Map<
      string,
      { title: string; blooms_level: string | null; course_id: string | null }
    >();
    for (const clo of cloDetails ?? []) {
      cloMap.set(clo.id, {
        title: clo.title,
        blooms_level: clo.blooms_level,
        course_id: clo.course_id,
      });
    }

    // ── Step 2: Build weak CLO list with details ────────────────────────

    const weakCLOs: WeakCLO[] = [];
    for (const att of weakAttainments) {
      const detail = cloMap.get(att.outcome_id);
      if (detail) {
        weakCLOs.push({
          outcome_id: att.outcome_id,
          course_id: att.course_id ?? detail.course_id ?? "",
          attainment_percent: att.attainment_percent,
          title: detail.title,
          blooms_level: detail.blooms_level,
        });
      }
    }

    // ── Step 3: Generate suggestions for each weak CLO ──────────────────

    const suggestions: SuggestionRecord[] = [];

    for (const weak of weakCLOs) {
      // Find prerequisite CLO
      const prereq = await findPrerequisiteCLO(
        supabase,
        weak.outcome_id,
        weak.course_id,
        weak.blooms_level
      );

      // Build suggestion text
      const suggestionText = buildSuggestionText(
        weak.title,
        weak.blooms_level,
        weak.attainment_percent,
        prereq
      );

      // Build social proof
      const socialProofText = await buildSocialProof(
        supabase,
        weak.outcome_id,
        prereq?.id ?? null
      );

      suggestions.push({
        student_id,
        suggestion_type: "module_suggestion",
        suggestion_text: suggestionText,
        suggestion_data: {
          weak_clo_id: weak.outcome_id,
          weak_clo_title: weak.title,
          weak_clo_attainment: weak.attainment_percent,
          prerequisite_clo_id: prereq?.id ?? null,
          prerequisite_clo_title: prereq?.title ?? null,
          social_proof_text: socialProofText,
        },
      });
    }

    // ── Step 4: Store suggestions in ai_feedback table ──────────────────

    if (suggestions.length > 0) {
      const { error: insertErr } = await supabase
        .from("ai_feedback")
        .insert(suggestions);

      if (insertErr) {
        console.error("Failed to store suggestions:", insertErr.message);
        return new Response(
          JSON.stringify({
            error: "Failed to store suggestions",
            detail: insertErr.message,
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    // ── Step 5: Return the generated suggestions ────────────────────────

    return new Response(
      JSON.stringify({
        success: true,
        suggestions: suggestions.map((s) => ({
          student_id: s.student_id,
          suggestion_type: s.suggestion_type,
          suggestion_text: s.suggestion_text,
          ...s.suggestion_data,
        })),
        count: suggestions.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("ai-module-suggestion error:", (error as Error).message);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
