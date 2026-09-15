// AssessmentStrategyInput.tsx — Phase 16: Strategy-aware assessment input
// Dynamically renders correct input based on effective assessment strategy
import type { AssessmentModel, NormalizedAssessment, ReportingResult, GradeScaleBand } from "@/lib/assessmentStrategyEngine";
import { normalizeAssessment, toReportingResult } from "@/lib/assessmentStrategyEngine";
import { PercentStrategyInput } from "./components/PercentStrategyInput";
import { CriterionStrategyInput } from "./components/CriterionStrategyInput";
import { BandGradeStrategyInput } from "./components/BandGradeStrategyInput";
import { ComponentStrategyInput } from "./components/ComponentStrategyInput";

export interface Props {
  assessmentModel: AssessmentModel;
  gradeScale?: GradeScaleBand[];
  onSubmit: (normalized: NormalizedAssessment, reporting: ReportingResult) => void;
  disabled?: boolean;
}

export function AssessmentStrategyInput({ assessmentModel, gradeScale, onSubmit, disabled }: Props) {
  const handleSubmit = (nativeInput: Record<string, unknown>) => {
    const normalized = normalizeAssessment(assessmentModel, nativeInput);
    const reporting = toReportingResult(normalized, gradeScale);
    onSubmit(normalized, reporting);
  };

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">Strategy: <strong>{assessmentModel}</strong></p>
      {assessmentModel === "percent" && <PercentStrategyInput onSubmit={handleSubmit} disabled={disabled} />}
      {assessmentModel === "criterion" && <CriterionStrategyInput onSubmit={handleSubmit} disabled={disabled} />}
      {assessmentModel === "band_grade" && <BandGradeStrategyInput onSubmit={handleSubmit} disabled={disabled} />}
      {assessmentModel === "component" && <ComponentStrategyInput onSubmit={handleSubmit} disabled={disabled} />}
    </div>
  );
}