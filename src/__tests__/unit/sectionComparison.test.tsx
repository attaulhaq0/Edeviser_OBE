// @vitest-environment happy-dom
// =============================================================================
// Coordinator Section Comparison — real attainment data + drill-down
//
// Feature: qa-partner-review-remediation — Req 10 (P6)
// Validates: Requirements 10.1, 10.2, 10.3, 10.4
//
// The Coordinator Section Comparison previously fed the bars a hardcoded
// `attainmentPercent: 0` and a `studentCount` equal to section capacity, with
// no drill-down. The fix sources real attainment + enrolled counts from
// `useSectionAttainment` and makes bars clickable, opening a
// `SectionDrillDownDialog` (teacher / CLO / evidence). A section with no
// evidence shows an inline empty state instead of a misleading 0% bar, and bar
// color is driven by `getAttainmentColor`.
//
// This suite follows the lightweight, prop-driven approach recommended by the
// task: `SectionComparisonChart` is exercised directly via props (no whole-
// dashboard mock), and the drill-down is exercised through a tiny harness that
// reproduces the dashboard's chart -> dialog wiring while mocking only the
// `useSectionDrillDown` data hook.
//   1. data present → bars render real attainment values; color via getAttainmentColor
//   2. a section click → opens SectionDrillDownDialog showing teacher/CLO/evidence
//   3. a section with no evidence → inline empty state renders (not a bare 0%)
// =============================================================================

import { useState, type ReactNode } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { getAttainmentColor } from "@/lib/attainmentClassifier";
import type { SectionDrillDown } from "@/hooks/useSectionAttainment";

// ---------------------------------------------------------------------------
// Mocks (must precede the component import)
// ---------------------------------------------------------------------------

// `SectionComparisonChart` is pure (props only). `SectionDrillDownDialog` is the
// only consumer of `useSectionAttainment`, via `useSectionDrillDown`. Mock the
// whole hook module so no real Supabase/network call is made; the drill-down
// payload is driven per-test.
const mockUseSectionDrillDown = vi.fn();
vi.mock("@/hooks/useSectionAttainment", () => ({
  useSectionAttainment: vi.fn(() => ({ data: [], isLoading: false })),
  useSectionDrillDown: () => mockUseSectionDrillDown(),
}));

// happy-dom does not implement ResizeObserver, which Radix Dialog relies on.
class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal("ResizeObserver", MockResizeObserver);

import SectionComparisonChart, {
  type SectionData,
} from "@/components/shared/SectionComparisonChart";
import SectionDrillDownDialog from "@/components/shared/SectionDrillDownDialog";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

// Real (non-zero) attainment + actual enrolled counts. Section C has no
// evidence (sampleCount 0) so it must render the inline empty state.
const SECTIONS_WITH_DATA: SectionData[] = [
  {
    sectionId: "sec-1",
    sectionCode: "A",
    attainmentPercent: 90, // excellent → green
    studentCount: 25, // actual enrolled count, NOT capacity
    sampleCount: 12,
  },
  {
    sectionId: "sec-2",
    sectionCode: "B",
    attainmentPercent: 62, // developing → yellow
    studentCount: 18,
    sampleCount: 8,
  },
];

const SECTION_NO_EVIDENCE: SectionData = {
  sectionId: "sec-3",
  sectionCode: "C",
  attainmentPercent: 0,
  studentCount: 0,
  sampleCount: 0,
};

// Drill-down payload surfaced inside the dialog (teacher / CLO / evidence).
const DRILL_DOWN: SectionDrillDown = {
  section_id: "sec-1",
  section_code: "A",
  teacher_name: "Dr. Alice Carter",
  student_count: 25,
  clos: [
    {
      clo_id: "clo-1",
      clo_title: "Analyze data structures",
      blooms_level: "analyzing",
      attainment_percent: 88,
      sample_count: 10,
    },
    {
      clo_id: "clo-2",
      clo_title: "Build a REST API",
      blooms_level: "creating",
      attainment_percent: 0,
      sample_count: 0, // no evidence for this CLO
    },
  ],
};

/** Normalizes a CSS color the same way happy-dom stores inline styles. */
const normalizeColor = (color: string): string => {
  const el = document.createElement("span");
  el.style.color = color;
  return el.style.color;
};

// A tiny harness that reproduces the dashboard's chart -> dialog wiring without
// mocking the whole dashboard: clicking a section sets the selected section id,
// which opens the SectionDrillDownDialog.
const ComparisonHarness = ({ sections }: { sections: SectionData[] }) => {
  const [sectionId, setSectionId] = useState<string | null>(null);
  return (
    <>
      <SectionComparisonChart
        sections={sections}
        onSectionClick={(section) => setSectionId(section.sectionId ?? null)}
      />
      <SectionDrillDownDialog
        courseId="course-1"
        sectionId={sectionId ?? undefined}
        open={sectionId !== null}
        onOpenChange={(open) => {
          if (!open) setSectionId(null);
        }}
      />
    </>
  );
};

