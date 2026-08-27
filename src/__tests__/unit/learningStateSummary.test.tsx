// Feature: LearningStateSummary (frontend-plan.md; Wave D4).
// Renders the digital-twin summary fail-closed: loading shimmer, error notice,
// empty (no snapshot yet) state, and a data state with mastery/risk/streak.

import "@/lib/i18n";

import { cleanup, render, screen } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";

const { mockUseLearningState } = vi.hoisted(() => ({
  mockUseLearningState: vi.fn(),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "student-1", role: "student" } }),
}));

vi.mock("@/ai/hooks/useLearningState", () => ({
  useLearningState: () => mockUseLearningState(),
}));

import LearningStateSummary from "@/ai/components/LearningStateSummary";

const row = {
  pathPattern: "/student",
  roles: ["student"],
  surfaces: ["twin-summary"],
  tools: [],
  approvalCeiling: "none",
  evidenceSources: [],
} as const;

const wrapper = () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
};

const renderSummary = () => {
  const Wrapper = wrapper();
  return render(
    <Wrapper>
      <LearningStateSummary row={row} />
    </Wrapper>
  );
};

afterEach(() => {
  cleanup();
  mockUseLearningState.mockReset();
});

describe("LearningStateSummary", () => {
  it("shows loading shimmer while pending (not yet empty/data states)", () => {
    mockUseLearningState.mockReturnValue({ isPending: true });
    renderSummary();
    // Shimmer renders before data resolves; empty/data text must NOT appear.
    expect(
      screen.queryByText(/still being calculated/i)
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Mastery")).not.toBeInTheDocument();
  });

  it("renders an honest empty state when no snapshot exists", () => {
    mockUseLearningState.mockReturnValue({
      isPending: false,
      isError: false,
      data: null,
    });
    renderSummary();
    expect(screen.getByText(/still being calculated/i)).toBeInTheDocument();
  });

  it("surfaces an error notice without crashing", () => {
    mockUseLearningState.mockReturnValue({
      isPending: false,
      isError: true,
      data: undefined,
    });
    renderSummary();
    expect(screen.getByText(/temporarily unavailable/i)).toBeInTheDocument();
  });

  it("renders mastery, trend, streak, consistency, and risk when present", () => {
    mockUseLearningState.mockReturnValue({
      isPending: false,
      isError: false,
      data: {
        student_id: "student-1",
        calculated_at: "2026-08-27T00:00:00Z",
        mastery: { percent: 72, trend: "improving" },
        habits: { streak: 6, consistency: 80 },
        risk_signals: {
          severity: "attention",
          notice: "Low attendance this week.",
        },
      },
    });
    renderSummary();
    expect(screen.getByText("Mastery 72%")).toBeInTheDocument();
    expect(screen.getByText("Improving")).toBeInTheDocument();
    expect(screen.getByText("6-day streak")).toBeInTheDocument();
    expect(screen.getByText("Consistency 80%")).toBeInTheDocument();
    expect(screen.getByText("Low attendance this week.")).toBeInTheDocument();
  });

  it("renders no risk banner when severity is none or absent", () => {
    mockUseLearningState.mockReturnValue({
      isPending: false,
      isError: false,
      data: { student_id: "student-1", mastery: { percent: 70 } },
    });
    renderSummary();
    expect(screen.queryByText(/Low attendance|Needs attention/)).toBeNull();
  });
});
