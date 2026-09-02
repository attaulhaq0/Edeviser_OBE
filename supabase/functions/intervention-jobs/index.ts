/**
 * Tasks 4.7 + 8.2 (edeviser-agentic-intelligence) - intervention-jobs.
 *
 * Background loop for the closed intervention cycle:
 *
 *   evaluate_measurements:
 *     Claims due PENDING intervention_measurements (window closed) through
 *     claim_due_intervention_measurements_v1 (SKIP LOCKED + lease + bounded
 *     attempts + dead-letter), derives the post-action metric DETERMINISTICALLY
 *     from the canonical student_learning_states mastery document, and records
 *     the official outcome through complete_intervention_evaluation_v1
 *     (which delegates to measure_intervention_v1). No LLM is invoked: the
 *     official metric/delta/evaluation state are server calculations only.
 *
 *   generate_candidates:
 *     Enqueues intervention-specialist proactive jobs (teacher recipients)
 *     from fresh low-mastery risk signals via
 *     enqueue_intervention_generation_jobs_v1. Idempotent per
 *     student+outcome+week; institution feature flags and A0 exclusion are
 *     enforced inside the RPC.
 *
 * Auth contract mirrors agent-worker/streak-risk-cron: managed server key
 * bearer OR x-cron-secret header. verify_jwt is disabled because only system
 * schedulers may invoke this function.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { getManagedServerKey } from "../_shared/serverSecret.ts";
import { timingSafeEqual } from "../_shared/timing-safe-equal.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};
const DEFAULT_BATCH_SIZE = 25;
const MAX_BATCH_SIZE = 100;
const LEASE_SECONDS = 600;

type InterventionAction =
  | "evaluate_measurements"
  | "generate_candidates"
  | "run_all";

interface InterventionJobRequest {
  action: InterventionAction;
  institutionId?: string;
  batchSize: number;
}

class InterventionJobRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InterventionJobRequestError";
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
    // A configured cron credential can still authorize loop work.
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

const readRequest = async (req: Request): Promise<InterventionJobRequest> => {
  const body = object(await req.json().catch(() => null)) ?? {};
  const action: InterventionAction =
    body.action === "evaluate_measurements" ||
    body.action === "generate_candidates" ||
    body.action === "run_all"
      ? body.action
      : "run_all";
  const institutionId = uuid(body.institutionId);
  if (body.institutionId !== undefined && !institutionId) {
    throw new InterventionJobRequestError("institutionId must be a valid UUID");
  }
  return {
    action,
    institutionId,
    batchSize: boundedInteger(
      body.batchSize,
      DEFAULT_BATCH_SIZE,
      MAX_BATCH_SIZE
    ),
  };
};

interface MeasurementRow {
  id: string;
  student_id: string;
  outcome_id: string | null;
}

interface MasteryOutcomeEntry {
  outcome_id?: unknown;
  attainmentPercent?: unknown;
  attainment_percent?: unknown;
  observedAt?: unknown;
  observed_at?: unknown;
}

/**
 * Deterministic post-action metric: the outcome attainment recorded in the
 * canonical Student Learning State mastery document. Returns null when no
 * mastery evidence exists for the measured outcome - the measurement then
 * resolves to INSUFFICIENT_EVIDENCE through the official RPC (never guessed).
 */
const derivePostActionMetric = (
  mastery: unknown,
  outcomeId: string | null
): { metric: number | null; evidence: Record<string, unknown> } => {
  const root = object(mastery);
  const outcomes = Array.isArray(root?.outcomes) ? root.outcomes : [];
  const evidence: Record<string, unknown> = {
    source: "student_learning_state",
    outcomeId,
    derivedAt: new Date().toISOString(),
  };
  if (!outcomeId) return { metric: null, evidence };
  const entry = outcomes
    .map((item) => object(item))
    .find(
      (item): item is Record<string, unknown> & MasteryOutcomeEntry =>
        item !== null && uuid(item.outcome_id) === outcomeId
    );
  if (!entry) return { metric: null, evidence };
  const rawMetric = entry.attainmentPercent ?? entry.attainment_percent;
  const metric =
    typeof rawMetric === "number" && Number.isFinite(rawMetric)
      ? rawMetric
      : null;
  evidence.attainmentPercent = metric;
  evidence.observedAt = entry.observedAt ?? entry.observed_at ?? null;
  return { metric, evidence };
};

