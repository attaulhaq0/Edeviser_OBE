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
import { createConfiguredEmbeddingProvider } from "../_shared/ai/embedding-registry.ts";
import { SupabaseToolDataSource } from "./data-source.ts";
import {
  fetchInstitutionAutonomySettings,
  resolveEffectiveAutonomyWithInstitution,
} from "../_shared/ai/policy/institution-autonomy.ts";
import {
  executeApprovedProposal,
  ProtectedWriteBoundaryError,
} from "../_shared/ai/write-tools/execution.ts";

// ─── Task 3.4: client-safe proposal projection (display-only) ───────────────
// Mirrors the AgentProposalView contract in src/lib/agentProposals.ts.
// Malformed rows are DROPPED (never coerced) so the inbox can only render
// verifiable shapes; authorization itself is re-checked server-side at
// decision time — this projection is for display only.
interface ProposalView {
  id: string;
  actionType: string;
  reason: string;
  evidenceCount: number;
  requiredApproverRole: string;
  requiredApproverUserId?: string;
  status: "pending";
  createdAt: string;
  expiresAt?: string;
}

const toProposalView = (row: Record<string, unknown>): ProposalView | null => {
  const id = uuid(row.id);
  const actionType =
    typeof row.action_type === "string" && row.action_type.length > 0
      ? row.action_type
      : undefined;
  const reason =
    typeof row.reason === "string" && row.reason.length > 0
      ? row.reason
      : undefined;
  const requiredApproverRole =
    typeof row.required_approver_role === "string"
      ? row.required_approver_role
      : undefined;
  const createdAt =
    typeof row.created_at === "string" ? row.created_at : undefined;
  if (
    !id ||
    !actionType ||
    !reason ||
    !requiredApproverRole ||
    !createdAt ||
    row.status !== "pending"
  ) {
    return null;
  }
  return {
    id,
    actionType,
    reason,
    evidenceCount: Array.isArray(row.evidence_references)
      ? row.evidence_references.length
      : 0,
    requiredApproverRole,
    ...(typeof row.required_approver_user_id === "string"
      ? { requiredApproverUserId: row.required_approver_user_id }
      : {}),
    status: "pending",
    createdAt,
    ...(typeof row.expires_at === "string"
      ? { expiresAt: row.expires_at }
      : {}),
  };
};

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

  // ─── Task 3.4: sanctioned proposal-inbox read channel ─────────────────────
  // agent_action_proposals has RLS ENABLED with ZERO policies (service-role
  // writes only), so the UI cannot list pending proposals directly. This
  // endpoint returns a validated, client-safe projection of the caller's
  // pending inbox: institution-scoped, approver-role-matched, pending only.
  // Decisions still re-verify approver identity + target scope server-side.
  if (body.action === "list_proposals") {
    const { data: rows, error: inboxError } = await admin
      .from("agent_action_proposals")
      .select(
        "id,action_type,reason,evidence_references,required_approver_role,required_approver_user_id,status,created_at,expires_at"
      )
      .eq("institution_id", identity.institutionId)
      .eq("required_approver_role", identity.role)
      .eq("status", typeof body.status === "string" ? body.status : "pending")
      .order("created_at", { ascending: false })
      .limit(50);
    if (inboxError) {
      return json(500, { error: { code: "inbox_unavailable" } });
    }
    const proposals = (rows ?? [])
      .map((row) => toProposalView(row as Record<string, unknown>))
      .filter((view) => view !== null);
    return json(200, { proposals });
  }

  // ─── Task 7.2: institution autonomy settings read channel ──────────────────
  // institution_autonomy_settings is RLS deny-all to clients by design, so the
  // autonomy control reads ONLY through this bounded channel. Returns the
  // caller's institution posture (ceiling, auto-exec, rollback). Unconfigured
  // institutions fall back to schema defaults (A2, auto-exec OFF, rollback ON).
  if (body.action === "get_institution_autonomy") {
    const settings = await fetchInstitutionAutonomySettings(
      admin,
      identity.institutionId
    );
    return json(200, { settings });
  }

  // ─── Task 6.3: institutional governance & cost snapshot (admin only) ────────
  // agent_runs / agent_tool_attempts / agent_action_proposals are deny-all to
  // clients by design, so the governance card reads ONLY through this bounded
  // channel: institution-scoped 7-day aggregates, no PII, no message bodies,
  // no per-actor drill-down. Non-admin callers fail closed with 403.
  if (body.action === "get_governance_summary") {
    if (identity.role !== "admin") {
      return json(403, { error: { code: "forbidden" } });
    }
    const since = new Date(Date.now() - 7 * 86_400_000).toISOString();
    const [runs, attempts, pending] = await Promise.all([
      admin
        .from("agent_runs")
        .select("status,usage")
        .eq("institution_id", identity.institutionId)
        .gte("created_at", since)
        .limit(5000),
      admin
        .from("agent_tool_attempts")
        .select("id", { count: "exact", head: true })
        .eq("institution_id", identity.institutionId)
        .gte("started_at", since),
      admin
        .from("agent_action_proposals")
        .select("id", { count: "exact", head: true })
        .eq("institution_id", identity.institutionId)
        .eq("status", "pending"),
    ]);
    if (
      runs.error ||
      attempts.error ||
      pending.error ||
      attempts.count === null ||
      pending.count === null
    ) {
      return json(500, { error: { code: "governance_unavailable" } });
    }
    let runsTotal = 0;
    let runsFailed = 0;
    let totalTokens = 0;
    for (const run of runs.data ?? []) {
      runsTotal += 1;
      if (run.status === "failed") runsFailed += 1;
      const usage = object(run.usage) ?? {};
      if (
        typeof usage.total_tokens === "number" &&
        Number.isFinite(usage.total_tokens)
      ) {
        totalTokens += Math.max(0, Math.trunc(usage.total_tokens));
      } else {
        for (const [key, value] of Object.entries(usage)) {
          if (key.includes("total")) continue;
          if (typeof value === "number" && Number.isFinite(value)) {
            totalTokens += Math.max(0, Math.trunc(value));
          }
        }
      }
    }
    return json(200, {
      summary: {
        runs_total: runsTotal,
        runs_failed: runsFailed,
        tool_attempts: attempts.count,
        proposals_pending: pending.count,
        total_tokens: totalTokens,
      },
    });
  }

  // ─── Task 7.2: institution autonomy posture for this run ──────────────────
  // Fail-closed: an unconfigured row yields the DB defaults (A2 ceiling,
  // auto-exec OFF, rollback ON); an unreadable row yields the safe posture
  // (A0). Protected actions ALWAYS require human approval regardless of
  // flags, and read tools remain RLS-scoped. The single gate for any future
  // A3 auto-execution path is mayAutoExecuteWithInstitutionPolicy() in
  // _shared/ai/policy/institution-autonomy.ts (unit + property tested).
  const institutionAutonomy = await fetchInstitutionAutonomySettings(
    admin,
    identity.institutionId
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
      createConfiguredEmbeddingProvider(),
      reader
    );
    try {
      const targetProposal = proposalFromRow(data as Record<string, unknown>);
      const receipt = await executeApprovedProposal(
        targetProposal,
        identity,
        {
          featureEnabled: config.enabled,
          protectedWritesEnabled: config.protectedWritesEnabled,
        },
        dataSource,
        {
          async executeApprovedPersonalAction(targetProposalId) {
            const executionFunction =
              targetProposal.actionType === "create_cqi_action"
                ? "execute_approved_cqi_action_v1"
                : "execute_approved_agent_personal_action_v1";
            const { data: result, error: executionError } = await admin.rpc(
              executionFunction,
              {
                p_proposal_id: targetProposalId,
                p_actor_id: identity.userId,
              }
            );
            if (executionError) {
              const errorBySqlState: Readonly<
                Record<
                  string,
                  { kind: ProtectedWriteBoundaryError["kind"]; message: string }
                >
              > = {
                "42501": {
                  kind: "unauthorized_scope",
                  message: "Proposal scope is no longer authorized",
                },
                "22023": {
                  kind: "invalid_input",
                  message: "Proposal payload is no longer valid",
                },
                "23505": {
                  kind: "not_approved",
                  message: "Proposal was already executed",
                },
                "40001": {
                  kind: "not_approved",
                  message: "Proposal execution lost a concurrent race",
                },
                P0002: {
                  kind: "not_approved",
                  message: "Proposal no longer exists",
                },
              };
              const mapped = errorBySqlState[executionError.code ?? ""];
              if (mapped) {
                throw new ProtectedWriteBoundaryError(
                  mapped.kind,
                  mapped.message
                );
              }
              throw new Error("Protected write RPC failed");
            }
            if (!result)
              throw new Error("Protected write RPC returned no receipt");
            return result;
          },
        }
      );
      const baselineMetric = targetProposal.payload.baselineMetric;
      const executionId = object(receipt)?.id;
      if (
        typeof baselineMetric === "number" &&
        typeof executionId === "string" &&
        targetProposal.studentId
      ) {
        const baselineEvidence = targetProposal.payload.baselineEvidence;
        await admin.rpc("register_intervention_measurement_v1", {
          p_proposal_id: targetProposal.id,
          p_execution_id: executionId,
          p_baseline_evidence: Array.isArray(baselineEvidence)
            ? baselineEvidence
            : [],
          p_baseline_metric: baselineMetric,
          p_window_start: targetProposal.createdAt,
          p_window_end:
            targetProposal.expiresAt ??
            new Date(Date.now() + 7 * 86_400_000).toISOString(),
          p_student_id: targetProposal.studentId,
          p_course_id: targetProposal.courseId ?? null,
          p_program_id: targetProposal.programId ?? null,
          p_outcome_id:
            typeof targetProposal.payload.outcomeId === "string"
              ? targetProposal.payload.outcomeId
              : null,
        });
      }
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
      createConfiguredEmbeddingProvider(),
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
      autonomy: {
        configured: institutionAutonomy.configured,
        institutionCeiling: institutionAutonomy.institutionCeiling,
        autoExecuteLowRisk: institutionAutonomy.autoExecuteLowRisk,
        rollbackEnabled: institutionAutonomy.rollbackEnabled,
        effective: resolveEffectiveAutonomyWithInstitution(institutionAutonomy),
      },
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
