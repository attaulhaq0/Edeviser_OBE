import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { getManagedServerKey } from "../_shared/serverSecret.ts";
import { timingSafeEqual } from "../_shared/timing-safe-equal.ts";
import { getAgenticConfig } from "../_shared/ai/config.ts";
import {
  isAuthenticatedRole,
  type AgentActionProposal,
  type AgentExecutionContext,
} from "../_shared/ai/contracts.ts";
import { hashEvidence } from "../_shared/ai/hash.ts";
import {
  AgentOrchestratorError,
  runAgentOrchestrator,
  type AgentAuditSink,
} from "../_shared/ai/orchestrator.ts";
import { AIProviderError } from "../_shared/ai/provider.ts";
import { createAIProvider } from "../_shared/ai/provider-factory.ts";
import type { ProposalStore } from "../_shared/ai/proposals.ts";
import { createSupabaseEmbeddingProvider } from "../_shared/ai/providers/supabase-embedding.ts";
import { SupabaseToolDataSource } from "../agent-orchestrator/data-source.ts";
import {
  buildProactiveMessage,
  type ProactiveJob,
} from "../_shared/ai/proactive-worker.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};
const DEFAULT_ENQUEUE_BATCH = 50;
const DEFAULT_WORK_BATCH = 10;
const MAX_ENQUEUE_BATCH = 100;
const MAX_WORK_BATCH = 25;

interface WorkerRequest {
  action: "scheduled_scan" | "evidence_event";
  institutionId?: string;
  studentId?: string;
  enqueueBatchSize: number;
  workBatchSize: number;
}

class WorkerRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WorkerRequestError";
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

const readRequest = async (req: Request): Promise<WorkerRequest> => {
  const body = object(await req.json().catch(() => null)) ?? {};
  if (
    body.action !== undefined &&
    body.action !== "scheduled_scan" &&
    body.action !== "evidence_event"
  ) {
    throw new WorkerRequestError("Unsupported worker action");
  }
  const action =
    body.action === "evidence_event" ? "evidence_event" : "scheduled_scan";
  const studentId = uuid(body.studentId);
  if (action === "evidence_event" && !studentId) {
    throw new WorkerRequestError("evidence_event requires a valid studentId");
  }
  return {
    action,
    institutionId: uuid(body.institutionId),
    studentId,
    enqueueBatchSize: boundedInteger(
      body.enqueueBatchSize,
      DEFAULT_ENQUEUE_BATCH,
      MAX_ENQUEUE_BATCH
    ),
    workBatchSize: boundedInteger(
      body.workBatchSize,
      DEFAULT_WORK_BATCH,
      MAX_WORK_BATCH
    ),
  };
};

