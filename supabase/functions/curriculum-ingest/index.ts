// =============================================================================
// curriculum-ingest — continuous-verification task 7.8
// =============================================================================
// Paste-in syllabus → DeepSeek extraction of candidate CLOs (bilingual AR/EN
// titles, Bloom's level, description) with TENTATIVE PLO/ILO mapping
// suggestions grounded in the program's REAL outcome ids. The output is a
// DRY-RUN: nothing is written to learning_outcomes/outcome_mappings here —
// the extraction is stored as a pending coordinator-approval proposal
// (agent_action_proposals) whose execution (execute_approved_curriculum_ingest_v1)
// writes through the existing validated outcome/mapping constraints.
// Fail-closed: zero curriculum writes before human approval.
// =============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { authenticateRequest } from "../_shared/auth.ts";
import { getManagedServerKey } from "../_shared/serverSecret.ts";
import { getAgenticConfig } from "../_shared/ai/config.ts";
import { isAuthenticatedRole } from "../_shared/ai/contracts.ts";
import { hashEvidence } from "../_shared/ai/hash.ts";
import { AIProviderError } from "../_shared/ai/provider.ts";
import { createAIProvider } from "../_shared/ai/provider-factory.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const json = (status: number, body: Record<string, unknown>): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const object = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const uuid = (value: unknown): string | undefined =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  )
    ? value
    : undefined;

interface CandidateCLO {
  title_en: string;
  title_ar: string | null;
  description_en: string | null;
  blooms: number;
  plo_id: string | null;
  plo_weight: number | null;
  ilo_id: string | null;
  ilo_weight: number | null;
}

const MAX_SYLLABUS_CHARS = 50_000;
const MAX_CANDIDATES = 30;

const SYSTEM_PROMPT = [
  "You are an expert curriculum analyst for an Outcome-Based-Education platform.",
  "You receive a course syllabus (UNTRUSTED_SYLLABUS) and the program's existing PLO and ILO ids.",
  "Extract candidate Course Learning Outcomes (CLOs) grounded ONLY in the syllabus.",
  "For each CLO return: title_en (action verb + measurable outcome), title_ar (faithful Arabic translation),",
  "description_en (1-2 sentences), blooms (integer 1-6: 1=Remembering .. 6=Creating).",
  "For tentative mappings you MAY reference ONLY the provided PLO/ILO ids — never invent ids.",
  "If no provided PLO fits a CLO, set plo_id null. Set ilo_id only when plo_id is set.",
  "Do NOT include student personal information. If the syllabus is unusable, return an empty clos array.",
].join(" ");

function buildExtractionPrompt(
  syllabusName: string,
  syllabusText: string,
  plos: Array<{ id: string; title: string }>,
  ilos: Array<{ id: string; title: string }>
): string {
  const ploContext = plos.length
    ? plos.map((p) => `- PLO ${p.id}: ${p.title}`).join("\n")
    : "(no PLOs defined for this program yet — set plo_id null for every CLO)";
  const iloContext = ilos.length
    ? ilos.map((i) => `- ILO ${i.id}: ${i.title}`).join("\n")
    : "(no ILOs defined for this institution yet — set ilo_id null for every CLO)";

  return `Extract candidate Course Learning Outcomes from the syllabus below.

## Syllabus Name
${syllabusName}

## Available Program PLOs (mapping candidates — use these ids ONLY)
${ploContext}

## Available Institution ILOs (mapping candidates — use these ids ONLY)
${iloContext}

## UNTRUSTED_SYLLABUS
${syllabusText}

## Instructions
1. Extract 3-15 candidate CLOs that are measurable, start with an action verb, and are grounded in the syllabus.
2. title_en must be in English; title_ar must be a faithful Arabic translation (or null if unsure).
3. blooms is an integer 1-6 per the Bloom's labels above.
4. Tentative mappings: set plo_id to the BEST-fitting provided PLO id (or null); plo_weight 0-1. When plo_id is set and an institution ILO fits that PLO, set ilo_id + ilo_weight (ilo_weight 0-1).
5. Never invent outcome ids. Never include student personal information.

## Output Format
Return ONLY JSON in this shape: {"clos": [{"title_en": "...", "title_ar": "...", "description_en": "...", "blooms": 3, "plo_id": "<id or null>", "plo_weight": 1.0, "ilo_id": "<id or null>", "ilo_weight": 0.5}], "summary": "<one-sentence extraction summary>"}.`;
}

