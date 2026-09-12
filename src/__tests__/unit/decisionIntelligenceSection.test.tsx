// @vitest-environment happy-dom
// =============================================================================
// DecisionIntelligenceSection — task 8.9 UI unit tests
//
// Feature: continuous-verification — 8.9 (decision-stack UI surface)
// Validates the deterministic classification render contract:
//   1. data present → renders problem cases with dominant cause label,
//      confidence, and cited evidence sources (citations ⊆ authorized set)
//   2. struggling-student counts render when students are below target
//   3. attainment present but no cases → "no problem cases" empty state
//   4. no attainment (engine's message branch) → distinct "no data" state
// The classification itself is pure SQL (`classify_problem_cases_v1`); this
// suite mocks the data hook and tests the UI contract only.
// =============================================================================

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import i18n from "@/lib/i18n";
import type { ClassificationResult } from "@/hooks/useProblemClassification";

// happy-dom does not implement ResizeObserver / pointer-capture, which the
// Radix Dialog (draft dialog) relies on.
class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal("ResizeObserver", MockResizeObserver);
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false;
}
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

// 8.9 remediation: intervention proposal creation hook mock
const mockCreateProposal = vi.fn();
vi.mock("@/hooks/useCreateInterventionProposal", () => ({
  useCreateInterventionProposal: () => mockCreateProposal(),
}));

// ---------------------------------------------------------------------------
// Mocks (must precede the component import)
// ---------------------------------------------------------------------------
const mockUseProblemClassification = vi.fn();
vi.mock("@/hooks/useProblemClassification", () => ({
  useProblemClassification: () => mockUseProblemClassification(),
}));

// 8.9 AI explanation affordance: feature gate + mutation hook are mocked;
// the gate is ON so the affordance contract can be tested.
const mockExplanation = vi.fn();
vi.mock("@/ai/lib/featureGate", () => ({
  isAiSurfaceEnabled: () => true,
}));
vi.mock("@/ai/hooks/useProblemCaseExplanation", () => ({
  useProblemCaseExplanation: () => mockExplanation(),
}));

import DecisionIntelligenceSection from "@/pages/coordinator/unit-close/DecisionIntelligenceSection";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const RESULT_WITH_CASES: ClassificationResult = {
  course_id: "course-1",
  course_avg: 61.4,
  section_spread: 24.6,
  classified_at: "2026-09-07T00:00:00Z",
  cases: [
    {
      clo_id: "clo-1",
      clo_title: "Recall key concepts in Science",
      blooms_level: "remembering",
      course_avg: 46.8,
      students_assessed: 24,
      problem_types: ["curriculum-design-signal"],
      dominant_cause: "curriculum-design-signal",
      confidence: 0.8,
      // 8.9 Q5: deterministic ownership routing from the dominant cause.
      // curriculum-design-signal → coordinator (mirrors the SQL engine).
      recommended_owner: "coordinator",
      evidence: [
        { source: "outcome_attainment", clo_id: "clo-1", course_avg: 46.8 },
      ],
      struggling_students: [
        { student_id: "s1", attainment: 41.2 },
        { student_id: "s2", attainment: 33.5 },
      ],
    },
  ],
};

const RESULT_NO_CASES: ClassificationResult = {
  course_id: "course-1",
  course_avg: 88.2,
  section_spread: 6.1,
  classified_at: "2026-09-07T00:00:00Z",
  cases: [],
};

// The engine's no-data branch: cases empty AND course_avg absent.
const RESULT_NO_DATA = {
  course_id: "course-1",
  cases: [],
  message: "No attainment data for this course",
} as unknown as ClassificationResult;

