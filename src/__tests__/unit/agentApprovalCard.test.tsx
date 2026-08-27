// Feature: Agent approval flows (tasks.md 3.4/3.6 — Wave D3).
// Lib invariants + AgentApprovalCard decision UX against a mocked
// agent-orchestrator edge call. Real en bundles resolve translations.

import "@/lib/i18n";

import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup } from "@testing-library/react";

const { mockInvoke } = vi.hoisted(() => ({ mockInvoke: vi.fn() }));

vi.mock("@/lib/supabase", () => ({
  supabase: { functions: { invoke: mockInvoke } },
}));

import AgentApprovalCard from "@/ai/components/AgentApprovalCard";
import type { AgentApprovalCardProps } from "@/ai/components/AgentApprovalCard";
import {
  AgentDecisionError,
  canViewerDecideProposal,
  isViewerAllowedToDecide,
  isOpenProposal,
  parseAgentProposalView,
  toProposalDecisionError,
} from "@/lib/agentProposals";
import type { AgentProposalView } from "@/lib/agentProposals";

// ─── Fixtures ────────────────────────────────────────────────────────────────

const baseProposal = (): AgentProposalView => ({
  id: "b6c4a8f6-1111-4222-8333-444455556666",
  actionType: "propose_clo_plo_mapping",
  reason: "CLO 3 evidence supports mapping to PLO 2.",
  evidenceCount: 4,
  requiredApproverRole: "coordinator",
  status: "pending",
  createdAt: new Date(Date.now() - 86_400_000).toISOString(),
  expiresAt: new Date(Date.now() + 2 * 86_400_000).toISOString(),
});

const coordinator = { role: "coordinator" as const, userId: "u-coord-1" };

const makeWrapper = () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
};

afterEach(() => {
  cleanup();
  mockInvoke.mockReset();
});

// ─── Lib ─────────────────────────────────────────────────────────────────────

describe("agentProposals lib", () => {
  it("parses valid views and rejects malformed boundary data", () => {
    expect(parseAgentProposalView(baseProposal())).not.toBeNull();
    expect(
      parseAgentProposalView({ ...baseProposal(), status: "scheduled" }),
    ).toBeNull();
    expect(parseAgentProposalView({ ...baseProposal(), id: "nope" })).toBeNull();
    expect(
      parseAgentProposalView({ ...baseProposal(), evidenceCount: -1 }),
    ).toBeNull();
  });

  it("gates display decisions on expiry, status, role AND approver-user match", () => {
    const p = baseProposal();
    expect(isOpenProposal(p)).toBe(true);
    expect(
      canViewerDecideProposal(p, coordinator),
      "role matches ⇒ decidable",
    ).toBe(true);

    expect(
      isViewerAllowedToDecide(p, { role: "teacher", userId: "u-coord-1" }),
      "role mismatch",
    ).toBe(false);

    const pinned = {
      ...p,
      requiredApproverUserId: "0e8a9d51-2222-4333-8444-555566667777",
    };
    expect(isViewerAllowedToDecide(pinned, coordinator), "user mismatch").toBe(
      false,
    );

    const expiredPinned = {
      ...pinned,
      expiresAt: new Date(Date.now() - 1000).toISOString(),
    };
    expect(canViewerDecideProposal(expiredPinned, coordinator)).toBe(false);

    expect(
      isOpenProposal({
        ...p,
        expiresAt: new Date(Date.now() - 1000).toISOString(),
      }),
      "expired open",
    ).toBe(false);
    expect(isOpenProposal({ ...p, status: "rejected" }), "rejected").toBe(false);
  });

  it("wraps unknown failures onto the bounded error code set", () => {
    expect(toProposalDecisionError(new AgentDecisionError("expired")).code).toBe(
      "expired",
    );
    expect(toProposalDecisionError({ code: "proposal_not_found" }).code).toBe(
      "proposal_not_found",
    );
    expect(
      toProposalDecisionError({ code: "garbage_not_a_code" }).code,
      "unrecognized codes collapse onto unknown_error",
    ).toBe("unknown_error");
    expect(toProposalDecisionError(new Error("boom")).code).toBe(
      "unknown_error",
    );
  });
});

// ─── Component ───────────────────────────────────────────────────────────────

const renderCard = (
  overrides?: Partial<AgentApprovalCardProps>,
  proposal = baseProposal(),
) => {
  const Wrapper = makeWrapper();
  return render(
    <Wrapper>
      <AgentApprovalCard
        proposal={proposal}
        viewer={coordinator}
        {...overrides}
      />
    </Wrapper>,
  );
};

describe("AgentApprovalCard", () => {
  it("shows decision controls for an authorized pending viewer", () => {
    renderCard();
    expect(screen.getByText("Map course outcome to program outcomes")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /approve/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /reject/i })).toBeInTheDocument();
  });

  it("sends approve_proposal to agent-orchestrator and renders the approved outcome", async () => {
    mockInvoke.mockResolvedValue({
      data: {
        proposal: { id: baseProposal().id, status: "approved", decided_at: null },
        protectedActionExecuted: false,
      },
      error: null,
    });

    let decidedCallbacks = 0;
    renderCard({ onDecided: () => (decidedCallbacks += 1) });
    fireEvent.click(screen.getByRole("button", { name: /approve/i }));

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith("agent-orchestrator", {
        body: { action: "approve_proposal", proposalId: baseProposal().id },
      });
    });
    await screen.findByText(/Approved/);
    expect(decidedCallbacks).toBe(1);
  });

  it("sends reject_proposal when rejecting", async () => {
    mockInvoke.mockResolvedValue({
      data: {
        proposal: { id: baseProposal().id, status: "rejected", decided_at: null },
        protectedActionExecuted: false,
      },
      error: null,
    });

    renderCard();
    fireEvent.click(screen.getByRole("button", { name: /reject/i }));

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith("agent-orchestrator", {
        body: { action: "reject_proposal", proposalId: baseProposal().id },
      });
    });
  });

  it("surfaces bounded server error codes from HTTP failures", async () => {
    mockInvoke.mockRejectedValue({
      name: "FunctionsHttpError",
      context: { json: async () => ({ error: { code: "expired" } }) },
    });

    renderCard();
    fireEvent.click(screen.getByRole("button", { name: /approve/i }));

    await screen.findByRole("alert");
    expect(
      screen.getByText(/decision window for this proposal has closed/),
    ).toBeInTheDocument();
  });

  it("hides controls for a viewer failing approver requirements (fail-closed)", () => {
    const pinned = {
      ...baseProposal(),
      requiredApproverUserId: "0e8a9d51-2222-4333-8444-555566667777",
    };
    renderCard({}, pinned);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders decided proposals as read-only outcomes with no controls", () => {
    renderCard({}, { ...baseProposal(), status: "rejected" });
    expect(screen.getByRole("status")).toHaveTextContent(/Rejected by the approver/);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders stale-but-pending proposals as expired with no controls", () => {
    renderCard(
      {},
      {
        ...baseProposal(),
        expiresAt: new Date(Date.now() - 1000).toISOString(),
      },
    );
    expect(screen.getByRole("status")).toHaveTextContent(/has expired/);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("falls back to the raw identifier for unknown action types", () => {
    renderCard({}, { ...baseProposal(), actionType: "exotic_future_action" });
    expect(screen.getByText("exotic_future_action")).toBeInTheDocument();
  });
});

