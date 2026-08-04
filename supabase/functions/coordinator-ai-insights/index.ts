// =============================================================================
// coordinator-ai-insights — AI attainment insights for coordinators
// =============================================================================
//
// Generates an outcome-attainment insight for the caller's institution:
//   1. Reads REAL data (learning_outcomes + outcome_attainment + outcome_mappings
//      + institution_settings), all institution-scoped.
//   2. Computes a rule-based insight (mean attainment, below-target PLOs, weakest
//      contributing CLO, prioritized recommendations) — this ALWAYS works and is
//      genuinely useful with no LLM (mirrors the ai-feedback-draft template
//      approach).
//   3. If GEMINI_API_KEY is configured, ENHANCES the narrative + recommendations
//      with a Gemini call (non-streaming). On any LLM error it falls back to the
//      computed insight (never fails the request).
//   4. Caches the payload in coordinator_ai_insights (service role) so repeat
//      views are a cache hit; `refresh: true` forces regeneration.
//
// Auth: JWT-validated; role + institution resolved from profiles (app_metadata
// is empty on this project — mirrors _shared/auth.ts + ai-feedback-draft).
// Only coordinator/admin may call. Deploy with verify_jwt = true.
// =============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_SUCCESS_THRESHOLD = 70;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

interface OutcomeRow {
  id: string;
  type: string;
  title: string;
  course_id: string | null;
}
interface AttRow {
  outcome_id: string;
  attainment_percent: number | null;
}
interface MapRow {
  source_outcome_id: string;
  target_outcome_id: string;
}

interface InsightPayload {
  threshold: number;
  ploCount: number;
  avgAttainment: number | null;
  belowTargetCount: number;
  weakest: {
    ploTitle: string;
    cloTitle: string | null;
    attainment: number;
  } | null;
  narrative: string;
  recommendations: string[];
}

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const mean = (nums: number[]): number | null =>
  nums.length === 0
    ? null
    : Math.round(nums.reduce((s, n) => s + n, 0) / nums.length);

// ─── Rule-based insight (always available, no LLM) ──────────────────────────

