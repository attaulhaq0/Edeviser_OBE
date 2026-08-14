import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { authenticateRequest } from "../_shared/auth.ts";
import { getManagedServerKey } from "../_shared/serverSecret.ts";
import { getAgenticConfig } from "../_shared/ai/config.ts";
import {
  isAuthenticatedRole,
  SPECIALISTS_BY_ROLE,
  type AgentActionProposal,
  type AgentExecutionContext,
  type AgentSpecialist,
} from "../_shared/ai/contracts.ts";
import { hashEvidence } from "../_shared/ai/hash.ts";
import {
  AgentOrchestratorError,
  runAgentOrchestrator,
  type AgentAuditSink,
} from "../_shared/ai/orchestrator.ts";
import { AIProviderError } from "../_shared/ai/provider.ts";
import { createAIProvider } from "../_shared/ai/provider-factory.ts";
import {
  assertMayDecideProposal,
  ProposalBoundaryError,
  type ProposalStore,
} from "../_shared/ai/proposals.ts";
import { createSupabaseEmbeddingProvider } from "../_shared/ai/providers/supabase-embedding.ts";
import { SupabaseToolDataSource } from "./data-source.ts";
import {
  executeApprovedProposal,
  ProtectedWriteBoundaryError,
} from "../_shared/ai/write-tools/execution.ts";

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

