// Feature: OutcomeAlignmentSummary (frontend-plan.md; Wave D4).
// Renders the weakest CLOs (ascending) with an explicit DERIVED ALIGNMENT label
// and an honest empty state. Never presents derived data as official ILO mastery.

import "@/lib/i18n";

import { cleanup, render, screen } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";

const { mockUseCLOProgress } = vi.hoisted(() => ({
  mockUseCLOProgress: vi.fn(),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "student-1", role: "student" } }),
}));

vi.mock("@/hooks/useCLOProgress", () => ({
  useCLOProgress: () => mockUseCLOProgress(),
}));

import OutcomeAlignmentSummary from "@/ai/components/OutcomeAlignmentSummary";

const row = {
  pathPattern: "/student",
  roles: ["student"],
  surfaces: ["alignment-summary"],
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
      <OutcomeAlignmentSummary row={row} />
    </Wrapper>
  );
};

afterEach(() => {
  cleanup();
  mockUseCLOProgress.mockReset();
});

const entry = (clo_id: string, title: string, percent: number) => ({
  clo_id,
  clo_title: title,
  blooms_level: "apply" as const,
  attainment_percent: percent,
  attainment_level: "acquiring" as const,
  sample_count: 3,
  course_id: "c-1",
  course_name: "Algorithms",
});

describe("OutcomeAlignmentSummary", () => {
  it("renders the weakest CLOs first (ascending attainment)", () => {
    mockUseCLOProgress.mockReturnValue({
      isPending: false,
      data: [
        {
          course_id: "c-1",
          course_name: "Algorithms",
          entries: [
            entry("a", "Recursion", 45),
            entry("b", "Sorting", 72),
            entry("c", "Graphs", 20),
          ],
        },
      ],
    });
    renderSummary();

    const titles = screen.getAllByText(/Recursion|Sorting|Graphs/);
    const order = titles.map((n) => n.textContent);
    expect(order).toEqual(["Graphs", "Recursion", "Sorting"]);
    expect(screen.getByText(/DERIVED ALIGNMENT/i)).toBeInTheDocument();
  });

  it("shows an honest empty state when no attainment exists", () => {
    mockUseCLOProgress.mockReturnValue({ isPending: false, data: [] });
    renderSummary();
    expect(screen.getByText(/no outcome-level data yet/i)).toBeInTheDocument();
  });

  it("renders loading shimmer while pending", () => {
    mockUseCLOProgress.mockReturnValue({ isPending: true });
    renderSummary();
    expect(
      screen.queryByText(/no outcome-level data yet/i)
    ).not.toBeInTheDocument();
  });
});
