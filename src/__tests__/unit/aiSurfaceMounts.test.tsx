// Feature: AI surface mounts (Wave D completion) — InsightCardsSurface,
// AgentChatSurface, ParentTwinSummary fail-closed host contracts.
// Hooks are mocked; the surfaces are transport/presentation only and must
// never fabricate data (render empty/unavailable states verbatim).
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { ReactNode } from "react";

const mocks = vi.hoisted(() => ({
  useProactiveSuggestions: vi.fn(),
  useAgentRun: vi.fn(),
  useParentChildrenLearningStates: vi.fn(),
}));

vi.mock("@/ai/hooks/useProactiveSuggestions", () => ({
  useProactiveSuggestions: mocks.useProactiveSuggestions,
}));
vi.mock("@/ai/hooks/useAgentRun", () => ({
  useAgentRun: mocks.useAgentRun,
}));
vi.mock("@/ai/hooks/useParentChildrenLearningStates", () => ({
  useParentChildrenLearningStates: mocks.useParentChildrenLearningStates,
}));
vi.mock("react-i18next", () => ({
  initReactI18next: { type: "3rdParty", init: vi.fn() },
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "en", dir: () => "ltr" },
  }),
  Trans: ({ children }: { children?: ReactNode }) => children,
}));

import AgentChatSurface from "@/ai/components/AgentChatSurface";
import InsightCardsSurface from "@/ai/components/InsightCardsSurface";
import ParentTwinSummary from "@/ai/components/ParentTwinSummary";

const row = {
  pathPattern: "/test",
  roles: ["teacher"] as const,
  surfaces: ["insight-cards"] as const,
  tools: [],
  approvalCeiling: "teacher" as const,
  evidenceSources: [],
};

const renderInRouter = (ui: ReactNode) =>
  render(<MemoryRouter initialEntries={["/test"]}>{ui}</MemoryRouter>);

describe("InsightCardsSurface (proactive insight-cards / suggestions host)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders each actor-scoped suggestion with its specialist badge", () => {
    mocks.useProactiveSuggestions.mockReturnValue({
      data: [
        {
          id: "s-1",
          recipientRole: "teacher",
          specialist: "intervention",
          evidencePacket: {},
          recommendation: "Schedule a catch-up session for CLO-2.",
          pendingProposals: [
            {
              id: "p-1",
              actionType: "create_goal",
              status: "pending",
              requiredApproverRole: "student",
            },
          ],
          completedAt: "2026-09-01T00:00:00Z",
        },
      ],
      isLoading: false,
      isError: false,
    });
    const { getByText } = render(<InsightCardsSurface row={row} />);
    expect(getByText("intervention")).toBeTruthy();
    expect(getByText(/catch-up session/)).toBeTruthy();
    expect(getByText("insightCards.pendingProposals")).toBeTruthy();
  });

  it("renders the explicit empty state when there are no suggestions", () => {
    mocks.useProactiveSuggestions.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    });
    const { getByText } = render(<InsightCardsSurface row={row} />);
    expect(getByText("insightCards.empty")).toBeTruthy();
  });

  it("renders the unavailable notice on query error (never fabricated data)", () => {
    mocks.useProactiveSuggestions.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    });
    const { getByText } = render(<InsightCardsSurface row={row} />);
    expect(getByText("insightCards.unavailable")).toBeTruthy();
  });
});

describe("AgentChatSurface (orchestrator conversation host)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useAgentRun.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      isError: false,
      error: null,
    });
  });

  it("renders the transcript, composer input and send affordance", () => {
    const { container } = renderInRouter(<AgentChatSurface row={row} />);
    expect(container.querySelector("textarea, input")).toBeTruthy();
    expect(container.querySelector("button")).toBeTruthy();
  });

  it("renders the feature-disabled notice from the backend error code", () => {
    mocks.useAgentRun.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      isError: true,
      error: { code: "ai_feature_disabled" },
    });
    const { getByText } = renderInRouter(<AgentChatSurface row={row} />);
    expect(getByText("chatSurface.featureDisabled")).toBeTruthy();
  });

  it("renders the generic error notice for other failures", () => {
    mocks.useAgentRun.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      isError: true,
      error: { code: "invoke_failed" },
    });
    const { getByText } = renderInRouter(<AgentChatSurface row={row} />);
    expect(getByText("chatSurface.error")).toBeTruthy();
  });
});

const parentRow = {
  pathPattern: "/parent",
  roles: ["parent"] as const,
  surfaces: ["twin-summary"] as const,
  tools: [],
  approvalCeiling: "none" as const,
  evidenceSources: [],
};

describe("ParentTwinSummary (verified linked-children twin host)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders one snapshot per verified linked child", () => {
    mocks.useParentChildrenLearningStates.mockReturnValue({
      data: [
        {
          studentId: "44444444-4444-4444-8444-444444444444",
          state: {
            student_id: "44444444-4444-4444-8444-444444444444",
            mastery: { percent: 78 },
            habits: { streak: 3 },
            risk_signals: { severity: "none" },
          },
        },
        {
          studentId: "55555555-5555-4555-8555-555555555555",
          state: null,
        },
      ],
      isLoading: false,
      isError: false,
    });
    const { getByText, getAllByText } = render(
      <MemoryRouter initialEntries={["/parent"]}>
        <ParentTwinSummary row={parentRow} />
      </MemoryRouter>
    );
    expect(getByText("learningState.title")).toBeTruthy();
    expect(getAllByText("parentTwin.childEmpty").length).toBe(1);
  });

  it("renders the empty state when no verified links exist", () => {
    mocks.useParentChildrenLearningStates.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    });
    const { getByText } = render(<ParentTwinSummary row={parentRow} />);
    expect(getByText("parentTwin.empty")).toBeTruthy();
  });

  it("renders the unavailable notice on query error", () => {
    mocks.useParentChildrenLearningStates.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    });
    const { getByText } = render(<ParentTwinSummary row={parentRow} />);
    expect(getByText("parentTwin.unavailable")).toBeTruthy();
  });
});
