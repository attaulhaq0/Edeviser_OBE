import { render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { describe, expect, it } from "vitest";

import AtRiskStudentRow from "@/components/shared/AtRiskStudentRow";
import type { ProactiveContributingEvidence } from "@/hooks/useAtRiskPredictions";

const evidence: ProactiveContributingEvidence[] = [
  {
    key: "mastery_below_target",
    observedValue: 42,
    threshold: "CLO mastery < 60%",
    source: "outcome_attainment",
  },
  {
    key: "late_or_missed_submissions",
    observedValue: "missed",
    threshold: "recent submission pattern is late or missed",
    source: "submissions",
  },
];

const renderRow = (
  overrides: Partial<ComponentProps<typeof AtRiskStudentRow>> = {}
) => {
  const props: ComponentProps<typeof AtRiskStudentRow> = {
    studentName: "Alice Johnson",
    cloTitle: "Apply data structures in problem solving",
    contributingEvidence: evidence,
    calculationVersion: "student-learning-state/v1.0.0",
    triggerVersion: "needs-attention/low-mastery-compounding-evidence/v1.0.0",
    recommendedNextAction: "Review cited evidence and the recovery draft.",
    triggeredAt: "2026-08-10T08:00:00.000Z",
    ...overrides,
  };
  return { ...render(<AtRiskStudentRow {...props} />), props };
};

describe("AtRiskStudentRow", () => {
  it("uses a Needs Attention label instead of an unexplained risk score", () => {
    renderRow();

    expect(screen.getByText("Needs Attention")).toBeInTheDocument();
    expect(screen.queryByText(/% risk/i)).not.toBeInTheDocument();
  });

  it("shows contributing evidence, calculation version, and trigger version", () => {
    renderRow();

    expect(screen.getByText("Mastery Below Target: 42")).toBeInTheDocument();
    expect(
      screen.getByText("Late Or Missed Submissions: missed")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Calculation: student-learning-state/v1.0.0")
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Trigger: needs-attention/low-mastery-compounding-evidence/v1.0.0"
      )
    ).toBeInTheDocument();
  });

  it("shows the recommended next action", () => {
    renderRow();

    expect(
      screen.getByText(/Next: Review cited evidence and the recovery draft/)
    ).toBeInTheDocument();
  });

  it("does not offer the retired legacy approval action", () => {
    renderRow();

    expect(screen.getByText("Evidence only")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
