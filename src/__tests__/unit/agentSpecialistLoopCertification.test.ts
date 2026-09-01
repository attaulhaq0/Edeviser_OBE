// Feature: edeviser-agentic-intelligence — tasks 4.3–4.6 end-to-end certification.
//
// Certifies the four specialist agents (mastery / habit / risk / intervention)
// through the REAL orchestrator loop — runAgentOrchestrator with the real read
// tool registry, strict deterministic parsers, audit sink, and proposal store —
// using a SCRIPTED provider (deterministic; no network, no LLM spend) and an
// in-memory ToolDataSource. This is the certification the spec deferral noted
// ("end-to-end certification pending") on top of the parser-level properties
// already covered by agentCertification.property.test.ts (4.8).
//
// Per specialist, BOTH sides are certified:
//   ✅ conforming model output  → strict parsed result surfaces on the response
//   ⛔ adversarial output       → parser REJECTS (guardrail) and the loop
//                                 degrades gracefully (no throw, no fabricated
//                                 structured result), per PDF §26–§28
// Guardrails under certification:
//   4.3 mastery — ILO rows may ONLY be labeled "derived alignment"
//   4.4 habit   — every signal MUST cite evidence ids (no invented metrics)
//   4.5 risk    — numeric scores are FORBIDDEN (categorical levels only)
//   4.6 intervention — every draft action MUST declare approvalRequired=true
import { describe, expect, it, vi } from "vitest";

import { getAgenticConfig } from "../../../supabase/functions/_shared/ai/config";
import type {
  AgentActionProposal,
  AgentExecutionContext,
  AgentSpecialist,
  AuthenticatedRole,
} from "../../../supabase/functions/_shared/ai/contracts";
import {
  runAgentOrchestrator,
  type OrchestratorResponse,
} from "../../../supabase/functions/_shared/ai/orchestrator";
import type {
  AICompletionResponse,
  AIProvider,
} from "../../../supabase/functions/_shared/ai/provider";
import {
  assertMayDecideProposal,
  type ProposalStore,
} from "../../../supabase/functions/_shared/ai/proposals";
import type { ToolDataSource } from "../../../supabase/functions/_shared/ai/tools/registry";
import { executeApprovedProposal } from "../../../supabase/functions/_shared/ai/write-tools/execution";

// ─── Deterministic fixture identities ────────────────────────────────────────

const STUDENT_ID = "44444444-4444-4444-8444-444444444444";
const INSTITUTION_ID = "55555555-5555-4555-8555-555555555555";
const COURSE_ID = "66666666-6666-4666-8666-666666666666";
const TEACHER_ID = "12121212-1212-4212-8212-121212121212";
const ADMIN_ID = "88888888-8888-4888-8888-888888888888";

// Tasks 4.5/4.6 + 6.2 identity matrix: the orchestrator rejects an initial
// specialist that is not allowed for the caller role (SPECIALISTS_BY_ROLE) and
// read tools are role-gated by the registry (get_at_risk_signals is
// teacher/coordinator/admin; get_habit_context is student-only), so
// certification identities follow the production role scoping exactly.
const ROLE_FOR_SPECIALIST: Readonly<
  Partial<Record<AgentSpecialist, AuthenticatedRole>>
> = {
  mastery: "student",
  habit: "student",
  risk: "teacher",
  intervention: "teacher",
  teacher: "teacher",
  admin: "admin",
};

const ROUTE_FOR_SPECIALIST: Readonly<Partial<Record<AgentSpecialist, string>>> =
  {
    mastery: "/student/dashboard",
    habit: "/student/dashboard",
    risk: "/teacher/dashboard",
    intervention: "/teacher/outcomes",
    teacher: "/teacher/courses",
    admin: "/admin/outcomes",
  };

const contextFor = (specialist: AgentSpecialist): AgentExecutionContext => ({
  requestId: "11111111-1111-4111-8111-111111111111",
  runId: "22222222-2222-4222-8222-222222222222",
  sessionId: "33333333-3333-4333-8333-333333333333",
  specialist,
  identity: {
    userId:
      specialist === "admin"
        ? ADMIN_ID
        : specialist === "risk" || specialist === "intervention"
        ? TEACHER_ID
        : STUDENT_ID,
    role: ROLE_FOR_SPECIALIST[specialist] ?? "student",
    institutionId: INSTITUTION_ID,
  },
  page: {
    route: ROUTE_FOR_SPECIALIST[specialist] ?? "/student/dashboard",
    studentId: STUDENT_ID,
    courseId: COURSE_ID,
  },
});