const proposalFromRow = (
  row: Record<string, unknown>
): AgentActionProposal => ({
  id: String(row.id),
  runId: String(row.run_id),
  actorUserId: String(row.actor_user_id),
  institutionId: String(row.institution_id),
  actionType: String(row.action_type),
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
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    getManagedServerKey()
  );
  const authorization = req.headers.get("Authorization");
  if (!authorization) {
    return json(401, { error: { code: "unauthorized" } });
  }
  const reader = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    {
      global: { headers: { Authorization: authorization } },
    }
  );

  if (body.action === "approve_proposal" || body.action === "reject_proposal") {
    const proposalId = uuid(body.proposalId);
    if (!proposalId)
      return json(400, { error: { code: "invalid_proposal_id" } });
    const { data, error } = await admin
      .from("agent_action_proposals")
      .select("*")
      .eq("id", proposalId)
      .eq("institution_id", identity.institutionId)
      .maybeSingle();
    if (error || !data)
      return json(404, { error: { code: "proposal_not_found" } });
    const proposal = proposalFromRow(data as Record<string, unknown>);
    try {
      assertMayDecideProposal(proposal, identity);
    } catch (decisionError) {
      return json(403, {
        error: {
          code:
            decisionError instanceof ProposalBoundaryError
              ? decisionError.kind
              : "proposal_decision_rejected",
        },
      });
    }
    const proposalRow = data as Record<string, unknown>;
    const targetCourseId = uuid(proposalRow.course_id);
    const targetProgramId = uuid(proposalRow.program_id);
    const targetStudentId = uuid(proposalRow.student_id);
    let targetStillAuthorized = identity.role === "admin";
    if (identity.role === "student") {
      targetStillAuthorized = targetStudentId === identity.userId;
    } else if (identity.role === "teacher") {
      if (targetCourseId) {
        const { data: course } = await admin
          .from("courses")
          .select("id")
          .eq("id", targetCourseId)
          .eq("teacher_id", identity.userId)
          .maybeSingle();
        targetStillAuthorized = Boolean(course);
      } else if (targetStudentId) {
        const { data: enrollments } = await admin
          .from("student_courses")
          .select("course_id")
          .eq("student_id", targetStudentId)
          .eq("status", "active");
        const courseIds = (enrollments ?? []).map(
          (entry: { course_id: string }) => entry.course_id
        );
        if (courseIds.length > 0) {
          const { data: assigned } = await admin
            .from("courses")
            .select("id")
            .in("id", courseIds)
            .eq("teacher_id", identity.userId)
            .limit(1);
          targetStillAuthorized = Boolean(assigned?.length);
        }
      }
    } else if (identity.role === "coordinator" && targetProgramId) {
      const { data: program } = await admin
        .from("programs")
        .select("id")
        .eq("id", targetProgramId)
        .eq("institution_id", identity.institutionId)
        .eq("coordinator_id", identity.userId)
        .maybeSingle();
      targetStillAuthorized = Boolean(program);
    } else if (identity.role === "parent" && targetStudentId) {
      const { data: link } = await admin
        .from("parent_student_links")
        .select("student_id")
        .eq("parent_id", identity.userId)
        .eq("student_id", targetStudentId)
        .eq("verified", true)
        .maybeSingle();
      targetStillAuthorized = Boolean(link);
    }
    if (!targetStillAuthorized) {
      return json(403, { error: { code: "proposal_scope_changed" } });
    }
    const nextStatus =
      body.action === "approve_proposal" ? "approved" : "rejected";
    const { data: decided, error: updateError } = await admin
      .from("agent_action_proposals")
      .update({
        status: nextStatus,
        decided_at: new Date().toISOString(),
        decided_by: identity.userId,
        decision_reason:
          typeof body.reason === "string" ? body.reason.slice(0, 2000) : null,
      })
      .eq("id", proposalId)
      .eq("status", "pending")
      .select("id,status,decided_at")
      .maybeSingle();
    if (updateError || !decided) {
      return json(409, { error: { code: "proposal_already_decided" } });
    }
    return json(200, {
      proposal: decided,
      protectedActionExecuted: false,
    });
  }

  if (body.action === "execute_proposal") {
    const proposalId = uuid(body.proposalId);
    if (!proposalId) {
      return json(400, { error: { code: "invalid_proposal_id" } });
    }
    const { data, error } = await admin
      .from("agent_action_proposals")
      .select("*")
      .eq("id", proposalId)
      .eq("institution_id", identity.institutionId)
      .maybeSingle();
    if (error || !data) {
      return json(404, { error: { code: "proposal_not_found" } });
    }
    const config = getAgenticConfig(Deno.env);
    const dataSource = new SupabaseToolDataSource(
      admin,
      createSupabaseEmbeddingProvider(),
      reader
    );
    try {
      const receipt = await executeApprovedProposal(
        proposalFromRow(data as Record<string, unknown>),
        identity,
        {
          featureEnabled: config.enabled,
          protectedWritesEnabled: config.protectedWritesEnabled,
        },
        dataSource,
        {
          async executeApprovedPersonalAction(targetProposalId) {
            const { data: result, error: executionError } = await admin.rpc(
              "execute_approved_agent_personal_action_v1",
              {
                p_proposal_id: targetProposalId,
                p_actor_id: identity.userId,
              }
            );
            if (executionError || !result) {
              throw new Error("Protected write RPC failed");
            }
            return result;
          },
        }
      );
      return json(200, { receipt });
    } catch (executionError) {
      const code =
        executionError instanceof ProtectedWriteBoundaryError
          ? executionError.kind
          : "execution_failed";
      const status =
        code === "feature_disabled"
          ? 503
          : code === "execution_failed"
          ? 500
          : code === "not_approved" || code === "expired"
          ? 409
          : code === "invalid_input" || code === "invalid_evidence"
          ? 400
          : 403;
      return json(status, { error: { code } });
    }
  }

  const config = getAgenticConfig(Deno.env);
  if (!config.enabled) {
    return json(503, {
      error: { code: "ai_feature_disabled", retryable: false },
    });
  }
  const message = typeof body.message === "string" ? body.message : "";
  const page = object(body.context) ?? {};
  const requestedSpecialist =
    typeof body.specialist === "string" ? body.specialist : undefined;
  const allowedSpecialists = SPECIALISTS_BY_ROLE[identity.role];
  const specialist = allowedSpecialists.includes(
    requestedSpecialist as AgentSpecialist
  )
    ? (requestedSpecialist as AgentSpecialist)
    : allowedSpecialists[0];
  const context: AgentExecutionContext = {
    requestId: uuid(body.requestId) ?? crypto.randomUUID(),
    runId: crypto.randomUUID(),
    sessionId: uuid(body.sessionId) ?? crypto.randomUUID(),
    identity,
    specialist,
    page: {
      route: typeof page.route === "string" ? page.route.slice(0, 500) : "/",
      studentId: uuid(page.studentId),
      courseId: uuid(page.courseId),
      programId: uuid(page.programId),
    },
  };
  const started = Date.now();
  const inputHash = await hashEvidence({ message, page: context.page });
  const { error: runInsertError } = await admin.from("agent_runs").insert({
    id: context.runId,
    request_id: context.requestId,
    actor_user_id: identity.userId,
    actor_role: identity.role,
    institution_id: identity.institutionId,
    session_id: context.sessionId,
    specialist,
    input_hash: inputHash,
    status: "running",
    provider: "deepseek",
  });
  if (runInsertError) {
    return json(409, { error: { code: "duplicate_or_invalid_request" } });
  }

  const audit: AgentAuditSink = {
    async toolAttempt(event) {
      const { error: auditError } = await admin
        .from("agent_tool_attempts")
        .insert({
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
          provider: "deepseek",
          error_classification: event.errorClassification ?? null,
          started_at: event.startedAt,
          completed_at: event.completedAt,
          latency_ms: Math.max(
            0,
            Date.parse(event.completedAt) - Date.parse(event.startedAt)
          ),
        });
      if (auditError) {
        throw new Error("Agent audit record could not be stored");
      }
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
      if (error) throw new Error("Proposal could not be stored");
      if (data) return proposalFromRow(data as Record<string, unknown>);
      const { data: existing, error: existingError } = await admin
        .from("agent_action_proposals")
        .select("*")
        .eq("institution_id", proposal.institutionId)
        .eq("idempotency_key", proposal.idempotencyKey)
        .single();
      if (existingError) throw new Error("Proposal could not be stored");
      return proposalFromRow(existing as Record<string, unknown>);
    },
  };

  try {
    const provider = createAIProvider(config, { env: Deno.env });
    const dataSource = new SupabaseToolDataSource(
      admin,
      createSupabaseEmbeddingProvider(),
      reader
    );
    const result = await runAgentOrchestrator({
      config,
      provider,
      dataSource,
      proposalAuthorizer: dataSource,
      proposalStore,
      audit,
      request: { message, context },
    });
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
      .eq("id", context.runId);
    return json(200, {
      requestId: context.requestId,
      runId: context.runId,
      sessionId: context.sessionId,
      ...result,
    });
  } catch (error) {
    const errorCode =
      error instanceof AIProviderError
        ? "provider_unavailable"
        : error instanceof AgentOrchestratorError
        ? error.kind
        : "agent_request_failed";
    await admin
      .from("agent_runs")
      .update({
        status: "failed",
        error_classification: errorCode,
        completed_at: new Date().toISOString(),
        latency_ms: Date.now() - started,
      })
      .eq("id", context.runId);
    return json(error instanceof AIProviderError ? 503 : 400, {
      error: {
        code: errorCode,
        retryable: error instanceof AIProviderError && error.retryable,
      },
    });
  }
});
