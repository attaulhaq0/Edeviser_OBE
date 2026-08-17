import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AIAtRiskWidget from "@/components/shared/AIAtRiskWidget";
import type { AIAtRiskPrediction } from "@/hooks/useAtRiskPredictions";

const mockPredictions: AIAtRiskPrediction[] = [
  {
    id: "pred-1",
    student_id: "student-1",
    student_name: "Alice Johnson",
    suggestion_type: "at_risk_prediction",
    suggestion_text: "CLO needs attention",
    suggestion_data: {
      status: "pending_approval",
      proposal_audit_id: "11111111-1111-4111-8111-111111111111",
      clo_id: "clo-3",
      clo_title: "Apply data structures in problem solving",
      calculation_version: "student-learning-state/v1.0.0",
      trigger_version:
        "needs-attention/low-mastery-compounding-evidence/v1.0.0",
      contributing_evidence: [
        {
          key: "mastery_below_target",
          observedValue: 42,
          threshold: "CLO mastery < 60%",
          source: "outcome_attainment",
        },
        {
          key: "late_or_missed_submissions",
          observedValue: "late",
          threshold: "recent submission pattern is late or missed",
          source: "submissions",
        },
      ],
      recommended_next_action: "Review the cited evidence and recovery draft.",
      intervention_draft:
        "Complete a focused 15-minute review, then answer one diagnostic question.",
      triggered_at: "2026-08-10T02:00:00.000Z",
    },
    validated_outcome: null,
    created_at: "2026-08-10T02:00:00.000Z",
  },
];

vi.mock("@/hooks/useAtRiskPredictions", () => ({
  useAtRiskPredictions: vi.fn(),
}));

import { useAtRiskPredictions } from "@/hooks/useAtRiskPredictions";

const mockUseAtRiskPredictions = vi.mocked(useAtRiskPredictions);

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe("AIAtRiskWidget", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the evidence-first heading while loading", () => {
    mockUseAtRiskPredictions.mockReturnValue({
      data: undefined,
      isLoading: true,
    } as unknown as ReturnType<typeof useAtRiskPredictions>);

    render(<AIAtRiskWidget />, { wrapper: createWrapper() });
    expect(screen.getByText("Needs Attention")).toBeInTheDocument();
  });

  it("explains the deterministic empty state", () => {
    mockUseAtRiskPredictions.mockReturnValue({
      data: [],
      isLoading: false,
    } as unknown as ReturnType<typeof useAtRiskPredictions>);

    render(<AIAtRiskWidget />, { wrapper: createWrapper() });
    expect(
      screen.getByText(
        /No current evidence crosses a documented attention trigger/
      )
    ).toBeInTheDocument();
  });

  it("renders the student, CLO, evidence, and versions without a risk score", () => {
    mockUseAtRiskPredictions.mockReturnValue({
      data: mockPredictions,
      isLoading: false,
    } as unknown as ReturnType<typeof useAtRiskPredictions>);

    render(<AIAtRiskWidget />, { wrapper: createWrapper() });
    expect(screen.getByText("Alice Johnson")).toBeInTheDocument();
    expect(screen.getByText(/Apply data structures/)).toBeInTheDocument();
    expect(screen.getByText("Mastery Below Target: 42")).toBeInTheDocument();
    expect(
      screen.getByText("Calculation: student-learning-state/v1.0.0")
    ).toBeInTheDocument();
    expect(screen.queryByText(/% risk/i)).not.toBeInTheDocument();
  });

  it("keeps legacy prediction records evidence-only", () => {
    mockUseAtRiskPredictions.mockReturnValue({
      data: mockPredictions,
      isLoading: false,
    } as unknown as ReturnType<typeof useAtRiskPredictions>);

    render(<AIAtRiskWidget />, { wrapper: createWrapper() });
    expect(screen.getByText("Evidence only")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