const config = () =>
  getAgenticConfig({
    get: (name: string) =>
      ({ AI_FEATURE_ENABLED: "true", AI_DAILY_BUDGET_USD: "10" }[name]),
  });

// ─── Scripted provider (queued responses) ────────────────────────────────────

const response = (
  toolCalls: AICompletionResponse["toolCalls"] = [],
  content = "done"
): AICompletionResponse => ({
  content,
  model: "deepseek-v4-flash",
  finishReason: toolCalls.length ? "tool_calls" : "stop",
  toolCalls,
});

const scriptedProvider = (queue: AICompletionResponse[]): AIProvider => ({
  name: "deepseek",
  complete: vi.fn(async () => queue.shift() ?? response([], "[cert] done")),
});

// ─── In-memory data source (real registry executes against this) ─────────────

const toolOutputFor = (tool: string): unknown => {
  switch (tool) {
    case "get_student_learning_context":
      return {
        student: { id: STUDENT_ID, institutionId: INSTITUTION_ID },
        learningState: { version: 3, freshness: { stale: false } },
        outcomes: [{ id: "plo-1", type: "PLO", attainment: 78 }],
      };
    case "get_habit_context":
      return {
        habits: { windowDays: 14, sessions: 4, streak: 2 },
        signals: [{ id: "ev-3", kind: "study_consistency" }],
      };
    case "get_at_risk_signals":
      return {
        signals: [
          { id: "ev-4", kind: "late_submission_pattern", level: "moderate" },
        ],
      };
    case "get_intervention_effects":
      return {
        effects: [{ id: "ev-5", action: "create_goal", measuredEffect: 0.18 }],
      };
    default:
      return { records: [] };
  }
};

const dependencies = (provider: AIProvider, specialist: AgentSpecialist) => {
  const audit = { toolAttempt: vi.fn().mockResolvedValue(undefined) };
  const proposalStore = {
    create: vi.fn<ProposalStore["create"]>(async (proposal) => ({
      ...proposal,
      id: "77777777-7777-4777-8777-777777777777",
    })),
  } satisfies ProposalStore;
  const dataSource = {
    authorizeScope: vi.fn().mockResolvedValue(true),
    executeRead: vi.fn(async (name: string) => toolOutputFor(name)),
  };
  return {
    config: config(),
    provider,
    dataSource: dataSource as unknown as ToolDataSource,
    proposalAuthorizer: {
      authorizeProposal: vi.fn().mockResolvedValue({
        studentId: STUDENT_ID,
        courseId: COURSE_ID,
        requiredApproverUserId: STUDENT_ID,
      }),
    },
    proposalStore,
    audit,
    request: {
      message: "Certify this specialist end-to-end",
      context: contextFor(specialist),
    },
    auditRef: audit,
    proposalStoreRef: proposalStore,
  };
};

const run = async (
  specialist: AgentSpecialist,
  queue: AICompletionResponse[]
): Promise<OrchestratorResponse> => {
  const deps = dependencies(scriptedProvider(queue), specialist);
  return runAgentOrchestrator(deps);
};

// ─── Strict-JSON analysis bodies (conforming per the parser contracts) ──────

const MASTERY_JSON = JSON.stringify({
  outcomes: [
    {
      outcomeId: "ilo-1",
      outcomeType: "ILO",
      alignmentLabel: "derived alignment",
      trend: "improving",
      prerequisiteGaps: ["plo-2"],
      evidenceIds: ["ev-1"],
    },
    {
      outcomeId: "plo-1",
      outcomeType: "PLO",
      attainmentPercent: 78,
      alignmentLabel: "attained",
      evidenceIds: ["ev-1", "ev-2"],
    },
  ],
  chainExplanation:
    "CLO attainment aggregates into PLO attainment; ILO alignment is DERIVED through the canonical mappings.",
  prerequisiteGapSummary: "Prerequisite gap detected in plo-2 before plo-1.",
});

