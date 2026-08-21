import { describe, expect, it, vi } from "vitest";

import type {
  AgentActionProposal,
  AgentIdentity,
} from "../../../supabase/functions/_shared/ai/contracts";
import { executeApprovedProposal } from "../../../supabase/functions/_shared/ai/write-tools/execution";

const ids = {
  proposal: "11111111-1111-4111-8111-111111111111",
  run: "22222222-2222-4222-8222-222222222222",
  student: "33333333-3333-4333-8333-333333333333",
  institution: "44444444-4444-4444-8444-444444444444",
  course: "55555555-5555-4555-8555-555555555555",
  execution: "66666666-6666-4666-8666-666666666666",
  target: "77777777-7777-4777-8777-777777777777",
};

const approver: AgentIdentity = {
  userId: ids.student,
  role: "student",
  institutionId: ids.institution,
};

const proposal = (
  overrides: Partial<AgentActionProposal> = {}
): AgentActionProposal => ({
  id: ids.proposal,
  runId: ids.run,
  actorUserId: ids.student,
  institutionId: ids.institution,
  studentId: ids.student,
  actionType: "create_goal",
  toolVersion: "1.0.0",
  payload: { title: "Review CLO 1", targetValue: 3 },
  reason: "Student should review the deterministic recommendation.",
  evidence: [{ kind: "outcome", id: ids.course }],
  evidenceHash: "a".repeat(64),
  risk: "protected",
  requiredApproverRole: "student",
  requiredApproverUserId: ids.student,
  status: "approved",
  idempotencyKey: "b".repeat(64),
  createdAt: "2026-08-14T00:00:00.000Z",
  // Far-future default so non-expiry cases never time-bomb; the dedicated
  // expiry case below overrides this with its own past date + fixed clock.
  expiresAt: "2099-01-01T00:00:00.000Z",
  ...overrides,
});

const receipt = {
  executionId: ids.execution,
  targetId: ids.target,
  learningStateVersion: 2,
  alreadyExecuted: false,
};

const policy = { featureEnabled: true, protectedWritesEnabled: true };

