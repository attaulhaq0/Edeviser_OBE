// @vitest-environment happy-dom
// =============================================================================
// OutcomeChainView — chain assembly rendering + unified empty state
//
// Feature: qa-partner-review-remediation — Req 16 (P12)
// Validates: Requirements 16.1, 16.3, 16.4
//
// OutcomeChainView renders the end-to-end OBE traceability chain
//   ILO → GA → PLO → CLO → Assessment → Rubric → Student → Attainment
// from the assembled object returned by `useOutcomeChain`. Graduate Attributes
// sit as a level BETWEEN the ILO and the PLOs (Req 16.3). When no level has a
// linked record the view shows a SINGLE unified empty state for the whole chain
// rather than per-level zeros (Req 16.4), and attainment at a node is rendered
// with the platform attainment-level color coding (Req 16.5).
//
// The view's data access is fully mocked: `useOutcomeChain` is driven per-test
// to exercise the data / unified-empty / loading branches, `useILOs` feeds the
// header Select, and `nuqs` supplies the selected ILO id so the view is past
// the "Select an institution outcome" guard. `ResizeObserver` (used by the
// Radix Select trigger) is stubbed for happy-dom.
// =============================================================================

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

import type { OutcomeChain } from "@/lib/outcomeChain";
import { getAttainmentColor } from "@/lib/attainmentClassifier";

// ---------------------------------------------------------------------------
// Mocks (must precede the component import)
// ---------------------------------------------------------------------------

// nuqs — supplies the selected ILO id. Driven via a `mock`-prefixed fn so a
// single test can exercise the "no selection" guard by returning "".
const mockStartId = vi.fn<() => string>(() => "ilo-1");
vi.mock("nuqs", () => ({
  parseAsString: { withDefault: (def: string) => def },
  useQueryState: () => [mockStartId(), vi.fn()] as const,
}));

// useILOs — a single ILO so the header Select has an option; the view reads
// `iloPage?.data ?? []`.
vi.mock("@/hooks/useILOs", () => ({
  useILOs: () => ({
    data: { data: [{ id: "ilo-1", title: "ILO 1 — Lifelong Learning" }] },
    isLoading: false,
  }),
}));

// useOutcomeChain is the single dependency that drives all three branches.
type ChainResult = {
  data: OutcomeChain | null | undefined;
  isLoading: boolean;
  isError: boolean;
};
const mockUseOutcomeChain = vi.fn<() => ChainResult>();
vi.mock("@/hooks/useOutcomeChain", () => ({
  useOutcomeChain: () => mockUseOutcomeChain(),
}));

// happy-dom does not implement ResizeObserver, relied on by the Radix Select
// trigger that the view always renders.
class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal("ResizeObserver", MockResizeObserver);

import OutcomeChainView from "@/pages/shared/OutcomeChainView";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

// A fully-connected chain: one ILO, one GA, one PLO with one CLO that carries
// an assessment (+ its rubric), a CLO-attached rubric, and a per-student
// attainment leaf. Attainment values are chosen to span distinct levels so the
// color-coding assertions are meaningful (88 excellent, 72 satisfactory,
// 65 developing, 91 excellent).
const connectedChain: OutcomeChain = {
  start: {
    id: "ilo-1",
    title: "ILO 1 — Lifelong Learning",
    type: "ILO",
    attainmentPercent: 88,
  },
  graduateAttributes: [
    {
      id: "ga-1",
      name: "Critical Thinking GA",
      weight: 50,
      attainmentPercent: 88,
    },
  ],
  plos: [
    {
      id: "plo-1",
      title: "PLO 1 — Analyze Systems",
      attainmentPercent: 72,
      weight: 60,
      clos: [
        {
          id: "clo-1",
          title: "CLO 1 — Apply Core Concepts",
          bloomsLevel: "Applying",
          attainmentPercent: 65,
          weight: 40,
          assessments: [
            {
              id: "asg-1",
              title: "Midterm Project",
              weight: 30,
              rubric: { id: "rub-1", title: "Project Rubric" },
            },
          ],
          rubrics: [{ id: "rub-2", title: "CLO Mastery Rubric" }],
          students: [
            {
              studentId: "stu-1",
              studentName: "Alice Student",
              attainmentPercent: 91,
            },
          ],
        },
      ],
    },
  ],
  isEmpty: false,
};

// A chain where no level has any linked record (Req 16.4 unified empty state).
const emptyChain: OutcomeChain = {
  start: {
    id: "ilo-1",
    title: "ILO 1 — Lifelong Learning",
    type: "ILO",
    attainmentPercent: null,
  },
  graduateAttributes: [],
  plos: [],
  isEmpty: true,
};