const isSystemCaller = (req: Request): boolean => {
  const authHeader = req.headers.get("Authorization") ?? "";
  let serverKey: string | null = null;
  try {
    serverKey = getManagedServerKey();
  } catch {
    // A configured cron credential can still authorize recovery work.
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

const isRetryableFailure = (error: unknown): boolean =>
  !(error instanceof AgentOrchestratorError) ||
  error.kind === "provider_unavailable";

const proposalFromRow = (
  row: Record<string, unknown>
): AgentActionProposal => ({
  id: String(row.id),
  runId: String(row.run_id),
  actorUserId: String(row.actor_user_id),
  institutionId: String(row.institution_id),
  actionType: String(row.action_type),
  toolVersion:
    typeof row.tool_version === "string" ? row.tool_version : undefined,
  payload: object(row.payload) ?? {},
  reason: String(row.reason),
  evidence: Array.isArray(row.evidence_references)
    ? (row.evidence_references as AgentActionProposal["evidence"])
    : [],
  evidenceHash:
    typeof row.evidence_hash === "string" ? row.evidence_hash : undefined,
  risk: "protected",
  requiredApproverRole: String(
    row.required_approver_role
  ) as AgentActionProposal["requiredApproverRole"],
  requiredApproverUserId:
    typeof row.required_approver_user_id === "string"
      ? row.required_approver_user_id
      : undefined,
  status: String(row.status) as AgentActionProposal["status"],
  idempotencyKey: String(row.idempotency_key),
  createdAt: String(row.created_at),
  expiresAt: typeof row.expires_at === "string" ? row.expires_at : undefined,
  studentId: typeof row.student_id === "string" ? row.student_id : undefined,
  courseId: typeof row.course_id === "string" ? row.course_id : undefined,
  programId: typeof row.program_id === "string" ? row.program_id : undefined,
});

const processJob = async (
  admin: ReturnType<typeof createClient>,
  workerId: string,
  job: ProactiveJob,
  config: ReturnType<typeof getAgenticConfig>,
  provider: ReturnType<typeof createAIProvider>
): Promise<"completed" | "retry" | "dead_letter"> => {
  const requestId = crypto.randomUUID();
  const runId = crypto.randomUUID();
  const sessionId = crypto.randomUUID();
  const started = Date.now();
  if (!isAuthenticatedRole(job.recipient_role)) {
    throw new Error("Queue contained an unsupported recipient role");
  }
  const context: AgentExecutionContext = {
    requestId,
    runId,
    sessionId,
    identity: {
      userId: job.recipient_user_id,
      role: job.recipient_role,
      institutionId: job.institution_id,
    },
    specialist: job.specialist,
    page: {
      route: "/intelligence/proactive",
      studentId: job.student_id,
      courseId: job.course_id ?? undefined,
      programId: job.program_id ?? undefined,
    },
  };
  const inputHash = await hashEvidence({
    jobId: job.id,
    evidenceHash: job.evidence_hash,
    stateVersion: job.learning_state_version,
  });
  const { error: runError } = await admin.from("agent_runs").insert({
    id: runId,
    request_id: requestId,
    actor_user_id: job.recipient_user_id,
    actor_role: job.recipient_role,
    institution_id: job.institution_id,
    session_id: sessionId,
    specialist: job.specialist,
    input_hash: inputHash,
    status: "running",
    provider: provider.name,
  });
  if (runError) throw new Error("Proactive agent run could not be stored");

  const audit: AgentAuditSink = {
    async toolAttempt(event) {
      const { error } = await admin.from("agent_tool_attempts").insert({
        run_id: event.context.runId,
        request_id: event.context.requestId,
        actor_user_id: event.context.identity.userId,
        actor_role: event.context.identity.role,
        institution_id: event.context.identity.institutionId,
        session_id: event.context.sessionId,
        specialist: event.context.specialist,
        tool_name: event.toolName,
        tool_version: event.toolVersion,
        proposal_id: event.proposalId ?? null,
        evidence_hash: event.evidenceHash,
        status: event.status,
        risk_classification: event.risk,
        approval_state: event.approvalState,
        provider: provider.name,
        error_classification: event.errorClassification ?? null,
        started_at: event.startedAt,
        completed_at: event.completedAt,
        latency_ms: Math.max(
          0,
          Date.parse(event.completedAt) - Date.parse(event.startedAt)
        ),
      });
      if (error) throw new Error("Proactive tool audit could not be stored");
    },
  };
  const proposalStore: ProposalStore = {
    async create(proposal) {
      const evidenceHash = await hashEvidence(proposal.evidence);
      const { data, error } = await admin
        .from("agent_action_proposals")
        .upsert(
          {
            run_id: proposal.runId,
            actor_user_id: proposal.actorUserId,
            institution_id: proposal.institutionId,
            student_id: proposal.studentId ?? null,
            course_id: proposal.courseId ?? null,
            program_id: proposal.programId ?? null,
            action_type: proposal.actionType,
            tool_version: proposal.toolVersion ?? null,
            payload: proposal.payload,
            reason: proposal.reason,
            evidence_references: proposal.evidence,
            evidence_hash: evidenceHash,
            required_approver_role: proposal.requiredApproverRole,
            required_approver_user_id: proposal.requiredApproverUserId ?? null,
            status: "pending",
            idempotency_key: proposal.idempotencyKey,
            expires_at: proposal.expiresAt ?? null,
          },
          {
            onConflict: "institution_id,idempotency_key",
            ignoreDuplicates: true,
          }
        )
        .select("*")
        .maybeSingle();
      if (error) throw new Error("Proactive proposal could not be stored");
      if (data) return proposalFromRow(data as Record<string, unknown>);
      const { data: existing, error: existingError } = await admin
        .from("agent_action_proposals")
        .select("*")
        .eq("institution_id", proposal.institutionId)
        .eq("idempotency_key", proposal.idempotencyKey)
        .single();
      if (existingError)
        throw new Error("Proactive proposal could not be stored");
      return proposalFromRow(existing as Record<string, unknown>);
    },
  };

  try {
    const dataSource = new SupabaseToolDataSource(
      admin,
      createSupabaseEmbeddingProvider(),
      admin
    );
    const result = await runAgentOrchestrator({
      config,
      provider,
      dataSource,
      proposalAuthorizer: {
        async authorizeProposal(request, proposalContext, approverRole) {
          if (approverRole !== job.recipient_role) return null;
          return dataSource.authorizeProposal(
            request,
            proposalContext,
            approverRole
          );
        },
      },
      proposalStore,
      audit,
      request: { message: buildProactiveMessage(job), context },
    });
    const proposalIds = result.proposals.map((proposal) => proposal.id);
    const { data: completed, error: completeError } = await admin.rpc(
      "complete_proactive_agent_job_v1",
      {
        p_job_id: job.id,
        p_worker_id: workerId,
        p_run_id: runId,
        p_recommendation: result.response,
        p_proposal_ids: proposalIds,
        p_provider: result.provider,
        p_model: result.model,
      }
    );
    if (completeError || completed !== true) {
      throw new Error("Proactive job lease was lost before completion");
    }
    await admin
      .from("agent_runs")
      .update({
        status: "completed",
        specialist: result.specialist,
        model: result.model,
        usage: result.usage ?? {},
        completed_at: new Date().toISOString(),
        latency_ms: Date.now() - started,
      })
      .eq("id", runId);
    return "completed";
  } catch (error) {
    const classification =
      error instanceof AIProviderError
        ? "provider_unavailable"
        : error instanceof AgentOrchestratorError
        ? error.kind
        : "proactive_job_failed";
    const retryable = isRetryableFailure(error);
    await admin
      .from("agent_runs")
      .update({
        status: "failed",
        error_classification: classification,
        completed_at: new Date().toISOString(),
        latency_ms: Date.now() - started,
      })
      .eq("id", runId);
    const { data: failedStatus, error: failError } = await admin.rpc(
      "fail_proactive_agent_job_v1",
      {
        p_job_id: job.id,
        p_worker_id: workerId,
        p_error_classification: classification,
        p_retryable: retryable,
      }
    );
    if (failError)
      throw new Error("Proactive job failure could not be recorded");
    return failedStatus === "dead_letter" ? "dead_letter" : "retry";
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json(405, { error: "Method not allowed" });
  }
  if (!isSystemCaller(req)) {
    return json(401, { error: "Unauthorized" });
  }

  try {
    const config = getAgenticConfig(Deno.env);
    if (!config.enabled || !config.proactiveEnabled) {
      return json(200, {
        success: true,
        disabled: true,
        reason: "feature_flag",
      });
    }
    const request = await readRequest(req);
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      getManagedServerKey()
    );
    if (request.action === "evidence_event") {
      const { error: refreshError } = await admin.rpc(
        "refresh_student_learning_state_v1",
        { p_student_id: request.studentId }
      );
      if (refreshError)
        throw new Error("Student Learning State refresh failed");
    }
    const { data: enqueued, error: enqueueError } = await admin.rpc(
      "enqueue_proactive_agent_jobs_v1",
      {
        p_institution_id: request.institutionId ?? null,
        p_student_id: request.studentId ?? null,
        p_batch_size: request.enqueueBatchSize,
        p_trigger_source:
          request.action === "evidence_event" ? "evidence_event" : "schedule",
      }
    );
    if (enqueueError) throw new Error("Proactive candidate enqueue failed");

    const workerId = crypto.randomUUID();
    const provider = createAIProvider(config, { env: Deno.env });
    let claimedCount = 0;
    const totals = { completed: 0, retry: 0, deadLetter: 0 };
    for (let index = 0; index < request.workBatchSize; index += 1) {
      // Claim immediately before processing so queued work never burns its
      // lease while earlier model calls are running.
      const { data: claimed, error: claimError } = await admin.rpc(
        "claim_proactive_agent_jobs_v1",
        {
          p_worker_id: workerId,
          p_batch_size: 1,
          p_lease_seconds: 600,
        }
      );
      if (claimError) throw new Error("Proactive queue claim failed");
      const job = (claimed as ProactiveJob[] | null)?.[0];
      if (!job) break;
      claimedCount += 1;
      let status: "completed" | "retry" | "dead_letter";
      try {
        status = await processJob(admin, workerId, job, config, provider);
      } catch {
        const { data: failedStatus, error: failError } = await admin.rpc(
          "fail_proactive_agent_job_v1",
          {
            p_job_id: job.id,
            p_worker_id: workerId,
            p_error_classification: "proactive_job_initialization_failed",
            p_retryable: true,
          }
        );
        if (failError) {
          throw new Error(
            "Proactive job initialization failure was not stored"
          );
        }
        status = failedStatus === "dead_letter" ? "dead_letter" : "retry";
      }
      if (status === "completed") totals.completed += 1;
      else if (status === "dead_letter") totals.deadLetter += 1;
      else totals.retry += 1;
    }
    return json(200, {
      success: true,
      enqueued: Number(enqueued ?? 0),
      claimed: claimedCount,
      ...totals,
    });
  } catch (error) {
    console.error(
      "agent-worker failed",
      error instanceof Error ? error.message : "unknown_error"
    );
    return json(error instanceof WorkerRequestError ? 400 : 500, {
      error:
        error instanceof WorkerRequestError
          ? "Invalid worker request"
          : "Agent worker failed",
    });
  }
});
