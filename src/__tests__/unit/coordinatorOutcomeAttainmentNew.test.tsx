// @vitest-environment happy-dom
// =============================================================================
// CoordinatorOutcomeAttainmentNew — real-data ILO→PLO→CLO rollup (Phase A)
// Verifies the component renders REAL attainment from
// `useCoordinatorOutcomeAttainment` (mocked) and that the single-open PLO
// accordion behaves: PLO1 open by default, clicking another PLO switches the
// open row, clicking the open row toggles it off. Also covers the empty state.
// =============================================================================

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

// i18n passthrough — assertions target stable key strings + real mock data.
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "en", changeLanguage: () => Promise.resolve() },
  }),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ institutionId: "inst-1" }),
}));

// Controllable hook returns (hoisted so the vi.mock factories can read them).
const { attainmentRef, aiRef, trendsRef } = vi.hoisted(() => ({
  attainmentRef: { value: null as unknown },
  aiRef: { value: { data: null } as unknown },
  trendsRef: { value: { data: {} } as unknown },
}));

vi.mock("@/hooks/useCoordinatorOutcomeAttainment", () => ({
  useCoordinatorOutcomeAttainment: () => attainmentRef.value,
}));

vi.mock("@/hooks/useCoordinatorAiInsights", () => ({
  useCoordinatorAiInsights: () => aiRef.value,
}));

vi.mock("@/hooks/useCoordinatorAttainmentTrends", () => ({
  useCoordinatorAttainmentTrends: () => trendsRef.value,
}));

// Rendered inside the screen via CoordinatorInsightRail → mock its readiness.
vi.mock("@/hooks/useCoordinatorAccreditation", () => ({
  useCoordinatorAccreditationReadiness: () => ({ data: null }),
  useAccreditationApprovals: () => ({ data: [] }),
}));

import CoordinatorOutcomeAttainmentNew from "@/components/shared/CoordinatorOutcomeAttainmentNew";

const DATA = {
  successThreshold: 70,
  ilos: [
    {
      id: "ilo1",
      title: "Critical Thinking",
      attainment: 78,
      status: "onTrack",
    },
    { id: "ilo2", title: "Technical Mastery", attainment: 62, status: "watch" },
  ],
  plos: [
    {
      id: "plo1",
      title: "Analyze Computational Problems",
      description: "desc 1",
      attainment: 82,
      status: "onTrack",
      contributingClos: [
        { id: "clo1", title: "Problem Decomposition", attainment: 80 },
        { id: "clo2", title: "Algorithm Analysis", attainment: 66 },
      ],
      weakestCourse: { code: "CS301", attainment: 66 },
      affectedStudents: 4,
      cohortPercent: 13,
    },
    {
      id: "plo2",
      title: "Apply Engineering Principles",
      description: "desc 2",
      attainment: 68,
      status: "watch",
      contributingClos: [
        { id: "clo3", title: "REST API Design", attainment: 55 },
      ],
      weakestCourse: { code: "CS205", attainment: 55 },
      affectedStudents: 6,
      cohortPercent: 20,
    },
  ],
};

const renderPage = () =>
  render(
    <MemoryRouter>
      <CoordinatorOutcomeAttainmentNew />
    </MemoryRouter>
  );