function computeInsight(
  outcomes: OutcomeRow[],
  att: AttRow[],
  mappings: MapRow[],
  threshold: number
): InsightPayload {
  // Mean attainment per outcome.
  const byOutcome = new Map<string, number[]>();
  for (const r of att) {
    if (r.attainment_percent == null) continue;
    const list = byOutcome.get(r.outcome_id) ?? [];
    list.push(r.attainment_percent);
    byOutcome.set(r.outcome_id, list);
  }
  const meanOf = (id: string): number | null => {
    const list = byOutcome.get(id);
    return list && list.length > 0 ? mean(list) : null;
  };

  const byId = new Map<string, OutcomeRow>(outcomes.map((o) => [o.id, o]));
  // Undirected adjacency: outcome_mappings are stored child→parent for some
  // pairs (CLO→PLO) and parent→child for others, so resolve related CLOs by
  // outcome TYPE rather than edge direction.
  const relatedOf = new Map<string, Set<string>>();
  const addEdge = (a: string, b: string) => {
    const set = relatedOf.get(a) ?? new Set<string>();
    set.add(b);
    relatedOf.set(a, set);
  };
  for (const m of mappings) {
    addEdge(m.source_outcome_id, m.target_outcome_id);
    addEdge(m.target_outcome_id, m.source_outcome_id);
  }

  const plos = outcomes.filter((o) => o.type === "PLO");
  const ploAttainments: { title: string; attainment: number; id: string }[] =
    [];
  for (const plo of plos) {
    const a = meanOf(plo.id);
    if (a != null)
      ploAttainments.push({ id: plo.id, title: plo.title, attainment: a });
  }

  const avgAttainment = mean(ploAttainments.map((p) => p.attainment));
  const belowTarget = ploAttainments
    .filter((p) => p.attainment < threshold)
    .sort((a, b) => a.attainment - b.attainment);

  // Weakest contributing CLO of the weakest below-target PLO (or overall weakest PLO).
  const focusPlo =
    belowTarget[0] ??
    [...ploAttainments].sort((a, b) => a.attainment - b.attainment)[0] ??
    null;
  let weakest: InsightPayload["weakest"] = null;
  if (focusPlo) {
    const cloIds = Array.from(relatedOf.get(focusPlo.id) ?? []).filter(
      (id) => byId.get(id)?.type === "CLO"
    );
    let weakClo: { title: string; attainment: number } | null = null;
    for (const cid of cloIds) {
      const a = meanOf(cid);
      if (a == null) continue;
      if (!weakClo || a < weakClo.attainment) {
        weakClo = { title: byId.get(cid)?.title ?? cid, attainment: a };
      }
    }
    weakest = {
      ploTitle: focusPlo.title,
      cloTitle: weakClo?.title ?? null,
      attainment: weakClo?.attainment ?? focusPlo.attainment,
    };
  }

  // Narrative + recommendations (computed).
  const narrativeParts: string[] = [];
  if (avgAttainment != null) {
    narrativeParts.push(
      `Across ${ploAttainments.length} measured program outcomes, mean attainment is ${avgAttainment}%.`
    );
  }
  if (belowTarget.length > 0) {
    narrativeParts.push(
      `${belowTarget.length} outcome${
        belowTarget.length === 1 ? " is" : "s are"
      } below the ${threshold}% target.`
    );
    if (weakest) {
      narrativeParts.push(
        weakest.cloTitle
          ? `The weakest contributing area is "${weakest.cloTitle}" (${weakest.attainment}%) within "${weakest.ploTitle}".`
          : `The lowest outcome is "${weakest.ploTitle}" (${weakest.attainment}%).`
      );
    }
  } else {
    narrativeParts.push(`All measured outcomes meet the ${threshold}% target.`);
  }

  const recommendations: string[] = [];
  if (belowTarget.length > 0 && weakest) {
    recommendations.push(
      weakest.cloTitle
        ? `Draft a CQI plan for "${weakest.ploTitle}" targeting "${weakest.cloTitle}".`
        : `Draft a CQI plan to raise "${weakest.ploTitle}" above ${threshold}%.`
    );
    recommendations.push(
      "Review assessment alignment and remediation for outcomes below target."
    );
  } else {
    recommendations.push(
      "Outcomes are on track — focus on moving satisfactory outcomes toward excellent (≥85%)."
    );
  }
  recommendations.push(
    "Confirm evidence coverage before the next accreditation review."
  );

  return {
    threshold,
    ploCount: ploAttainments.length,
    avgAttainment,
    belowTargetCount: belowTarget.length,
    weakest,
    narrative: narrativeParts.join(" "),
    recommendations,
  };
}

// ─── Optional Gemini enhancement ────────────────────────────────────────────

async function enhanceWithGemini(
  base: InsightPayload,
  apiKey: string,
  model: string
): Promise<{ narrative: string; recommendations: string[] } | null> {
  const facts = {
    threshold: base.threshold,
    measuredOutcomes: base.ploCount,
    meanAttainment: base.avgAttainment,
    belowTargetCount: base.belowTargetCount,
    weakest: base.weakest,
  };
  const systemInstruction = {
    parts: [
      {
        text:
          "You are an outcome-based-education quality advisor for a university program coordinator. " +
          "Given factual attainment data, write a concise, professional insight (2–3 sentences) and 3 " +
          "prioritized, actionable recommendations. Do NOT invent numbers beyond the facts provided. " +
          'Respond ONLY as strict JSON: {"narrative": string, "recommendations": string[]}.',
      },
    ],
  };
  const contents = [
    {
      role: "user",
      parts: [
        { text: `Attainment facts (JSON):\n${JSON.stringify(facts, null, 2)}` },
      ],
    },
  ];

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: systemInstruction,
      contents,
      generationConfig: {
        maxOutputTokens: 512,
        temperature: 0.4,
        responseMimeType: "application/json",
      },
    }),
  });
  if (!resp.ok) throw new Error(`Gemini HTTP ${resp.status}`);
  const data = await resp.json();
  const text: string | undefined =
    data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) return null;
  const parsed = JSON.parse(text) as {
    narrative?: unknown;
    recommendations?: unknown;
  };
  const narrative =
    typeof parsed.narrative === "string" && parsed.narrative.trim()
      ? parsed.narrative.trim()
      : base.narrative;
  const recommendations = Array.isArray(parsed.recommendations)
    ? parsed.recommendations
        .filter(
          (r): r is string => typeof r === "string" && r.trim().length > 0
        )
        .slice(0, 5)
    : base.recommendations;
  return { narrative, recommendations };
}