describe("typed protected write execution", () => {
  it("rechecks scope and returns a validated exactly-once receipt", async () => {
    const authorizeCurrentScope = vi.fn().mockResolvedValue(true);
    const executeApprovedPersonalAction = vi.fn().mockResolvedValue(receipt);
    await expect(
      executeApprovedProposal(
        proposal(),
        approver,
        policy,
        { authorizeCurrentScope },
        { executeApprovedPersonalAction },
        new Date("2026-08-15T00:00:00.000Z")
      )
    ).resolves.toEqual(receipt);
    expect(authorizeCurrentScope).toHaveBeenCalledTimes(1);
    expect(executeApprovedPersonalAction).toHaveBeenCalledWith(ids.proposal);
  });

  it("fails closed for flags, approval state, expiry, identity, and changed scope", async () => {
    const authorized = {
      authorizeCurrentScope: vi.fn().mockResolvedValue(true),
    };
    const executor = { executeApprovedPersonalAction: vi.fn() };
    await expect(
      executeApprovedProposal(
        proposal(),
        approver,
        { ...policy, protectedWritesEnabled: false },
        authorized,
        executor
      )
    ).rejects.toMatchObject({ kind: "feature_disabled" });
    await expect(
      executeApprovedProposal(
        proposal({ status: "pending" }),
        approver,
        policy,
        authorized,
        executor
      )
    ).rejects.toMatchObject({ kind: "not_approved" });
    await expect(
      executeApprovedProposal(
        proposal({ expiresAt: "2026-08-14T00:00:00.000Z" }),
        approver,
        policy,
        authorized,
        executor,
        new Date("2026-08-15T00:00:00.000Z")
      )
    ).rejects.toMatchObject({ kind: "expired" });
    await expect(
      executeApprovedProposal(
        proposal(),
        { ...approver, userId: ids.course },
        policy,
        authorized,
        executor
      )
    ).rejects.toMatchObject({ kind: "unauthorized_approver" });
    await expect(
      executeApprovedProposal(
        proposal(),
        { ...approver, role: "teacher" },
        policy,
        authorized,
        executor
      )
    ).rejects.toMatchObject({ kind: "unauthorized_approver" });
    await expect(
      executeApprovedProposal(
        proposal(),
        approver,
        policy,
        { authorizeCurrentScope: vi.fn().mockResolvedValue(false) },
        executor
      )
    ).rejects.toMatchObject({ kind: "unauthorized_scope" });
    expect(executor.executeApprovedPersonalAction).not.toHaveBeenCalled();
  });

  it("rejects unknown actions, malformed evidence, invalid args, and invalid output", async () => {
    const authorized = {
      authorizeCurrentScope: vi.fn().mockResolvedValue(true),
    };
    await expect(
      executeApprovedProposal(
        proposal({ actionType: "change_grade" }),
        approver,
        policy,
        authorized,
        { executeApprovedPersonalAction: vi.fn() }
      )
    ).rejects.toMatchObject({ kind: "unknown_tool" });
    await expect(
      executeApprovedProposal(
        proposal({ toolVersion: undefined }),
        approver,
        policy,
        authorized,
        { executeApprovedPersonalAction: vi.fn() }
      )
    ).rejects.toMatchObject({ kind: "unknown_tool" });
    await expect(
      executeApprovedProposal(
        proposal({ toolVersion: "2.0.0" }),
        approver,
        policy,
        authorized,
        { executeApprovedPersonalAction: vi.fn() }
      )
    ).rejects.toMatchObject({ kind: "unknown_tool" });
    await expect(
      executeApprovedProposal(
        proposal({ evidenceHash: "invalid" }),
        approver,
        policy,
        authorized,
        { executeApprovedPersonalAction: vi.fn() }
      )
    ).rejects.toMatchObject({ kind: "invalid_evidence" });
    await expect(
      executeApprovedProposal(
        proposal({ payload: { title: "Goal", rawSql: "delete" } }),
        approver,
        policy,
        authorized,
        { executeApprovedPersonalAction: vi.fn() }
      )
    ).rejects.toMatchObject({ kind: "invalid_input" });
    await expect(
      executeApprovedProposal(proposal(), approver, policy, authorized, {
        executeApprovedPersonalAction: vi.fn().mockResolvedValue({}),
      })
    ).rejects.toMatchObject({ kind: "invalid_output" });
  });

  it("rejects impossible calendar dates instead of normalizing them", async () => {
    const authorized = {
      authorizeCurrentScope: vi.fn().mockResolvedValue(true),
    };
    const executor = { executeApprovedPersonalAction: vi.fn() };
    await expect(
      executeApprovedProposal(
        proposal({ payload: { title: "Goal", weekStart: "2026-02-30" } }),
        approver,
        policy,
        authorized,
        executor
      )
    ).rejects.toMatchObject({ kind: "invalid_input" });
    await expect(
      executeApprovedProposal(
        proposal({
          actionType: "create_planner_session",
          courseId: ids.course,
          payload: {
            title: "Review",
            courseId: ids.course,
            plannedDate: "2026-04-31",
            durationMinutes: 45,
          },
        }),
        approver,
        policy,
        authorized,
        executor
      )
    ).rejects.toMatchObject({ kind: "invalid_input" });
    expect(executor.executeApprovedPersonalAction).not.toHaveBeenCalled();
  });

  it("accepts a typed planner session and preserves an idempotent retry receipt", async () => {
    const retryReceipt = { ...receipt, alreadyExecuted: true };
    const executeApprovedPersonalAction = vi
      .fn()
      .mockResolvedValue(retryReceipt);
    await expect(
      executeApprovedProposal(
        proposal({
          status: "executed",
          actionType: "create_planner_session",
          courseId: ids.course,
          payload: {
            title: "CLO review",
            courseId: ids.course,
            plannedDate: "2026-08-18",
            startTime: "09:30",
            durationMinutes: 45,
            sessionType: "review",
          },
        }),
        approver,
        policy,
        { authorizeCurrentScope: vi.fn().mockResolvedValue(true) },
        { executeApprovedPersonalAction },
        new Date("2026-08-15T00:00:00.000Z")
      )
    ).resolves.toEqual(retryReceipt);
  });
});
