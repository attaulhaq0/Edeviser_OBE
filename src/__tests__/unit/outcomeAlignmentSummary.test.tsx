// Feature: OutcomeAlignmentSummary (frontend-plan.md; Wave D4).
// Renders the weakest CLOs (ascending) with an explicit DERIVED ALIGNMENT label
// and an honest empty state. Never presents derived data as official ILO mastery.

import "@/lib/i18n";

import { cleanup, render, screen } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockUseCLOProgress, mockUseOutcomeParents } = vi.hoisted(() => ({
  mockUseCLOProgress: vi.fn(),
  mockUseOutcomeParents: vi.fn(),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "student-1", role: "student" } }),
}));

vi.mock("@/hooks/useCLOProgress", () => ({
  useCLOProgress: () => mockUseCLOProgress(),
}));

vi.mock("@/hooks/useOutcomeParents", () => ({
  useOutcomeParents: () => mockUseOutcomeParents(),
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

beforeEach(() => {
  // Default: parent-chain query resolves to no mappings (scores still render).
  mockUseOutcomeParents.mockReturnValue({
    isPending: false,
    isError: false,
    data: undefined,
  });
});

afterEach(() => {
  cleanup();
  mockUseCLOProgress.mockReset();
  mockUseOutcomeParents.mockReset();
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

  // Regression: a failed query must render the unavailable notice, never the
  // empty state (which would falsely claim the student simply has no data).
  it("renders an unavailable notice instead of the empty state when the query fails", () => {
    mockUseCLOProgress.mockReturnValue({
      isPending: false,
      isError: true,
      data: undefined,
    });
    renderSummary();
    expect(screen.getByRole("note")).toHaveTextContent(
      /temporarily unavailable/i
    );
    expect(
      screen.queryByText(/no outcome-level data yet/i)
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/DERIVED ALIGNMENT/i)).not.toBeInTheDocument();
  });

  // Finding 5: the focus surface must DERIVE and DISPLAY the mapped parent
  // chain (CLO → PLO → ILO) rather than only CLO titles + percentages.
  it("renders the mapped PLO and ILO chain under a rated CLO", () => {
    mockUseCLOProgress.mockReturnValue({
      isPending: false,
      data: [
        {
          course_id: "c-1",
          course_name: "Algorithms",
          entries: [entry("a", "Graphs", 20)],
        },
      ],
    });
    mockUseOutcomeParents.mockReturnValue({
      isPending: false,
      isError: false,
      data: {
        a: {
          plos: [{ id: "plo-1", title: "Computing Fundamentals", type: "PLO" }],
          ilos: [{ id: "ilo-1", title: "Critical Thinker", type: "ILO" }],
        },
      },
    });
    renderSummary();

    expect(screen.getByText("Graphs")).toBeInTheDocument();
    expect(screen.getByText("20%")).toBeInTheDocument();
    expect(screen.getByText(/Computing Fundamentals/i)).toBeInTheDocument();
    expect(screen.getByText(/Critical Thinker/i)).toBeInTheDocument();
  });

  // The chain is supplementary DERIVED alignment: if the mapping lookup itself
  // fails, the (honest) CLO scores stay visible with no chain line — the
  // surface never fabricates a parent relationship.
  it("keeps the CLO scores when the parent-chain query fails (no invented chain)", () => {
    mockUseCLOProgress.mockReturnValue({
      isPending: false,
      data: [
        {
          course_id: "c-1",
          course_name: "Algorithms",
          entries: [entry("a", "Graphs", 20)],
        },
      ],
    });
    mockUseOutcomeParents.mockReturnValue({
      isPending: false,
      isError: true,
      data: undefined,
    });
    renderSummary();

    expect(screen.getByText("Graphs")).toBeInTheDocument();
    expect(screen.getByText("20%")).toBeInTheDocument();
    expect(
      screen.queryByText(/Computing Fundamentals/i)
    ).not.toBeInTheDocument();
  });
});