describe("CoordinatorOutcomeAttainmentNew (real data)", () => {
  beforeEach(() => {
    cleanup();
    attainmentRef.value = { data: DATA, isPending: false, isError: false };
    aiRef.value = { data: null }; // AI card hidden by default (graceful)
    trendsRef.value = { data: {} }; // no trend deltas by default
  });

  it("renders the title, ILO and PLO sections, and real ILO titles", () => {
    renderPage();
    expect(screen.getByText("attainment.title")).toBeInTheDocument();
    expect(screen.getByText("attainment.iloSection")).toBeInTheDocument();
    expect(screen.getByText("attainment.ploSection")).toBeInTheDocument();
    // Real ILO title from the hook.
    expect(screen.getByText("Critical Thinking")).toBeInTheDocument();
    // Real PLO titles render in the rows.
    expect(
      screen.getByText("Analyze Computational Problems")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Apply Engineering Principles")
    ).toBeInTheDocument();
  });

  it("opens PLO1 by default (exactly one expanded row, its CLOs visible)", () => {
    renderPage();
    const expanded = screen.getAllByRole("button", { expanded: true });
    expect(expanded).toHaveLength(1);
    // PLO1's contributing CLOs are shown; PLO2's are not.
    expect(screen.getByText("Problem Decomposition")).toBeInTheDocument();
    expect(screen.queryByText("REST API Design")).not.toBeInTheDocument();
  });

  it("switches the open row when another PLO is clicked (single-open)", async () => {
    const user = userEvent.setup();
    renderPage();

    // First collapsed row = PLO2 (DOM order after the open PLO1).
    const collapsed = screen.getAllByRole("button", { expanded: false });
    await user.click(collapsed[0]!);

    // PLO2 CLO now shown; PLO1 CLO collapsed away.
    expect(screen.getByText("REST API Design")).toBeInTheDocument();
    expect(screen.queryByText("Problem Decomposition")).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { expanded: true })).toHaveLength(1);
  });

  it("collapses the open row when clicked again (toggle off)", async () => {
    const user = userEvent.setup();
    renderPage();
    const openRow = screen.getByRole("button", { expanded: true });
    await user.click(openRow);
    expect(
      screen.queryByRole("button", { expanded: true })
    ).not.toBeInTheDocument();
  });

  it("renders the empty state when there is no attainment data", () => {
    attainmentRef.value = {
      data: { ilos: [], plos: [], successThreshold: 70 },
      isPending: false,
      isError: false,
    };
    renderPage();
    // Both the ILO section and the PLO EmptyState surface the empty key.
    expect(screen.getAllByText("attainment.empty").length).toBeGreaterThan(0);
  });

  it("shows the AI insight card (narrative + recommendations) when available", () => {
    aiRef.value = {
      data: {
        threshold: 70,
        ploCount: 7,
        avgAttainment: 75,
        belowTargetCount: 0,
        weakest: null,
        narrative: "Mean attainment across outcomes is 75%.",
        recommendations: ["Move satisfactory outcomes toward excellent."],
        source: "computed",
        model: null,
        generatedAt: "2026-07-10T00:00:00Z",
      },
    };
    renderPage();
    expect(
      screen.getByText("Mean attainment across outcomes is 75%.")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Move satisfactory outcomes toward excellent.")
    ).toBeInTheDocument();
    // Source badge reflects the computed (non-LLM) origin.
    expect(screen.getByText("attainment.sourceComputed")).toBeInTheDocument();
  });

  it("hides the AI insight card when the insight hook returns null", () => {
    renderPage();
    expect(screen.queryByText("attainment.aiInsight")).not.toBeInTheDocument();
  });

  it("shows a 'vs last term' delta on a PLO with >= 2 trend snapshots", () => {
    trendsRef.value = {
      data: {
        plo1: [
          {
            semesterId: "s1",
            semesterName: "Fall",
            startDate: "2025-01-01",
            attainment: 70,
          },
          {
            semesterId: "s2",
            semesterName: "Spring",
            startDate: "2025-06-01",
            attainment: 82,
          },
        ],
      },
    };
    renderPage();
    // Delta = 82 - 70 = +12.
    expect(screen.getByText(/\+12/)).toBeInTheDocument();
  });

  it("shows no trend delta when there is only one snapshot", () => {
    trendsRef.value = {
      data: {
        plo1: [
          {
            semesterId: "s1",
            semesterName: "Fall",
            startDate: "2025-01-01",
            attainment: 70,
          },
        ],
      },
    };
    renderPage();
    expect(screen.queryByText("attainment.vsLastTerm")).not.toBeInTheDocument();
  });
});