const HABIT_JSON = JSON.stringify({
  windowDays: 14,
  signals: [
    {
      signal: "study_consistency",
      observation: "4 completed sessions across the 14-day window",
      evidenceIds: ["ev-3"],
    },
  ],
  recoverySteps: ["Schedule two short sessions per week."],
});

const RISK_JSON = JSON.stringify({
  findings: [
    {
      signal: "late_submission_pattern",
      level: "moderate",
      basis: "3 late submissions inside the 14-day window",
      evidenceIds: ["ev-4"],
      escalation: "notify_teacher",
    },
  ],
  overallLevel: "moderate",
  summary: "Moderate lateness risk driven by submission timing.",
});

const INTERVENTION_JSON = JSON.stringify({
  studentId: STUDENT_ID,
  selectedBecause: "Positive measured effect (0.18) for comparable cohorts.",
  avoidedBecause: ["Prior intervention measured negative for this student."],
  draftActions: [
    {
      actionType: "create_goal",
      payload: {
        title: "Focus week on on-time submissions",
        weekStart: "2026-09-07",
        goalType: "tasks_completed",
        targetValue: 5,
      },
      rationale: "Rebuild submission consistency with a bounded goal.",
      expectedEffectBasis:
        "Measured effect +0.18 completion in comparable cohorts.",
      evidenceIds: ["ev-5"],
      approvalRequired: true,
    },
  ],
});

// ─── 4.3 Mastery Agent certification ─────────────────────────────────────────

describe("4.3 Mastery Agent — end-to-end loop certification", () => {
  it("surfaces the strict parsed analysis for conforming output through the full loop", async () => {
    const result = await run("mastery", [
      response([
        {
          id: "c1",
          name: "get_student_learning_context",
          arguments: { studentId: STUDENT_ID, courseId: COURSE_ID },
        },
      ]),
      response([], `Analysis complete. ${MASTERY_JSON}`),
    ]);
    expect(result.specialist).toBe("mastery");
    expect(result.evidence.length).toBeGreaterThan(0);
    expect(result.masteryAnalysis).not.toBeUndefined();
    const iloRow = result.masteryAnalysis?.outcomes.find(
      (o) => o.outcomeType === "ILO"
    );
    expect(iloRow?.alignmentLabel.toLowerCase()).toBe("derived alignment");
    expect(
      result.masteryAnalysis?.outcomes.every((o) => o.evidenceIds.length > 0)
    ).toBe(true);
  });

  it("REJECTS ILO rows not labeled 'derived alignment' (no official attainment claims)", async () => {
    const adversarial = JSON.stringify({
      outcomes: [
        {
          outcomeId: "ilo-1",
          outcomeType: "ILO",
          alignmentLabel: "official attainment 92%",
          evidenceIds: ["ev-1"],
        },
      ],
      chainExplanation: "x",
      prerequisiteGapSummary: "y",
    });
    const result = await run("mastery", [
      response([
        { id: "c1", name: "get_student_learning_context", arguments: {} },
      ]),
      response([], adversarial),
    ]);
    expect(result.masteryAnalysis).toBeUndefined();
    expect(result.response).toContain("official attainment");
  });
});

// ─── 4.4 Habit Agent certification ───────────────────────────────────────────

