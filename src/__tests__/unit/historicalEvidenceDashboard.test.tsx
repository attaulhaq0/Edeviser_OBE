// @vitest-environment happy-dom
// =============================================================================
// HistoricalEvidenceDashboard — no developer-oriented text across all states
//
// Feature: qa-partner-review-remediation — Req 4 (B4)
// Validates: Requirements 4.5, 4.7
//
// The Admin Historical Evidence dashboard previously rendered the literal
// developer placeholder "Requires mv_historical_evidence view". Req 4.5 / 4.7
// require that NO user-facing surface of this dashboard ever exposes internal
// object names, migration identifiers, or developer instructions — in ANY
// render state (loading / empty / data).
//
// This suite mocks `useHistoricalEvidence` to drive the three mutually
// exclusive states and asserts:
//   1. loading → a component-level shimmer is present; no developer text
//   2. empty   → the shared NoEvidence empty state is present; no developer text
//   3. data    → the per-semester evidence tables render; no developer text
//
// The "no developer text" check is a case-insensitive substring scan over the
// rendered container's textContent against a forbidden list (Req 4.7).
// =============================================================================

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";

import i18n from "@/lib/i18n";
import type { HistoricalEvidenceRow } from "@/hooks/useHistoricalEvidence";

// ---------------------------------------------------------------------------
// Mocks (must precede the component import)
// ---------------------------------------------------------------------------

// nuqs — minimal stub: filters are URL state the component reads but does not
// need wired for this render-only suite (mirrors heatmapFilters.test.tsx).
vi.mock("nuqs", () => ({
  parseAsString: { withDefault: (def: string) => def },
  useQueryState: () => ["", vi.fn()] as const,
}));

// The data hook is the single dependency that drives every render state. We
// mock the module so no real Supabase/network call is made.
const mockUseHistoricalEvidence = vi.fn();
vi.mock("@/hooks/useHistoricalEvidence", () => ({
  useHistoricalEvidence: () => mockUseHistoricalEvidence(),
}));

// happy-dom does not implement ResizeObserver, which Radix relies on; the
// dashboard renders two always-visible Select triggers in its header.
class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal("ResizeObserver", MockResizeObserver);

import HistoricalEvidenceDashboard from "@/pages/admin/historical-evidence/HistoricalEvidenceDashboard";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const DATA_ROWS: HistoricalEvidenceRow[] = [
  {
    semester_id: "sem-1",
    semester_name: "Fall 2024",
    start_date: "2024-09-01",
    outcome_type: "PLO",
    blooms_level: "applying",
    evidence_count: 12,
    avg_score: 78,
    excellent_count: 3,
    satisfactory_count: 5,
    developing_count: 3,
    not_yet_count: 1,
  },
  {
    semester_id: "sem-2",
    semester_name: "Spring 2025",
    start_date: "2025-02-01",
    outcome_type: "CLO",
    blooms_level: "creating",
    evidence_count: 8,
    avg_score: 64,
    excellent_count: 1,
    satisfactory_count: 3,
    developing_count: 3,
    not_yet_count: 1,
  },
];

// Internal object names, migration identifiers, raw object/SQL identifiers, and
// developer instructions that must NEVER appear in a user-facing surface
// (Req 4.5, 4.7). Compared case-insensitively as substrings.
const FORBIDDEN_SUBSTRINGS: readonly string[] = [
  "requires mv_historical_evidence view", // the exact original placeholder
  "mv_historical_evidence", // internal object name
  "materialized view",
  "view", // any developer-facing reference to the backing DB view
  "requires",
  "migration",
  "refresh_mv_historical_evidence",
  "information_schema",
  "search_path",
  "security definer",
  "supabase",
  "as never",
  "select * from",
  "todo",
  "fixme",
];

const renderDashboard = () =>
  render(
    <I18nextProvider i18n={i18n}>
      <HistoricalEvidenceDashboard />
    </I18nextProvider>
  );

const assertNoDeveloperText = (container: HTMLElement) => {
  const text = (container.textContent ?? "").toLowerCase();
  for (const forbidden of FORBIDDEN_SUBSTRINGS) {
    expect(
      text.includes(forbidden.toLowerCase()),
      `rendered text must not contain developer-oriented substring "${forbidden}"`
    ).toBe(false);
  }
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("HistoricalEvidenceDashboard — no developer-oriented text (Req 4.5, 4.7)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders a shimmer on loading and no developer text", () => {
    mockUseHistoricalEvidence.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    });

    const { container } = renderDashboard();

    // A proper component-level shimmer is present while loading.
    expect(
      container.querySelectorAll(".animate-shimmer").length
    ).toBeGreaterThan(0);

    assertNoDeveloperText(container);
  });

  it("renders the shared empty state on zero rows and no developer text", () => {
    mockUseHistoricalEvidence.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    });

    const { container } = renderDashboard();

    // The shared NoEvidence empty state (not a bare placeholder).
    expect(
      screen.getByText(i18n.t("common:empty.noEvidence.title"))
    ).toBeInTheDocument();

    assertNoDeveloperText(container);
  });

  it("renders the evidence data and no developer text", () => {
    mockUseHistoricalEvidence.mockReturnValue({
      data: DATA_ROWS,
      isLoading: false,
      isError: false,
    });

    const { container } = renderDashboard();

    // Per-semester evidence renders (grouped by semester).
    expect(screen.getByText("Fall 2024")).toBeInTheDocument();
    expect(screen.getByText("Spring 2025")).toBeInTheDocument();
    // The evidence table structure is present.
    expect(screen.getAllByText("Avg Score").length).toBeGreaterThan(0);
    // No shimmer once data has resolved.
    expect(container.querySelectorAll(".animate-shimmer").length).toBe(0);

    assertNoDeveloperText(container);
  });

  it("never exposes the original developer placeholder in any state", () => {
    const states: ReadonlyArray<{
      data: HistoricalEvidenceRow[] | undefined;
      isLoading: boolean;
      isError: boolean;
    }> = [
      { data: undefined, isLoading: true, isError: false },
      { data: [], isLoading: false, isError: false },
      { data: DATA_ROWS, isLoading: false, isError: false },
    ];

    for (const state of states) {
      mockUseHistoricalEvidence.mockReturnValue(state);
      const { container, unmount } = renderDashboard();
      assertNoDeveloperText(container);
      unmount();
    }
  });
});