describe("DecisionIntelligenceSection (task 8.9 UI)", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mockExplanation.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      isError: false,
      data: null,
    });
    mockCreateProposal.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      isSuccess: false,
      isError: false,
      error: null,
    });
    await i18n.changeLanguage("en");
  });

  it("renders problem cases with dominant cause, confidence and cited evidence", () => {
    mockUseProblemClassification.mockReturnValue({
      data: RESULT_WITH_CASES,
      isLoading: false,
      isError: false,
    });
    render(<DecisionIntelligenceSection courseId="course-1" />);

    // The CLO title and the localized dominant-cause label.
    expect(
      screen.getByText("Recall key concepts in Science")
    ).toBeInTheDocument();
    expect(screen.getAllByText("Curriculum design").length).toBeGreaterThan(0);

    // 8.9 Q5: deterministic ownership routing renders (cause → owner).
    expect(screen.getByText(/Recommended owner:/)).toBeInTheDocument();
    expect(screen.getByText("Coordinator")).toBeInTheDocument();

    // Confidence 0.8 → 80%.
    expect(screen.getByText(/Confidence:\s*80%/)).toBeInTheDocument();

    // Evidence citation source renders (citation ⊆ authorized evidence set).
    expect(screen.getByText("outcome_attainment")).toBeInTheDocument();
  });

  it("renders struggling-student counts below target", () => {
    mockUseProblemClassification.mockReturnValue({
      data: RESULT_WITH_CASES,
      isLoading: false,
      isError: false,
    });
    render(<DecisionIntelligenceSection courseId="course-1" />);

    expect(screen.getByText("2 students below target")).toBeInTheDocument();
    expect(screen.getByText("24 students assessed")).toBeInTheDocument();
  });

  it("renders the no-problem-cases empty state when attainment exists", () => {
    mockUseProblemClassification.mockReturnValue({
      data: RESULT_NO_CASES,
      isLoading: false,
      isError: false,
    });
    render(<DecisionIntelligenceSection courseId="course-1" />);

    expect(
      screen.getByText(
        "No problem cases detected — every assessed outcome is at or above target."
      )
    ).toBeInTheDocument();
  });

  it("renders the distinct no-data state when the engine has no attainment", () => {
    mockUseProblemClassification.mockReturnValue({
      data: RESULT_NO_DATA,
      isLoading: false,
      isError: false,
    });
    render(<DecisionIntelligenceSection courseId="course-1" />);

    expect(
      screen.getByText("No attainment data available for classification yet.")
    ).toBeInTheDocument();
  });

  it("opens the deterministic intervention draft dialog (Q4)", async () => {
    const user = userEvent.setup();
    mockUseProblemClassification.mockReturnValue({
      data: RESULT_WITH_CASES,
      isLoading: false,
      isError: false,
    });
    render(<DecisionIntelligenceSection courseId="course-1" />);

    await user.click(
      screen.getByRole("button", { name: /Draft intervention/ })
    );

    // Deterministic headline from cited evidence (not AI prose) — the fixture
    // case is curriculum-design-signal, so the cohort-review headline renders.
    expect(
      screen.getByText(/Deterministic intervention draft/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /The whole cohort struggles on "Recall key concepts in Science"/
      )
    ).toBeInTheDocument();
    // Q7: the curriculum-change recommendation is flagged for this cause.
    expect(
      screen.getByText(/Curriculum change recommended — route through CQI\./)
    ).toBeInTheDocument();
    // The draft carries the approval gate note — no writes from this surface.
    expect(
      screen.getByText(
        "Approval is required before any official intervention record is created."
      )
    ).toBeInTheDocument();
  });

  it("renders the AI explanation affordance and its validated result", async () => {
    const user = userEvent.setup();
    const mutate = vi.fn();
    mockUseProblemClassification.mockReturnValue({
      data: RESULT_WITH_CASES,
      isLoading: false,
      isError: false,
    });
    mockExplanation.mockReturnValue({
      mutate,
      isPending: false,
      isError: false,
      data: {
        runId: "run-1",
        explanation: "Course average is 46.8%, below the 70% target.",
        model: "deepseek-chat",
      },
    });
    render(<DecisionIntelligenceSection courseId="course-1" />);

    // The AI affordance lives inside the draft dialog — open it first.
    await user.click(
      screen.getByRole("button", { name: /Draft intervention/ })
    );
    await user.click(screen.getByRole("button", { name: /Explain with AI/ }));
    expect(mutate).toHaveBeenCalledWith({
      courseId: "course-1",
      cloId: "clo-1",
    });
    expect(
      screen.getByText(/AI explanation · deepseek-chat/)
    ).toBeInTheDocument();
    expect(
      screen.getByText("Course average is 46.8%, below the 70% target.")
    ).toBeInTheDocument();
  });
});
