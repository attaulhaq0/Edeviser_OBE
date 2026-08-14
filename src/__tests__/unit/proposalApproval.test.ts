import { describe, expect, it, vi } from "vitest";

import type { AgentExecutionContext } from "../../../supabase/functions/_shared/ai/contracts";
import {
  assertMayDecideProposal,
  createHumanApprovalProposal,
} from "../../../supabase/functions/_shared/ai/proposals";

const ids = {
  request: "11111111-1111-4111-8111-111111111111",
  run: "22222222-2222-4222-8222-222222222222",
  session: "33333333-3333-4333-8333-333333333333",
  teacher: "44444444-4444-4444-8444-444444444444",
  institution: "55555555-5555-4555-8555-555555555555",
  student: "66666666-6666-4666-8666-666666666666",
};
const context: AgentExecutionContext = {
  requestId: ids.request,
  runId: ids.run,
  sessionId: ids.session,
  specialist: "teacher",
  identity: {
    userId: ids.teacher,
    role: "teacher",
    institutionId: ids.institution,
  },
  page: { route: "/teacher", studentId: ids.student },
};

describe("human-in-the-loop proposals", () => {
  it("stores a protected proposal instead of executing the action", async () => {
    const create = vi.fn(async (proposal) => ({
      ...proposal,
      id: ids.request,
    }));
    const proposal = await createHumanApprovalProposal(
      {
        actionType: "notify_parent",
        payload: { summary: "Draft only" },
        reason: "Teacher should review the evidence before contact.",
        evidence: [{ kind: "signal", id: "risk-1" }],
        studentId: ids.student,
      },
      context,
      { create }
    );
    expect(proposal).toMatchObject({
      status: "pending",
      risk: "protected",
      requiredApproverRole: "teacher",
    });
    expect(proposal.idempotencyKey).toHaveLength(64);
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("rejects cross-institution, wrong-role, expired, and already-used approvals", () => {
    const proposal = {
      id: ids.request,
      runId: ids.run,
      actorUserId: ids.teacher,
      institutionId: ids.institution,
      actionType: "notify_parent",
      payload: {},
      reason: "review",
      evidence: [],
      risk: "protected" as const,
      requiredApproverRole: "teacher" as const,
      status: "pending" as const,
      idempotencyKey: "a".repeat(64),
      createdAt: "2026-08-14T00:00:00.000Z",
      expiresAt: "2026-08-20T00:00:00.000Z",
    };
    expect(() =>
      assertMayDecideProposal(
        proposal,
        { userId: ids.teacher, role: "teacher", institutionId: ids.student },
        new Date("2026-08-15T00:00:00.000Z")
      )
    ).toThrow(/required proposal approver/);
    expect(() =>
      assertMayDecideProposal(
        proposal,
        { userId: ids.teacher, role: "admin", institutionId: ids.institution },
        new Date("2026-08-15T00:00:00.000Z")
      )
    ).toThrow(/required proposal approver/);
    expect(() =>
      assertMayDecideProposal(
        proposal,
        {
          userId: ids.teacher,
          role: "teacher",
          institutionId: ids.institution,
        },
        new Date("2026-08-21T00:00:00.000Z")
      )
    ).toThrow(/expired/);
    expect(() =>
      assertMayDecideProposal(
        { ...proposal, status: "approved" },
        { userId: ids.teacher, role: "teacher", institutionId: ids.institution }
      )
    ).toThrow(/no longer pending/);
  });
});
