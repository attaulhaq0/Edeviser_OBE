// Feature: Agent approval inbox (tasks.md 3.1/3.4/3.6 — Wave D).
// AgentTaskInbox contract: lists pending agent_action_proposals for the
// authenticated viewer via the orchestrator-backed inbox hook and renders
// decision affordances ONLY where the display gate passes. Authorization is
// never client-owned: the data hook is mocked here, and the server
// re-validates every decision (assertMayDecideProposal + scope revalidation).
// i18n is key-passthrough so assertions stay independent of locale content.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import type { AgentProposalView, ProposalViewer } from "@/lib/agentProposals";

const mocks = vi.hoisted(() => ({
  useProposalInbox: vi.fn(),
  useProposalDecision: vi.fn(),
}));

vi.mock("@/ai/hooks/useProposalInbox", () => ({
  useProposalInbox: mocks.useProposalInbox,
}));
vi.mock("@/ai/hooks/useProposalDecision", () => ({
  useProposalDecision: mocks.useProposalDecision,
}));
vi.mock("@/lib/supabase", () => ({
  supabase: { functions: { invoke: vi.fn() } },
}));
vi.mock("sonner", () => {
  const toast = Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() });
  return { toast, Toaster: () => null };
});
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "en", dir: () => "ltr" },
  }),
  Trans: ({ children }: { children?: ReactNode }) => children,
}));

import AgentTaskInbox from "@/ai/components/AgentTaskInbox";

const teacherViewer: ProposalViewer = {
  role: "teacher",
  userId: "3f2b8a4e-1c5d-4a9b-8e2f-6d7c0a1b9e55",
};

const pendingForTeacher: AgentProposalView = {
  id: "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  actionType: "propose_create_ilo",
  reason: "Coverage gap detected in PLO 3 mapping",
  evidenceCount: 2,
  requiredApproverRole: "teacher",
  status: "pending",
  createdAt: "2026-08-28T08:00:00.000Z",
  expiresAt: "2026-09-28T08:00:00.000Z",
};

const pendingForAdmin: AgentProposalView = {
  ...pendingForTeacher,
  id: "9a1b2c3d-4e5f-4a6b-8c7d-0e1f2a3b4c5d",
  actionType: "propose_reorder_ilos",
  requiredApproverRole: "admin",
};

const renderInbox = (
  proposals: AgentProposalView[],
  viewer: ProposalViewer
) => {
  mocks.useProposalInbox.mockReturnValue({
    proposals,
    data: proposals,
    isLoading: false,
    isPending: false,
    error: null,
    refetch: vi.fn(),
  });
  mocks.useProposalDecision.mockReturnValue({
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
    isPending: false,
    error: null,
    isError: false,
  });
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AgentTaskInbox viewer={viewer} />
    </QueryClientProvider>
  );
};

describe("AgentTaskInbox (tasks.md 3.4 approval inbox, 3.6 suite)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders an empty inbox with no decision affordances", () => {
    const { container } = renderInbox([], teacherViewer);
    expect(container).toBeTruthy();
    expect(screen.queryByText("approvalCard.buttons.approve")).toBeNull();
    expect(screen.queryByText("approvalCard.buttons.reject")).toBeNull();
    // The data channel receives ONLY the scope — the viewer is never sent from
    // the client; the orchestrator derives identity from the authenticated JWT
    // (server-authoritative, fail-closed). `viewer` is display-gating only.
    expect(mocks.useProposalInbox).toHaveBeenCalledWith("pending");
  });

  it("renders a pending proposal with decision affordances for the designated approver", () => {
    renderInbox([pendingForTeacher], teacherViewer);
    expect(
      screen.getByText("approvalCard.actions.propose_create_ilo")
    ).toBeInTheDocument();
    expect(
      screen.getByText("approvalCard.buttons.approve")
    ).toBeInTheDocument();
    expect(screen.getByText("approvalCard.buttons.reject")).toBeInTheDocument();
  });

  it("hides decision affordances when the viewer is not the designated approver", () => {
    renderInbox([pendingForAdmin], teacherViewer);
    expect(screen.queryByText("approvalCard.buttons.approve")).toBeNull();
    expect(screen.queryByText("approvalCard.buttons.reject")).toBeNull();
  });
});
