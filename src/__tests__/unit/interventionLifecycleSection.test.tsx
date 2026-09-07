// @vitest-environment happy-dom
// =============================================================================
// InterventionLifecycleSection — 7.4(d) intervention lifecycle UI tests
//
// Validates the read-only lifecycle render contract:
//   1. data present → student name, type, localized status badge, plan
//   2. no records → "no interventions" empty state (distinct from error)
//   3. query error → error state (never a silent blank)
// =============================================================================

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

import i18n from "@/lib/i18n";

const mockUseLearningInterventions = vi.fn();
vi.mock("@/hooks/useLearningInterventions", () => ({
  useLearningInterventions: () => mockUseLearningInterventions(),
}));

import InterventionLifecycleSection from "@/pages/coordinator/unit-close/InterventionLifecycleSection";

const ROWS = [
  {
    id: "int-1",
    student_id: "s1",
    course_id: "course-1",
    intervention_type: "targeted_support",
    payload: { plan: "Small-group remediation, two weeks." },
    source: "agent",
    status: "approved",
    proposal_id: "p1",
    created_by: "u1",
    approved_by: "u2",
    created_at: "2026-09-07T10:00:00Z",
    updated_at: "2026-09-07T10:00:00Z",
    student_name: "Aisha Noor",
  },
];

describe("InterventionLifecycleSection (7.4(d))", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await i18n.changeLanguage("en");
  });

  it("renders the intervention lifecycle records", () => {
    mockUseLearningInterventions.mockReturnValue({
      data: ROWS,
      isLoading: false,
      isError: false,
    });
    render(<InterventionLifecycleSection courseId="course-1" />);

    expect(screen.getByText("Aisha Noor")).toBeInTheDocument();
    expect(screen.getAllByText("targeted_support").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Approved").length).toBeGreaterThan(0);
    expect(
      screen.getByText("Small-group remediation, two weeks.")
    ).toBeInTheDocument();
  });

  it("renders the empty state when no interventions exist", () => {
    mockUseLearningInterventions.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    });
    render(<InterventionLifecycleSection courseId="course-1" />);

    expect(screen.getByText(/No interventions yet/)).toBeInTheDocument();
  });

  it("renders a distinct error state (never a silent blank)", () => {
    mockUseLearningInterventions.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    });
    render(<InterventionLifecycleSection courseId="course-1" />);

    expect(
      screen.getByText(/Intervention records are unavailable/)
    ).toBeInTheDocument();
  });
});