describe("4.4 Habit Agent — end-to-end loop certification", () => {
  it("surfaces the strict parsed analysis for conforming cited output", async () => {
    const result = await run("habit", [
      response([
        {
          id: "c1",
          name: "get_habit_context",
          arguments: { studentId: STUDENT_ID },
        },
      ]),
      response([], HABIT_JSON),
    ]);
    expect(result.specialist).toBe("habit");
    expect(result.habitAnalysis?.windowDays).toBe(14);
    expect(result.habitAnalysis?.signals[0]?.evidenceIds).toEqual(["ev-3"]);
    expect(result.habitAnalysis?.recoverySteps.length).toBeGreaterThan(0);
  });

  it("REJECTS uncited signals (the model may never invent metrics)", async () => {
    const adversarial = JSON.stringify({
      windowDays: 14,
      signals: [
        {
          signal: "study_consistency",
          observation: "invented observation — no citation",
        },
      ],
      recoverySteps: [],
    });
    const result = await run("habit", [
      response([{ id: "c1", name: "get_habit_context", arguments: {} }]),
      response([], adversarial),
    ]);
    expect(result.habitAnalysis).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// 4.5 Risk Agent certification - numeric risk scores are FORBIDDEN in agent
// output (categorical levels only; deterministic scores live server-side).
// ---------------------------------------------------------------------------

describe("4.5 Risk Agent - end-to-end loop certification", () => {
  it("surfaces the strict parsed assessment for conforming categorical output", async () => {
    const result = await run("risk", [
      response(
        [
          {
            id: "c1",
            name: "get_at_risk_signals",
            arguments: { studentId: STUDENT_ID },
          },
        ],
        "collecting deterministic signals"
      ),
      response([], RISK_JSON),
    ]);
    expect(result.specialist).toBe("risk");
    expect(result.riskAssessment).not.toBeUndefined();
    expect(result.riskAssessment?.overallLevel).toBe("moderate");
    expect(result.riskAssessment?.findings[0]?.evidenceIds).toEqual(["ev-4"]);
    expect(result.riskAssessment?.findings[0]?.escalation).toBe(
      "notify_teacher"
    );
  });

  it("REJECTS numeric risk scores emitted by the model (guardrail)", async () => {
    const adversarial = JSON.stringify({
      findings: [
        {
          signal: "late_submission_pattern",
          level: "high",
          basis: "model-invented numeric score",
          riskScore: 0.87,
          evidenceIds: ["ev-4"],
          escalation: "intervene_now",
        },
      ],
      overallLevel: "high",
      summary: "Attempts to fabricate a deterministic score.",
    });
    const result = await run("risk", [
      response([
        {
          id: "c1",
          name: "get_at_risk_signals",
          arguments: { courseId: COURSE_ID },
        },
      ]),
      response([], adversarial),
    ]);
    expect(result.riskAssessment).toBeUndefined();
    expect(result.response).toContain("riskScore");
  });

  it("certifies the audit trail for a teacher-scoped risk read", async () => {
    const deps = dependencies(
      scriptedProvider([
        response([
          {
            id: "c1",
            name: "get_at_risk_signals",
            arguments: { courseId: COURSE_ID },
          },
        ]),
        response([], RISK_JSON),
      ]),
      "risk"
    );
    await runAgentOrchestrator(deps);
    expect(deps.auditRef.toolAttempt).toHaveBeenCalledWith(
      expect.objectContaining({
        toolName: "get_at_risk_signals",
        status: "succeeded",
        risk: "read",
        approvalState: "not_required",
      })
    );
    const executeRead = (
      deps.dataSource as unknown as { executeRead: ReturnType<typeof vi.fn> }
    ).executeRead;
    expect(executeRead).toHaveBeenCalledWith(
      "get_at_risk_signals",
      expect.anything(),
      expect.anything()
    );
  });
});

// ---------------------------------------------------------------------------
// 4.6 Intervention Agent certification - every draft action MUST declare
// approvalRequired=true and cite measured-effect evidence; drafts become
// human-approval proposals through propose_protected_action (never execution).
// ---------------------------------------------------------------------------

describe("4.6 Intervention Agent - end-to-end loop certification", () => {
  it("surfaces the strict parsed plan for conforming measured-effect output", async () => {
    const result = await run("intervention", [
      response(
        [
          {
            id: "c1",
            name: "get_intervention_effects",
            arguments: { studentId: STUDENT_ID },
          },
        ],
        "reading measured effects"
      ),
      response([], INTERVENTION_JSON),
    ]);
    expect(result.specialist).toBe("intervention");
    expect(result.interventionPlan).not.toBeUndefined();
    const draft = result.interventionPlan?.draftActions[0];
    expect(draft?.approvalRequired).toBe(true);
    expect(draft?.evidenceIds).toEqual(["ev-5"]);
    expect(result.interventionPlan?.avoidedBecause.length).toBeGreaterThan(0);
  });

  it("REJECTS draft actions that do not declare approvalRequired=true", async () => {
    const adversarial = JSON.stringify({
      studentId: STUDENT_ID,
      selectedBecause: "positive measured effect",
      avoidedBecause: [],
      draftActions: [
        {
          actionType: "create_goal",
          payload: { title: "silent execution attempt" },
          rationale: "tries to skip the approval gate",
          expectedEffectBasis: "none",
          evidenceIds: ["ev-5"],
          approvalRequired: false,
        },
      ],
    });
    const result = await run("intervention", [
      response([{ id: "c1", name: "get_intervention_effects", arguments: {} }]),
      response([], adversarial),
    ]);
    expect(result.interventionPlan).toBeUndefined();
  });

  it("maps a draft onto a pending human-approval proposal (never execution)", async () => {
    const deps = dependencies(
      scriptedProvider([
        response([
          {
            id: "c1",
            name: "propose_protected_action",
            arguments: {
              actionType: "create_goal",
              payload: {
                title: "Focus week on on-time submissions",
                weekStart: "2026-09-07",
                goalType: "tasks_completed",
                targetValue: 5,
              },
              reason:
                "Intervention draft selected on positive measured effect.",
              evidence: [{ kind: "signal", id: "ev-5" }],
            },
          },
        ]),
        response([], "Draft captured as a pending proposal."),
      ]),
      "intervention"
    );
    const result = await runAgentOrchestrator(deps);
    expect(result.proposals).toHaveLength(1);
    const proposal = result.proposals[0];
    if (!proposal) throw new Error("expected one proposal");
    expect(proposal.actionType).toBe("create_goal");
    expect(proposal.status).toBe("pending");
    expect(proposal.risk).toBe("protected");
    expect(proposal.requiredApproverRole).toBe("student");
    expect(deps.auditRef.toolAttempt).toHaveBeenCalledWith(
      expect.objectContaining({
        toolName: "propose_protected_action",
        status: "succeeded",
        risk: "protected",
        approvalState: "pending",
        proposalId: proposal.id,
      })
    );
    expect(() =>
      assertMayDecideProposal(proposal, {
        userId: STUDENT_ID,
        role: "student",
        institutionId: INSTITUTION_ID,
      })
    ).not.toThrow();
    expect(() =>
      assertMayDecideProposal(proposal, {
        userId: TEACHER_ID,
        role: "teacher",
        institutionId: INSTITUTION_ID,
      })
    ).toThrow(/not the required proposal approver/);
  });
});

// ---------------------------------------------------------------------------
// 6.2 Full Admin Agent - execution-path proof: outcome-governance propose tool
// through the REAL orchestrator loop -> createHumanApprovalProposal (admin
// approver, protected risk, pending) -> executeApprovedProposal protected-write
// boundary (validated receipt; pending/wrong-approver proposals never execute).
// ---------------------------------------------------------------------------

const ILO_EXEC_ID = "aaaaaaa1-0000-4000-8000-000000000001";
const ILO_TARGET_ID = "aaaaaaa2-0000-4000-8000-000000000002";
const EMPTY_SHA256 =
  "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

const approvedIloProposal = (
  overrides: Partial<AgentActionProposal> = {}
): AgentActionProposal => ({
  id: "bbbbbbb1-0000-4000-8000-000000000003",
  runId: "22222222-2222-4222-8222-222222222222",
  actorUserId: ADMIN_ID,
  institutionId: INSTITUTION_ID,
  actionType: "create_ilo",
  toolVersion: "1.0.0",
  payload: { title: "Lifelong learning" },
  reason: "Accreditation coverage gap cited in evidence.",
  evidence: [{ kind: "outcome", id: "ilo-coverage-2026-08" }],
  evidenceHash: EMPTY_SHA256,
  risk: "protected",
  requiredApproverRole: "admin",
  requiredApproverUserId: ADMIN_ID,
  status: "approved",
  idempotencyKey: "62626262-6262-4626-8262-626262626262",
  createdAt: "2026-08-01T00:00:00.000Z",
  expiresAt: "2099-01-01T00:00:00.000Z",
  ...overrides,
});

describe("6.2 Full Admin Agent - proposal -> execution path certification", () => {
  it("creates an Admin-approval proposal through the real orchestrator loop", async () => {
    const deps = dependencies(
      scriptedProvider([
        response([
          {
            id: "g1",
            name: "propose_create_ilo",
            arguments: {
              title: "Lifelong learning",
              reason: "Accreditation coverage gap cited in evidence.",
              evidence: [{ kind: "outcome", id: "ilo-coverage-2026-08" }],
            },
          },
        ]),
        response([], "Proposal drafted for Admin approval."),
      ]),
      "admin"
    );
    deps.proposalAuthorizer.authorizeProposal = vi
      .fn()
      .mockResolvedValue({ requiredApproverUserId: ADMIN_ID });
    const result = await runAgentOrchestrator(deps);
    const toolResult = result.evidence.find(
      (entry) => entry.tool === "propose_create_ilo"
    ) as { data?: Record<string, unknown> } | undefined;
    expect(toolResult?.data?.protectedActionExecuted).toBe(false);
    expect(toolResult?.data?.status).toBe("pending");
    const capturedCall = deps.proposalStoreRef.create.mock.calls[0];
    if (!capturedCall) throw new Error("expected a captured proposal create");
    const captured = capturedCall[0];
    expect(captured.actionType).toBe("create_ilo");
    expect(captured.requiredApproverRole).toBe("admin");
    expect(captured.risk).toBe("protected");
    expect(captured.status).toBe("pending");
    expect(deps.auditRef.toolAttempt).toHaveBeenCalledWith(
      expect.objectContaining({
        toolName: "propose_create_ilo",
        status: "succeeded",
        risk: "protected",
        approvalState: "pending",
      })
    );
  });

  it("BLOCKS outcome-governance proposals from non-admin callers", async () => {
    const deps = dependencies(
      scriptedProvider([
        response([
          {
            id: "g1",
            name: "propose_create_ilo",
            arguments: {
              title: "Lifelong learning",
              reason: "teacher must not propose ILO governance",
              evidence: [],
            },
          },
        ]),
      ]),
      "teacher"
    );
    await expect(runAgentOrchestrator(deps)).rejects.toMatchObject({
      name: "OutcomeGovernanceBoundaryError",
      kind: "unauthorized_role",
    });
    expect(deps.proposalStoreRef.create).not.toHaveBeenCalled();
  });

  it("executes an APPROVED create_ilo proposal through the protected-write boundary", async () => {
    const receipt = {
      executionId: ILO_EXEC_ID,
      targetId: ILO_TARGET_ID,
      alreadyExecuted: false,
    };
    const executeApprovedPersonalAction = vi.fn(async () => receipt);
    const outcome = await executeApprovedProposal(
      approvedIloProposal(),
      {
        userId: ADMIN_ID,
        role: "admin",
        institutionId: INSTITUTION_ID,
      },
      { featureEnabled: true, protectedWritesEnabled: true },
      { authorizeCurrentScope: async () => true },
      { executeApprovedPersonalAction }
    );
    expect(outcome).toMatchObject({
      executionId: ILO_EXEC_ID,
      targetId: ILO_TARGET_ID,
      alreadyExecuted: false,
    });
    expect(executeApprovedPersonalAction).toHaveBeenCalledTimes(1);
  });

  it("REFUSES to execute a proposal that is still pending", async () => {
    await expect(
      executeApprovedProposal(
        approvedIloProposal({ status: "pending" }),
        {
          userId: ADMIN_ID,
          role: "admin",
          institutionId: INSTITUTION_ID,
        },
        { featureEnabled: true, protectedWritesEnabled: true },
        { authorizeCurrentScope: async () => true },
        { executeApprovedPersonalAction: vi.fn() }
      )
    ).rejects.toMatchObject({ kind: "not_approved" });
  });

  it("REFUSES execution when the caller is not the exact approved executor", async () => {
    await expect(
      executeApprovedProposal(
        approvedIloProposal(),
        {
          userId: TEACHER_ID,
          role: "admin",
          institutionId: INSTITUTION_ID,
        },
        { featureEnabled: true, protectedWritesEnabled: true },
        { authorizeCurrentScope: async () => true },
        { executeApprovedPersonalAction: vi.fn() }
      )
    ).rejects.toMatchObject({ kind: "unauthorized_approver" });
  });
});