const renderNode = (node: ReactNode) => render(<>{node}</>);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Coordinator Section Comparison (Req 10)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSectionDrillDown.mockReturnValue({
      data: DRILL_DOWN,
      isLoading: false,
    });
  });

  // ─── Req 10.1 / 10.2 / 10.5 — real attainment + enrolled count + color ────

  it("renders real attainment values and actual enrolled counts per section", () => {
    // Validates Requirements 10.1, 10.2
    renderNode(<SectionComparisonChart sections={SECTIONS_WITH_DATA} />);

    // Real attainment (not a hardcoded 0%) is displayed per section.
    expect(screen.getByText("90%")).toBeInTheDocument();
    expect(screen.getByText("62%")).toBeInTheDocument();

    // Each section is labelled by its code.
    expect(screen.getByText("Section A")).toBeInTheDocument();
    expect(screen.getByText("Section B")).toBeInTheDocument();

    // Actual enrolled student counts (NOT section capacity) are displayed.
    expect(screen.getByText("25 students")).toBeInTheDocument();
    expect(screen.getByText("18 students")).toBeInTheDocument();
  });

  it("color-codes attainment values via getAttainmentColor", () => {
    // Validates Requirement 10.1/10.5 — distinct attainment levels → distinct colors
    renderNode(<SectionComparisonChart sections={SECTIONS_WITH_DATA} />);

    const excellent = screen.getByText("90%");
    const developing = screen.getByText("62%");

    // Each value carries the platform attainment color for its percentage.
    expect(excellent.style.color).toBe(normalizeColor(getAttainmentColor(90)));
    expect(developing.style.color).toBe(normalizeColor(getAttainmentColor(62)));

    // Excellent (90%) and Developing (62%) map to different colors.
    expect(excellent.style.color).not.toBe(developing.style.color);
  });

  // ─── Req 10.4 — inline empty state for a section with no evidence ─────────

  it("renders an inline empty state for a section with no evidence instead of a 0% bar", () => {
    // Validates Requirement 10.4
    renderNode(<SectionComparisonChart sections={[SECTION_NO_EVIDENCE]} />);

    // The inline empty state copy is shown for the evidence-less section.
    expect(
      screen.getByText("No attainment evidence recorded for this section yet.")
    ).toBeInTheDocument();
    expect(screen.getByText("No evidence yet")).toBeInTheDocument();

    // A misleading "0%" attainment value is NOT rendered.
    expect(screen.queryByText("0%")).not.toBeInTheDocument();
  });

  // ─── Req 10.3 — section click opens the drill-down with detail ────────────

  it("makes each section clickable when a click handler is provided", () => {
    // Validates Requirement 10.3 (affordance)
    const onSectionClick = vi.fn();
    renderNode(
      <SectionComparisonChart
        sections={SECTIONS_WITH_DATA}
        onSectionClick={onSectionClick}
      />
    );

    const sectionAButton = screen.getByRole("button", {
      name: /view details for section a/i,
    });
    expect(sectionAButton).toBeInTheDocument();
  });

  it("opens the section drill-down dialog showing teacher / CLO / evidence on click", async () => {
    // Validates Requirement 10.3
    const user = userEvent.setup();
    renderNode(<ComparisonHarness sections={SECTIONS_WITH_DATA} />);

    // The drill-down detail is not present before the section is selected.
    expect(screen.queryByText("Dr. Alice Carter")).not.toBeInTheDocument();
    expect(
      screen.queryByText("Analyze data structures")
    ).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /view details for section a/i })
    );

    // The dialog opens with the section's teacher / CLO / evidence breakdown.
    const dialog = await screen.findByRole("dialog");
    const inDialog = within(dialog);

    // Teacher detail.
    expect(inDialog.getByText("Dr. Alice Carter")).toBeInTheDocument();
    expect(inDialog.getByText("25 students")).toBeInTheDocument();

    // Per-CLO attainment evidence.
    expect(inDialog.getByText("Analyze data structures")).toBeInTheDocument();
    expect(inDialog.getByText("88%")).toBeInTheDocument();
    expect(inDialog.getByText("Build a REST API")).toBeInTheDocument();
    // The evidence-less CLO shows "No evidence" rather than a 0% value.
    expect(inDialog.getByText("No evidence")).toBeInTheDocument();
  });

  it("does not open the drill-down dialog before any section is selected", () => {
    // Validates Requirement 10.3 (dialog gated on selection)
    renderNode(<ComparisonHarness sections={SECTIONS_WITH_DATA} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