// ─── Handler ────────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader)
      return json({ error: "Missing authorization header" }, 401);

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const {
      data: { user: caller },
      error: authError,
    } = await userClient.auth.getUser();
    if (authError || !caller) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Role + institution live in profiles, not the JWT.
    const { data: callerProfile } = await admin
      .from("profiles")
      .select("role, institution_id")
      .eq("id", caller.id)
      .maybeSingle();
    const role = (callerProfile?.role as string) ?? "";
    const institutionId = (callerProfile?.institution_id as string) ?? "";
    if (!["coordinator", "admin"].includes(role)) {
      return json(
        { error: "Forbidden: coordinator or admin role required" },
        403
      );
    }
    if (!institutionId)
      return json({ error: "No institution for caller" }, 400);

    let body: { kind?: string; refresh?: boolean } = {};
    try {
      body = (await req.json()) as typeof body;
    } catch {
      // empty body is fine — defaults apply
    }
    const kind = "attainment";
    const scopeKey = "institution";
    const refresh = body.refresh === true;

    // ── Cache check ───────────────────────────────────────────────────────
    if (!refresh) {
      const { data: cached } = await admin
        .from("coordinator_ai_insights")
        .select("payload, source, model, generated_at")
        .eq("institution_id", institutionId)
        .eq("kind", kind)
        .eq("scope_key", scopeKey)
        .order("generated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (
        cached &&
        Date.now() - new Date(cached.generated_at as string).getTime() <
          CACHE_TTL_MS
      ) {
        return json({
          ...(cached.payload as InsightPayload),
          source: cached.source,
          model: cached.model,
          generatedAt: cached.generated_at,
          cached: true,
        });
      }
    }

    // ── Fetch real institution-scoped data ─────────────────────────────────
    const { data: outcomesData, error: outErr } = await admin
      .from("learning_outcomes")
      .select("id, type, title, course_id")
      .eq("institution_id", institutionId);
    if (outErr) return json({ error: outErr.message }, 500);
    const outcomes = (outcomesData ?? []) as OutcomeRow[];
    const outcomeIds = outcomes.map((o) => o.id);

    let att: AttRow[] = [];
    let mappings: MapRow[] = [];
    if (outcomeIds.length > 0) {
      const [{ data: attData }, { data: mapData }] = await Promise.all([
        admin
          .from("outcome_attainment")
          .select("outcome_id, attainment_percent")
          .in("outcome_id", outcomeIds),
        admin
          .from("outcome_mappings")
          .select("source_outcome_id, target_outcome_id")
          .in("source_outcome_id", outcomeIds),
      ]);
      att = (attData ?? []) as AttRow[];
      mappings = (mapData ?? []) as MapRow[];
    }

    const { data: settings } = await admin
      .from("institution_settings")
      .select("success_threshold")
      .eq("institution_id", institutionId)
      .maybeSingle();
    const threshold =
      (settings?.success_threshold as number | undefined) ??
      DEFAULT_SUCCESS_THRESHOLD;

    // ── Compute + optionally enhance ────────────────────────────────────────
    const base = computeInsight(outcomes, att, mappings, threshold);
    let payload: InsightPayload = base;
    let source = "computed";
    let model: string | null = null;

    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    if (geminiKey) {
      const geminiModel =
        Deno.env.get("COORDINATOR_INSIGHTS_MODEL") ?? "gemini-2.0-flash";
      try {
        const enhanced = await enhanceWithGemini(base, geminiKey, geminiModel);
        if (enhanced) {
          payload = { ...base, ...enhanced };
          source = "ai";
          model = geminiModel;
        }
      } catch (err) {
        console.error(
          "Gemini enhancement failed (using computed):",
          (err as Error).message
        );
      }
    }

    // ── Cache (best-effort) ─────────────────────────────────────────────────
    const { error: insErr } = await admin
      .from("coordinator_ai_insights")
      .insert({
        institution_id: institutionId,
        kind,
        scope_key: scopeKey,
        payload,
        source,
        model,
        created_by: caller.id,
      });
    if (insErr) console.error("Failed to cache insight:", insErr.message);

    return json({
      ...payload,
      source,
      model,
      generatedAt: new Date().toISOString(),
      cached: false,
    });
  } catch (error) {
    console.error("coordinator-ai-insights error:", (error as Error).message);
    return json({ error: (error as Error).message }, 500);
  }
});