const UNIFIED_EMPTY_TITLE = "No connected outcomes yet";
const DOCUMENT_POSITION_FOLLOWING = 4;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("OutcomeChainView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStartId.mockReturnValue("ilo-1");
  });

  it("renders the outcome chain section header", () => {
    mockUseOutcomeChain.mockReturnValue({
      data: connectedChain,
      isLoading: false,
      isError: false,
    });
    render(<OutcomeChainView />);
    expect(screen.getByText("End-to-End Outcome Chain")).toBeInTheDocument();
  });

  // ── Case 1 — data present: connected nodes render per level (Req 16.1, 16.2) ─
  it("renders connected nodes at each level when chain data is present", () => {
    mockUseOutcomeChain.mockReturnValue({
      data: connectedChain,
      isLoading: false,
      isError: false,
    });
    render(<OutcomeChainView />);

    // Level bands for ILO, GA, PLO, CLO, Assessment, Rubric, Student.
    expect(screen.getByText("Institution Outcome")).toBeInTheDocument();
    expect(screen.getByText("Graduate Attributes")).toBeInTheDocument();
    expect(screen.getByText("Program Outcomes")).toBeInTheDocument();
    expect(screen.getByText("CLOs")).toBeInTheDocument();
    expect(screen.getByText("Assessments")).toBeInTheDocument();
    expect(screen.getByText("Students")).toBeInTheDocument();

    // The actual node records at each level. The ILO title also appears in the
    // header Select value, so it resolves to more than one node.
    expect(
      screen.getAllByText("ILO 1 — Lifelong Learning").length
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Critical Thinking GA")).toBeInTheDocument();
    expect(screen.getByText("PLO 1 — Analyze Systems")).toBeInTheDocument();
    expect(screen.getByText("CLO 1 — Apply Core Concepts")).toBeInTheDocument();
    expect(screen.getByText("Midterm Project")).toBeInTheDocument(); // Assessment
    expect(screen.getByText("Project Rubric")).toBeInTheDocument(); // Assessment's rubric
    expect(screen.getByText("CLO Mastery Rubric")).toBeInTheDocument(); // CLO-attached rubric
    expect(screen.getByText("Alice Student")).toBeInTheDocument(); // Student leaf

    // Outcome-type badges confirm the connected ILO/PLO/CLO nodes.
    expect(screen.getByText("ILO")).toBeInTheDocument();
    expect(screen.getByText("PLO")).toBeInTheDocument();
    expect(screen.getByText("CLO")).toBeInTheDocument();

    // No empty/error/loading state when data is present.
    expect(screen.queryByText(UNIFIED_EMPTY_TITLE)).not.toBeInTheDocument();
  });

  // ── Req 16.3 — GA is a level BETWEEN ILO and PLO ───────────────────────────
  it("places the Graduate Attributes level between the ILO and the PLO levels", () => {
    mockUseOutcomeChain.mockReturnValue({
      data: connectedChain,
      isLoading: false,
      isError: false,
    });
    render(<OutcomeChainView />);

    const iloLabel = screen.getByText("Institution Outcome");
    const gaLabel = screen.getByText("Graduate Attributes");
    const ploLabel = screen.getByText("Program Outcomes");

    // ILO precedes GA, and GA precedes PLO in document order.
    expect(
      iloLabel.compareDocumentPosition(gaLabel) & DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(
      gaLabel.compareDocumentPosition(ploLabel) & DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  // ── Req 16.5 — attainment nodes are color-coded ────────────────────────────
  it("color-codes attainment chips using the platform attainment thresholds", () => {
    mockUseOutcomeChain.mockReturnValue({
      data: connectedChain,
      isLoading: false,
      isError: false,
    });
    render(<OutcomeChainView />);

    // Chips carry a `"{n}% — {level}"` title and an attainment-derived bg color.
    const ploChip = screen.getByTitle("72% — Satisfactory");
    const cloChip = screen.getByTitle("65% — Developing");
    const studentChip = screen.getByTitle("91% — Excellent");

    for (const chip of [ploChip, cloChip, studentChip]) {
      expect((chip as HTMLElement).style.backgroundColor).not.toBe("");
    }

    // The satisfactory chip matches the platform color helper exactly.
    const expectedSatisfactory = document.createElement("div");
    expectedSatisfactory.style.backgroundColor = getAttainmentColor(72);
    expect((ploChip as HTMLElement).style.backgroundColor).toBe(
      expectedSatisfactory.style.backgroundColor
    );

    // Distinct attainment levels produce distinct colors.
    expect((ploChip as HTMLElement).style.backgroundColor).not.toBe(
      (cloChip as HTMLElement).style.backgroundColor
    );
  });

  // ── Case 2 — unified empty state (Req 16.4) ────────────────────────────────
  it("renders a SINGLE unified empty state when no level has linked records", () => {
    mockUseOutcomeChain.mockReturnValue({
      data: emptyChain,
      isLoading: false,
      isError: false,
    });
    render(<OutcomeChainView />);

    // Exactly one unified empty state for the whole chain.
    expect(screen.getAllByText(UNIFIED_EMPTY_TITLE)).toHaveLength(1);

    // It must NOT be a per-level breakdown: none of the level bands render.
    expect(screen.queryByText("Institution Outcome")).not.toBeInTheDocument();
    expect(screen.queryByText("Graduate Attributes")).not.toBeInTheDocument();
    expect(screen.queryByText("Program Outcomes")).not.toBeInTheDocument();
    expect(screen.queryByText("CLOs")).not.toBeInTheDocument();
  });

  it("renders the same unified empty state when the chain is null", () => {
    mockUseOutcomeChain.mockReturnValue({
      data: null,
      isLoading: false,
      isError: false,
    });
    render(<OutcomeChainView />);

    expect(screen.getAllByText(UNIFIED_EMPTY_TITLE)).toHaveLength(1);
    expect(screen.queryByText("Program Outcomes")).not.toBeInTheDocument();
  });

  // ── Case 3 — loading shimmer ───────────────────────────────────────────────
  it("shows shimmer placeholders while the chain is loading", () => {
    mockUseOutcomeChain.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    });
    const { container } = render(<OutcomeChainView />);

    // The loading branch renders shimmer placeholders.
    expect(
      container.querySelectorAll(".animate-shimmer").length
    ).toBeGreaterThanOrEqual(1);

    // While loading, neither the chain nodes nor the unified empty state show.
    expect(screen.queryByText(UNIFIED_EMPTY_TITLE)).not.toBeInTheDocument();
    expect(
      screen.queryByText("PLO 1 — Analyze Systems")
    ).not.toBeInTheDocument();
  });
});
