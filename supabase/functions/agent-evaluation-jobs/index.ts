/**
 * Tasks 7.4 + 8.2 (edeviser-agentic-intelligence) - agent-evaluation-jobs.
 *
 * System batch evaluator for the agentic platform. Selects COMPLETED
 * agent_runs that have no agent_evaluations row yet (idempotent), scores each
 * run through the deterministic evaluation harness (citation validity,
 * academic integrity, tool correctness), and persists the result into
 * agent_evaluations.
 *
 * Guardrails:
 *   - NEVER calls the LLM: scoring is fully deterministic (harness v1).
 *   - Small bounded batches; optional institution scoping.
 *   - Auth contract mirrors agent-worker: managed server key bearer OR
 *     x-cron-secret header. verify_jwt is disabled because only system
 *     schedulers may invoke this function.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import {
  evaluateRun,
  type CitationRecord,
  type IntegritySignal,
  type ToolCallRecord,
} from "../_shared/ai/evaluation/harness.ts";
import { getManagedServerKey } from "../_shared/serverSecret.ts";
import { timingSafeEqual } from "../_shared/timing-safe-equal.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};
const DEFAULT_BATCH_SIZE = 25;
const MAX_BATCH_SIZE = 100;

interface EvaluationRequest {
  institutionId?: string;
  batchSize: number;
}

class EvaluationRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EvaluationRequestError";
  }
}

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

const boundedInteger = (
  value: unknown,
  fallback: number,
  maximum: number
): number =>
  typeof value === "number" && Number.isInteger(value) && value >= 1
    ? Math.min(value, maximum)
    : fallback;

const isSystemCaller = (req: Request): boolean => {
  const authHeader = req.headers.get("Authorization") ?? "";
  let serverKey: string | null = null;
  try {
    serverKey = getManagedServerKey();
  } catch {
    // A configured cron credential can still authorize evaluation work.
  }
  const cronSecret = Deno.env.get("CRON_SECRET");
  return (
    (serverKey !== null &&
      timingSafeEqual(authHeader.replace("Bearer ", ""), serverKey)) ||
    (cronSecret !== undefined &&
      cronSecret.length > 0 &&
      timingSafeEqual(req.headers.get("x-cron-secret") ?? "", cronSecret))
  );
};

/** Accepts jsonb arrays of plain ids or objects carrying an id field. */
const idsFromJsonb = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  const ids: string[] = [];
  for (const entry of value) {
    if (typeof entry === "string" && entry.trim().length > 0) {
      ids.push(entry.trim());
      continue;
    }
    const record = object(entry);
    if (
      record &&
      typeof record.id === "string" &&
      record.id.trim().length > 0
    ) {
      ids.push(record.id.trim());
    }
  }
  return ids;
};

/**
 * Deterministic mapping of persisted agent_tool_calls rows onto harness
 * inputs: a rejected call was refused by authorization; invalid input is
 * recorded through the persisted error classification.
 */
const toolCallRecordOf = (row: Record<string, unknown>): ToolCallRecord => {
  const status = typeof row.status === "string" ? row.status : "failed";
  return {
    toolName:
      typeof row.tool_name === "string" ? row.tool_name : "unknown_tool",
    authorized: status !== "rejected",
    status:
      status === "succeeded" || status === "rejected"
        ? (status as "succeeded" | "rejected")
        : "failed",
    inputValid: row.error_classification !== "invalid_input",
  };
};

