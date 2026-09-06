// =============================================================================
// AssessmentCoverageWarning — authoring-time coverage guard UI (task 7.3b)
// =============================================================================
// Shown inside assignment/quiz authoring forms. Lists the course CLOs that
// still have ZERO linked assessments (across assignments AND quizzes) so the
// teacher sees the coverage gap while authoring — not at inspection time.
// Renders nothing when the course is fully covered or still loading (no
// fake data, no empty-chart pretense).

import { AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";

import {
  selectUncoveredCLOs,
  useCourseAssessmentCoverage,
} from "@/hooks/useCourseAssessmentCoverage";

interface AssessmentCoverageWarningProps {
  courseId: string | undefined;
  /** CLO ids already linked in the current draft — shown as "in this draft". */
  draftCloIds?: string[];
}

const MAX_LISTED = 5;

export function AssessmentCoverageWarning({
  courseId,
  draftCloIds,
}: AssessmentCoverageWarningProps) {
  const { t } = useTranslation("common");
  const { data: rows, isLoading } = useCourseAssessmentCoverage(courseId);

  if (!courseId || isLoading) return null;

  const uncovered = selectUncoveredCLOs(rows);
  if (uncovered.length === 0) return null;

  const inDraft = new Set(draftCloIds ?? []);
  const stillUncovered = uncovered.filter((row) => !inDraft.has(row.clo_id));
  if (stillUncovered.length === 0) return null;

  const listed = stillUncovered.slice(0, MAX_LISTED);
  const remaining = stillUncovered.length - listed.length;

  return (
    <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
      <div>
        <p className="font-medium">
          {t("coverageGuard.heading", {
            uncovered: stillUncovered.length,
            total: rows?.length ?? stillUncovered.length,
          })}
        </p>
        <ul className="mt-1 list-inside list-disc space-y-0.5">
          {listed.map((row) => (
            <li key={row.clo_id}>{row.clo_title}</li>
          ))}
          {remaining > 0 && (
            <li>{t("coverageGuard.more", { count: remaining })}</li>
          )}
        </ul>
        <p className="mt-1 text-xs text-amber-700">
          {t("coverageGuard.footnote")}
        </p>
      </div>
    </div>
  );
}
