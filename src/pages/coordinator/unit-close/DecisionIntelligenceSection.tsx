// DecisionIntelligenceSection — coordinator decision-intelligence surface (task 8.9)
// ==============================================================================
// Renders the deterministic problem-classification engine output
// (`classify_problem_cases_v1`) on the Unit-Close review screen.
// Classification is pure SQL — there is NO AI on this surface. Each problem
// case carries a dominant cause, a confidence score, cited evidence
// (⊆ the authorized evidence set), and the students below target — answering
// "what is failing" and "why" for the coordinator at unit-close time.

import { BrainCircuit, FileSearch, Users } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  useProblemClassification,
  type ProblemCase,
} from "@/hooks/useProblemClassification";
import { getAttainmentColor } from "@/lib/attainmentClassifier";

// The five canonical problem classes from the classification engine. Unknown
// causes (future engine versions) fall back to the raw string.
const KNOWN_CAUSES = [
  "student-signal",
  "teacher-signal",
  "assessment-signal",
  "prerequisite-signal",
  "curriculum-design-signal",
] as const;

const isKnownCause = (cause: string): boolean =>
  (KNOWN_CAUSES as readonly string[]).includes(cause);

/** Compact, deterministic summary of an evidence citation (scalars only). */
const describeEvidence = (item: Record<string, unknown>): string =>
  Object.entries(item)
    .filter(([field]) => field !== "source")
    .map(([field, value]) => `${field}: ${String(value)}`)
    .join(" · ");

function ProblemCaseCard({ problemCase }: { problemCase: ProblemCase }) {
  const { t } = useTranslation("coordinator");
  const strugglingCount = problemCase.struggling_students?.length ?? 0;
  const causeLabel = (cause: string): string =>
    isKnownCause(cause)
      ? t(`unitClose.decisionIntelligence.causes.${cause}`)
      : cause;

  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium">{problemCase.clo_title}</span>
        {problemCase.blooms_level && (
          <Badge variant="outline" className="text-[10px]">
            {problemCase.blooms_level}
          </Badge>
        )}
        <span
          className="ms-auto text-sm font-medium"
          style={{ color: getAttainmentColor(problemCase.course_avg) }}
        >
          {Math.round(problemCase.course_avg)}%
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1">
          {t("unitClose.decisionIntelligence.dominantCause")}:
          <Badge variant="outline" className="text-[10px]">
            {causeLabel(problemCase.dominant_cause)}
          </Badge>
        </span>
        <span>
          {t("unitClose.decisionIntelligence.confidence")}:{" "}
          {Math.round(problemCase.confidence * 100)}%
        </span>
        <span className="inline-flex items-center gap-1">
          <Users className="h-3 w-3 text-slate-400" />
          {t("unitClose.decisionIntelligence.studentsAssessed", {
            n: problemCase.students_assessed,
          })}
        </span>
        {strugglingCount > 0 && (
          <span>
            {t("unitClose.decisionIntelligence.studentsBelowTarget", {
              n: strugglingCount,
            })}
          </span>
        )}
      </div>

      {problemCase.problem_types.length > 1 && (
        <div className="mt-2 flex flex-wrap items-center gap-1">
          <span className="text-xs text-slate-500">
            {t("unitClose.decisionIntelligence.signals")}:
          </span>
          {problemCase.problem_types.map((problemType) => (
            <Badge key={problemType} variant="outline" className="text-[10px]">
              {causeLabel(problemType)}
            </Badge>
          ))}
        </div>
      )}

      {problemCase.evidence.length > 0 && (
        <div className="mt-2">
          <p className="text-xs font-medium text-slate-500">
            {t("unitClose.decisionIntelligence.evidence")}
          </p>
          <ul className="mt-1 space-y-1">
            {problemCase.evidence.map((item, index) => {
              const source =
                typeof item.source === "string"
                  ? item.source
                  : "outcome_attainment";
              return (
                <li
                  key={index}
                  className="flex items-center gap-1 text-xs text-slate-500"
                >
                  <FileSearch className="h-3 w-3 shrink-0 text-slate-400" />
                  <Badge variant="outline" className="text-[10px]">
                    {source}
                  </Badge>
                  <span>{describeEvidence(item)}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function DecisionIntelligenceSection({
  courseId,
}: {
  courseId: string;
}) {
  const { t } = useTranslation("coordinator");
  const { t: tCommon } = useTranslation("common");
  const { data, isLoading, isError } = useProblemClassification(courseId);

  const header = (
    <CardTitle className="flex items-center gap-2 text-base">
      <BrainCircuit className="h-4 w-4 text-indigo-600" />
      {t("unitClose.decisionIntelligence.title")}
    </CardTitle>
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader>{header}</CardHeader>
        <CardContent>
          <div className="h-24 animate-pulse rounded bg-slate-100" />
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardHeader>{header}</CardHeader>
        <CardContent>
          <p className="text-sm text-red-600">{tCommon("errors.generic")}</p>
        </CardContent>
      </Card>
    );
  }

  const cases = data?.cases ?? [];
  // The engine's no-data branch returns { course_id, cases: [], message }
  // without course_avg — treat a missing course_avg as "no attainment yet".
  const hasAttainment = data?.course_avg != null;

  return (
    <Card>
      <CardHeader>
        {header}
        <p className="text-sm text-slate-500">
          {t("unitClose.decisionIntelligence.subtitle")}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasAttainment && cases.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">
            {t("unitClose.decisionIntelligence.noData")}
          </p>
        ) : cases.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">
            {t("unitClose.decisionIntelligence.noCases")}
          </p>
        ) : (
          <>
            <div className="flex flex-wrap gap-4 text-sm">
              <span>
                {t("unitClose.decisionIntelligence.courseAvg")}:{" "}
                <span
                  className="font-medium"
                  style={{
                    color: getAttainmentColor(data?.course_avg ?? 0),
                  }}
                >
                  {Math.round(data?.course_avg ?? 0)}%
                </span>
              </span>
              <span>
                {t("unitClose.decisionIntelligence.sectionSpread")}:{" "}
                <span className="font-medium">
                  {Math.round(data?.section_spread ?? 0)}
                </span>
              </span>
              <span>
                {t("unitClose.decisionIntelligence.caseCount", {
                  n: cases.length,
                })}
              </span>
            </div>
            {cases.map((problemCase) => (
              <ProblemCaseCard
                key={problemCase.clo_id}
                problemCase={problemCase}
              />
            ))}
          </>
        )}
      </CardContent>
    </Card>
  );
}