const readRequest = async (req: Request): Promise<EvaluationRequest> => {
  const body = object(await req.json().catch(() => null)) ?? {};
  const institutionId = uuid(body.institutionId);
  if (body.institutionId !== undefined && !institutionId) {
    throw new EvaluationRequestError("institutionId must be a valid UUID");
  }
  return {
    institutionId,
    batchSize: boundedInteger(
      body.batchSize,
      DEFAULT_BATCH_SIZE,
      MAX_BATCH_SIZE
    ),
  };
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (!isSystemCaller(req)) {
    return json(401, { error: "Unauthorized" });
  }

  try {
    const request = await readRequest(req);
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      getManagedServerKey()
    );

    // 1. Candidate runs: completed, oldest first, bounded scan window.
    let candidatesQuery = admin
      .from("agent_runs")
      .select("id, institution_id, specialist, error_classification")
      .eq("status", "completed");
    if (request.institutionId) {
      candidatesQuery = candidatesQuery.eq(
        "institution_id",
        request.institutionId
      );
    }
    const { data: runs, error: runsError } = await candidatesQuery
      .order("completed_at", { ascending: true })
      .limit(request.batchSize * 3);
    if (runsError) throw new Error("Agent run scan failed");

    const runRows = (runs ?? []) as Record<string, unknown>[];
    const candidateIds = runRows
      .map((row) => uuid(row.id))
      .filter((id): id is string => id !== undefined);
    if (candidateIds.length === 0) {
      return json(200, {
        success: true,
        scanned: 0,
        evaluated: 0,
        passed: 0,
        failed: 0,
      });
    }

    // 2. Idempotency: skip runs already evaluated.
    const { data: evaluatedRows, error: evaluatedError } = await admin
      .from("agent_evaluations")
      .select("run_id")
      .in("run_id", candidateIds);
    if (evaluatedError) throw new Error("Evaluation lookup failed");
    const alreadyEvaluated = new Set(
      ((evaluatedRows ?? []) as Record<string, unknown>[])
        .map((row) => (typeof row.run_id === "string" ? row.run_id : null))
        .filter((id): id is string => id !== null)
    );
    const pending = candidateIds
      .filter((id) => !alreadyEvaluated.has(id))
      .slice(0, request.batchSize);

    let passedCount = 0;
    let failedCount = 0;

    for (const runId of pending) {
      const runRow = runRows.find((row) => row.id === runId);
      const institutionId = runRow ? uuid(runRow.institution_id) : undefined;
      if (!runRow || !institutionId) continue;

      // 3. Evidence + citations straight from persisted messages (no LLM).
      const { data: messages, error: messagesError } = await admin
        .from("agent_messages")
        .select("role, citations, evidence")
        .eq("run_id", runId);
      if (messagesError) throw new Error("Agent message lookup failed");

      const messageRows = (messages ?? []) as Record<string, unknown>[];
      const evidenceIds = new Set<string>();
      for (const row of messageRows) {
        for (const id of idsFromJsonb(row.evidence)) evidenceIds.add(id);
      }
      const availableEvidenceIds = [...evidenceIds];
      const citations: CitationRecord[] = messageRows
        .filter((row) => row.role === "assistant")
        .flatMap((row) => idsFromJsonb(row.citations))
        .map((id) => ({ id, availableEvidenceIds }));

      // 4. Deterministic integrity signal from persisted classification.
      //    No heuristics on model output: only recorded violations count.
      const persistedError =
        typeof runRow.error_classification === "string"
          ? runRow.error_classification
          : "";
      const integritySignals: IntegritySignal[] =
        persistedError.includes("integrity") ||
        persistedError.includes("fabricated_attainment")
          ? [{ kind: "academic_integrity_violation", detected: true }]
          : [{ kind: "clean", detected: false }];

      // 5. Tool-call correctness from the audit table.
      const { data: toolCalls, error: toolCallsError } = await admin
        .from("agent_tool_calls")
        .select("tool_name, status, error_classification")
        .eq("run_id", runId);
      if (toolCallsError) throw new Error("Tool call lookup failed");
      const toolRecords = ((toolCalls ?? []) as Record<string, unknown>[]).map(
        toolCallRecordOf
      );

      const result = evaluateRun({
        citations,
        integritySignals,
        toolCalls: toolRecords,
      });

      const specialist =
        typeof runRow.specialist === "string" ? runRow.specialist : "unknown";

      const { error: insertError } = await admin
        .from("agent_evaluations")
        .insert({
          institution_id: institutionId,
          run_id: runId,
          evaluator_version: result.evaluatorVersion,
          citation_score: result.citationScore,
          integrity_score: result.integrityScore,
          tool_correctness_score: result.toolCorrectnessScore,
          overall_score: result.overallScore,
          passed: result.passed,
          details: {
            failedDimensions: result.failedDimensions,
            citationCount: citations.length,
            evidenceCount: availableEvidenceIds.length,
            toolCallCount: toolRecords.length,
            specialist,
          },
        });
      if (insertError) throw new Error("Evaluation persist failed");
      if (result.passed) passedCount += 1;
      else failedCount += 1;
    }

    return json(200, {
      success: true,
      scanned: candidateIds.length,
      evaluated: pending.length,
      passed: passedCount,
      failed: failedCount,
    });
  } catch (error) {
    console.error(
      "agent-evaluation-jobs failed",
      error instanceof Error ? error.message : "unknown_error"
    );
    return json(error instanceof EvaluationRequestError ? 400 : 500, {
      error:
        error instanceof EvaluationRequestError
          ? "Invalid evaluation request"
          : "Agent evaluation job failed",
    });
  }
});