const evaluateMeasurements = async (
  admin: ReturnType<typeof createClient>,
  batchSize: number
): Promise<Record<string, unknown>> => {
  const workerId = crypto.randomUUID();
  const { data: claimed, error: claimError } = await admin.rpc(
    "claim_due_intervention_measurements_v1",
    {
      p_worker_id: workerId,
      p_batch_size: batchSize,
      p_lease_seconds: LEASE_SECONDS,
    }
  );
  if (claimError) {
    // E1.2: a bare message made the 2026-09-01 21:00Z transient failure
    // undiagnosable. Surface the Postgres error + code so the next occurrence
    // (e.g. lock timeout during claim contention) is immediately explainable.
    throw new Error(
      `Measurement claim failed: ${claimError.message} (code ${claimError.code ?? "n/a"})`
    );
  }

  const rows = ((claimed ?? []) as Record<string, unknown>[]).map(
    (row): MeasurementRow => ({
      id: String(row.id),
      student_id: String(row.student_id),
      outcome_id: typeof row.outcome_id === "string" ? row.outcome_id : null,
    })
  );

  let completed = 0;
  let insufficient = 0;
  let retried = 0;
  let deadLetter = 0;

  for (const measurement of rows) {
    try {
      // Deterministic evidence: canonical Student Learning State only.
      const { data: stateRows, error: stateError } = await admin
        .from("student_learning_states")
        .select("mastery")
        .eq("student_id", measurement.student_id)
        .limit(1);
      if (stateError)
        throw new Error(
          `Learning state lookup failed: ${stateError.message} (code ${stateError.code ?? "n/a"})`
        );

      const mastery = (stateRows ?? [])[0]?.mastery;
      const { metric, evidence } = derivePostActionMetric(
        mastery,
        measurement.outcome_id
      );

      const { data: completedRow, error: completeError } = await admin.rpc(
        "complete_intervention_evaluation_v1",
        {
          p_measurement_id: measurement.id,
          p_worker_id: workerId,
          p_post_action_evidence: evidence,
          p_post_action_metric: metric,
        }
      );
      if (completeError)
        throw new Error(
          `Official measurement failed: ${completeError.message} (code ${completeError.code ?? "n/a"})`
        );
      const evaluationState =
        object(completedRow)?.evaluation_state === "INSUFFICIENT_EVIDENCE"
          ? "INSUFFICIENT_EVIDENCE"
          : "EVALUATED";
      if (evaluationState === "INSUFFICIENT_EVIDENCE") insufficient += 1;
      else completed += 1;
    } catch (error) {
      // Bounded retry: fail_intervention_evaluation_v1 dead-letters after the
      // attempt cap (3) enforced in SQL.
      const classification =
        error instanceof Error ? error.message : "unknown_error";
      const { data: status, error: failError } = await admin.rpc(
        "fail_intervention_evaluation_v1",
        {
          p_measurement_id: measurement.id,
          p_worker_id: workerId,
          p_error_classification: classification,
          p_dead_letter: false,
        }
      );
      if (failError) {
        console.error(
          "intervention-jobs: evaluation failure was not recorded",
          measurement.id
        );
        deadLetter += 1;
        continue;
      }
      if (status === "dead_letter") deadLetter += 1;
      else retried += 1;
    }
  }

  return {
    claimed: rows.length,
    completed,
    insufficientEvidence: insufficient,
    retry: retried,
    deadLetter,
  };
};

const generateCandidates = async (
  admin: ReturnType<typeof createClient>,
  institutionId: string | undefined,
  batchSize: number
): Promise<Record<string, unknown>> => {
  const { data: enqueued, error: enqueueError } = await admin.rpc(
    "enqueue_intervention_generation_jobs_v1",
    {
      p_institution_id: institutionId ?? null,
      p_batch_size: batchSize,
      p_trigger_source: "schedule",
    }
  );
  if (enqueueError) throw new Error("Intervention candidate enqueue failed");
  return { enqueued: Number(enqueued ?? 0) };
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

    if (request.action === "evaluate_measurements") {
      return json(200, {
        success: true,
        action: request.action,
        ...(await evaluateMeasurements(admin, request.batchSize)),
      });
    }
    if (request.action === "generate_candidates") {
      return json(200, {
        success: true,
        action: request.action,
        ...(await generateCandidates(
          admin,
          request.institutionId,
          request.batchSize
        )),
      });
    }

    const evaluation = await evaluateMeasurements(admin, request.batchSize);
    const generation = await generateCandidates(
      admin,
      request.institutionId,
      request.batchSize
    );
    return json(200, {
      success: true,
      action: request.action,
      ...evaluation,
      ...generation,
    });
  } catch (error) {
    console.error(
      "intervention-jobs failed",
      error instanceof Error ? error.message : "unknown_error"
    );
    return json(error instanceof InterventionJobRequestError ? 400 : 500, {
      error:
        error instanceof InterventionJobRequestError
          ? "Invalid intervention job request"
          : "Intervention job failed",
    });
  }
});
