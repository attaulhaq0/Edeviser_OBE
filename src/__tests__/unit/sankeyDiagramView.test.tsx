// @vitest-environment happy-dom
// =============================================================================
// SankeyDiagramView — both render branches (real flow vs. "Outcome Mapping")
//
// Feature: qa-partner-review-remediation — Req 11 (P7)
// Validates: Requirements 11.2, 11.3, 11.4
//
// SankeyDiagramView maps `useSankeyData` { nodes, links } onto a recharts
// `Sankey`. It has two mutually exclusive data branches once a program is
// selected and data has loaded with at least one node:
//
//   1. links present  → the real flow diagram (recharts Sankey) renders, the
//      page title reads "Outcome Flow (Sankey)", and the
//      "{n} outcomes · {m} mappings" caption is preserved (Req 11.2, 11.5).
//   2. links empty     → the fallback column layout renders, the page title
//      reads "Outcome Mapping", and the term "Sankey" never appears in any
//      user-facing string for that branch (Req 11.3, 11.4).
//
// recharts' `ResponsiveContainer` reports a 0×0 box under happy-dom, so the
// internal SVG flow is not laid out in jsdom/happy-dom. We therefore assert on
// the component's own surrounding DOM — the page title and the preserved
// counts caption that `SankeyFlow` renders outside the chart — rather than on
// recharts' SVG internals. `ResizeObserver` (relied on by both
// `ResponsiveContainer` and the Radix Select trigger) is stubbed below.
// =============================================================================

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

import type { SankeyNode, SankeyLink } from "@/lib/sankeyTransform";

// ---------------------------------------------------------------------------
// Mocks (must precede the component import)
// ---------------------------------------------------------------------------

// nuqs — return a fixed, non-empty program id so the component is past the
// "Select a program" guard and exercises the real data branches.
vi.mock("nuqs", () => ({
  parseAsString: { withDefault: (def: string) => def },
  useQueryState: () => ["prog-1", vi.fn()] as const,
}));

// usePrograms — a single program so the header Select has an option; the view
// reads `programsData?.data ?? []`.
vi.mock("@/hooks/usePrograms", () => ({
  usePrograms: () => ({
    data: { data: [{ id: "prog-1", name: "CS Program" }] },
  }),
}));

// useSankeyData is the single dependency that drives both branches.
type SankeyQueryResult = {
  data: { nodes: SankeyNode[]; links: SankeyLink[] } | undefined;
  isLoading: boolean;
};
const mockUseSankeyData = vi.fn<() => SankeyQueryResult>();
vi.mock("@/hooks/useVisualizationData", () => ({
  useSankeyData: () => mockUseSankeyData(),
}));

// happy-dom implements neither ResizeObserver (used by recharts'
// ResponsiveContainer and the Radix Select trigger) nor a complete
// matchMedia (read by framer-motion's reduced-motion gate in SankeyFlow).
class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal("ResizeObserver", MockResizeObserver);
vi.stubGlobal(
  "matchMedia",
  (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    } as unknown as MediaQueryList)
);

import SankeyDiagramView from "@/pages/coordinator/sankey/SankeyDiagramView";

// ---------------------------------------------------------------------------
// Fixtures — two CLOs flowing into one PLO
// ---------------------------------------------------------------------------

const NODES: SankeyNode[] = [
  {
    name: "CLO Alpha",
    id: "clo-1",
    type: "CLO",
    attainment: 80,
    color: "#22c55e",
  },
  {
    name: "CLO Beta",
    id: "clo-2",
    type: "CLO",
    attainment: 60,
    color: "#f59e0b",
  },
  {
    name: "PLO One",
    id: "plo-1",
    type: "PLO",
    attainment: 75,
    color: "#3b82f6",
  },
];

const LINKS: SankeyLink[] = [
  { source: 0, target: 2, value: 50, weight: 50 },
  { source: 1, target: 2, value: 50, weight: 50 },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("SankeyDiagramView — both data branches (Req 11.2, 11.3, 11.4)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the real flow with the preserved counts caption when links are present (Req 11.2, 11.5)", () => {
    mockUseSankeyData.mockReturnValue({
      data: { nodes: NODES, links: LINKS },
      isLoading: false,
    });

    const { container } = render(<SankeyDiagramView />);

    // The flow branch labels the page with the "Sankey" wording.
    expect(
      screen.getByRole("heading", { name: "Outcome Flow (Sankey)" })
    ).toBeInTheDocument();

    // The outcome/mapping counts caption is preserved (3 nodes, 2 links). React
    // splits the interpolated text into several text nodes within one <p>, so
    // assert on the flattened textContent rather than an exact getByText match.
    expect(container.textContent).toContain("3 outcomes · 2 mappings");

    // The fallback column layout is NOT used in this branch (no per-column
    // "CLOs" / "PLOs" / "ILOs" headers from OutcomeMappingColumns).
    expect(screen.queryByText("ILOs")).not.toBeInTheDocument();
  });

  it("renders the 'Outcome Mapping' fallback with NO 'Sankey' wording when links are empty (Req 11.3, 11.4)", () => {
    mockUseSankeyData.mockReturnValue({
      data: { nodes: NODES, links: [] },
      isLoading: false,
    });

    const { container } = render(<SankeyDiagramView />);

    // The empty-links branch relabels the page heading to "Outcome Mapping".
    expect(
      screen.getByRole("heading", { name: "Outcome Mapping" })
    ).toBeInTheDocument();

    // The counts caption is still preserved (3 nodes, 0 links).
    expect(container.textContent).toContain("3 outcomes · 0 mappings");

    // Req 11.4: the term "Sankey" must not appear anywhere in this branch.
    expect(container.textContent ?? "").not.toContain("Sankey");
  });
});