interface CandidateCLO {
  title_en: string;
  title_ar: string | null;
  description_en: string | null;
  blooms: number;
  plo_id: string | null;
  plo_weight: number | null;
  ilo_id: string | null;
  ilo_weight: number | null;
}

const MAX_SYLLABUS_CHARS = 50_000;
const MAX_CANDIDATES = 30;

const SYSTEM_PROMPT = [
  "You are an expert curriculum analyst for an Outcome-Based-Education platform.",
  "You receive a course syllabus (UNTRUSTED_SYLLABUS) and the program's existing PLO and ILO ids.",
  "Extract candidate Course Learning Outcomes (CLOs) grounded ONLY in the syllabus.",
  "For each CLO return: title_en (action verb + measurable outcome), title_ar (faithful Arabic translation),",
  "description_en (1-2 sentences), blooms (integer 1-6: 1=Remembering .. 6=Creating).",
  "For tentative mappings you MAY reference ONLY the provided PLO/ILO ids — never invent ids.",
  "If no provided PLO fits a CLO, set plo_id null. Set ilo_id only when plo_id is set.",
  "Do NOT include student personal information. If the syllabus is unusable, return an empty clos array.",
].join(" ");

async function callAIProvider(
  prompt: string,
  provider: ReturnType<typeof createAIProvider>
): Promise<{
  clos: CandidateCLO[];
  summary: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  model: string;
}> {
  const response = await provider.complete({
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ],
    temperature: 0.3,
    maxOutputTokens: 4000,
    responseFormat: "json",
  });
  const raw = response.content.trim();
  const fenced = raw.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  const parsed: unknown = JSON.parse(fenced ? fenced[1] : raw);
  const body =
    parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  const rawClos =
    body && Array.isArray(body.clos) ? (body.clos as unknown[]) : null;
  if (!rawClos) {
    throw new Error("Provider response is not a valid curriculum extraction");
  }
  const clos: CandidateCLO[] = [];
  for (const entry of rawClos) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
    const c = entry as Record<string, unknown>;
    if (typeof c.title_en !== "string" || c.title_en.trim().length === 0)
      continue;
    if (
      typeof c.blooms !== "number" ||
      !Number.isInteger(c.blooms) ||
      c.blooms < 1 ||
      c.blooms > 6
    )
      continue;
    clos.push({
      title_en: c.title_en.trim().slice(0, 300),
      title_ar:
        typeof c.title_ar === "string" && c.title_ar.trim()
          ? c.title_ar.trim().slice(0, 300)
          : null,
      description_en:
        typeof c.description_en === "string" && c.description_en.trim()
          ? c.description_en.trim().slice(0, 1000)
          : null,
      blooms: c.blooms,
      plo_id: typeof c.plo_id === "string" ? c.plo_id : null,
      plo_weight: typeof c.plo_weight === "number" ? c.plo_weight : null,
      ilo_id: typeof c.ilo_id === "string" ? c.ilo_id : null,
      ilo_weight: typeof c.ilo_weight === "number" ? c.ilo_weight : null,
    });
    if (clos.length >= MAX_CANDIDATES) break;
  }
  return {
    clos,
    summary: typeof body?.summary === "string" ? body.summary.slice(0, 500) : "",
    promptTokens: response.usage?.inputTokens ?? 0,
    completionTokens: response.usage?.outputTokens ?? 0,
    totalTokens: response.usage?.totalTokens ?? 0,
    model: response.model,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST")
    return json(405, { error: { code: "method_not_allowed" } });

  const auth = await authenticateRequest(req);
  if (!auth.user || !isAuthenticatedRole(auth.user.role)) {
    return json(401, { error: { code: "unauthorized" } });
  }
  const body = object(await req.json().catch(() => null));
  if (!body) return json(400, { error: { code: "invalid_request" } });

  const identity = {
    userId: auth.user.id,
    role: auth.user.role,
    institutionId: auth.user.institution_id,
  } as const;
  if (identity.role !== "coordinator" && identity.role !== "admin") {
    return json(403, { error: { code: "forbidden" } });
  }

  const config = getAgenticConfig(Deno.env);
  if (!config.enabled) {
    return json(503, {
      error: { code: "ai_feature_disabled", retryable: false },
    });
  }

  const courseId = uuid(body.course_id);
  const syllabusName =
    typeof body.syllabus_name === "string"
      ? body.syllabus_name.trim().slice(0, 200)
      : "";
  const syllabusText =
    typeof body.syllabus_text === "string" ? body.syllabus_text : "";
  if (!courseId || !syllabusName || syllabusText.length < 200) {
    return json(400, {
      error: {
        code: "invalid_request",
        detail:
          "course_id, syllabus_name and syllabus_text (>= 200 chars) are required",
      },
    });
  }
  if (syllabusText.length > MAX_SYLLABUS_CHARS) {
    return json(413, { error: { code: "syllabus_too_large" } });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    getManagedServerKey()
  );

  // Scope: the course must belong to the caller's institution; coordinators
  // must still coordinate its program.
  const { data: courseRow, error: courseError } = await admin
    .from("courses")
    .select("id, program_id")
    .eq("id", courseId)
    .maybeSingle();
  if (courseError || !courseRow) {
    return json(404, { error: { code: "course_not_found" } });
  }
  const programId =
    typeof courseRow.program_id === "string" ? courseRow.program_id : null;
  if (!programId) {
    return json(404, { error: { code: "course_not_found" } });
  }
  const { data: program } = await admin
    .from("programs")
    .select("id, coordinator_id")
    .eq("id", programId)
    .eq("institution_id", identity.institutionId)
    .maybeSingle();
  if (!program) {
    return json(404, { error: { code: "course_not_found" } });
  }
  if (
    identity.role === "coordinator" &&
    program.coordinator_id !== identity.userId
  ) {
    return json(403, { error: { code: "forbidden" } });
  }

  // Grounding: the program's REAL PLOs + the institution's ILOs are the only
  // mapping candidates the model may reference.
  const plos = await admin
    .from("learning_outcomes")
    .select("id, title")
    .eq("program_id", programId)
    .eq("type", "PLO")
    .order("sort_order")
    .limit(50);
  const ilos = await admin
    .from("learning_outcomes")
    .select("id, title")
    .eq("institution_id", identity.institutionId)
    .eq("type", "ILO")
    .order("sort_order")
    .limit(50);

  const started = Date.now();
  const generationRequestId = crypto.randomUUID();
  const runId = crypto.randomUUID();
  const inputHash = await hashEvidence({
    courseId,
    syllabusName,
    syllabusText: syllabusText.slice(0, 2000),
  });
  const { error: runError } = await admin.from("agent_runs").insert({
    id: runId,
    request_id: generationRequestId,
    actor_user_id: identity.userId,
    actor_role: identity.role,
    institution_id: identity.institutionId,
    session_id: generationRequestId,
    specialist: "coordinator",
    input_hash: inputHash,
    status: "running",
    provider: "deepseek",
  });
  if (runError) {
    return json(409, { error: { code: "duplicate_or_invalid_request" } });
  }

  try {
    const provider = createAIProvider(config, { env: Deno.env });
    const prompt = buildExtractionPrompt(
      syllabusName,
      syllabusText,
      (plos.data ?? []) as Array<{ id: string; title: string }>,
      (ilos.data ?? []) as Array<{ id: string; title: string }>
    );
    const extraction = await callAIProvider(prompt, provider);

    // Grounding re-check: drop any candidate referencing unknown PLO/ILO ids.
    const ploIds = new Set(
      ((plos.data ?? []) as Array<{ id: string }>).map((p) => p.id)
    );
    const iloIds = new Set(
      ((ilos.data ?? []) as Array<{ id: string }>).map((i) => i.id)
    );
    const candidates = extraction.clos.filter(
      (c) =>
        (c.plo_id === null || ploIds.has(c.plo_id)) &&
        (c.ilo_id === null || iloIds.has(c.ilo_id))
    );

    if (candidates.length === 0) {
      await admin
        .from("agent_runs")
        .update({
          status: "failed",
          error_classification: "no_valid_candidates",
          completed_at: new Date().toISOString(),
          latency_ms: Date.now() - started,
        })
        .eq("id", runId);
      return json(422, {
        error: {
          code: "no_valid_candidates",
          detail:
            "The syllabus produced no valid CLO candidates. Try a richer excerpt.",
        },
      });
    }

    // DRY-RUN proposal: coordinator approval gates every curriculum write.
    const proposalId = crypto.randomUUID();
    const evidenceHash = await hashEvidence({
      syllabusName,
      syllabusText,
      candidates,
    });
    const { error: proposalError } = await admin
      .from("agent_action_proposals")
      .insert({
        id: proposalId,
        run_id: runId,
        actor_user_id: identity.userId,
        institution_id: identity.institutionId,
        course_id: courseId,
        program_id: programId,
        action_type: "ingest_curriculum",
        payload: {
          kind: "curriculum_ingest",
          course_id: courseId,
          program_id: programId,
          syllabus_name: syllabusName,
          clos: candidates,
        },
        reason: `Curriculum ingestion of "${syllabusName}" (${candidates.length} candidate CLOs) requires coordinator approval before any outcome write.`,
        evidence_references: [
          { kind: "material", id: generationRequestId, label: syllabusName },
        ],
        evidence_hash: evidenceHash,
        required_approver_role: "coordinator",
        required_approver_user_id:
          identity.role === "coordinator" ? identity.userId : null,
        status: "pending",
        idempotency_key: `curriculum_ingest:${courseId}:${evidenceHash}`,
        expires_at: new Date(Date.now() + 7 * 86_400_000).toISOString(),
      });
    if (proposalError) {
      await admin
        .from("agent_runs")
        .update({
          status: "failed",
          error_classification: "proposal_store_failed",
          completed_at: new Date().toISOString(),
          latency_ms: Date.now() - started,
        })
        .eq("id", runId);
      return json(500, { error: { code: "proposal_store_failed" } });
    }

    await admin
      .from("agent_runs")
      .update({
        status: "completed",
        model: extraction.model,
        usage: {
          inputTokens: extraction.promptTokens,
          outputTokens: extraction.completionTokens,
          totalTokens: extraction.totalTokens,
        },
        completed_at: new Date().toISOString(),
        latency_ms: Date.now() - started,
      })
      .eq("id", runId);

    return json(200, {
      runId,
      proposalId,
      candidateCount: candidates.length,
      candidates,
      summary: extraction.summary,
      model: extraction.model,
    });
  } catch (error) {
    const errorCode =
      error instanceof AIProviderError
        ? "provider_unavailable"
        : "agent_request_failed";
    await admin
      .from("agent_runs")
      .update({
        status: "failed",
        error_classification: errorCode,
        completed_at: new Date().toISOString(),
        latency_ms: Date.now() - started,
      })
      .eq("id", runId);
    return json(error instanceof AIProviderError ? 503 : 500, {
      error: {
        code: errorCode,
        retryable: error instanceof AIProviderError && error.retryable,
      },
    });
  }
});
