// UnitCloseReviewPage — coordinator "moment of value" (task 7.7)
// Composes the section × CLO attainment matrix, weakest-CLO drill, and
// coverage flags into one review screen.

import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AlertTriangle, BookOpen, Users } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useUnitCloseReview,
  type UnitCloseCLO,
  type UnitCloseMatrixEntry,
} from "@/hooks/useUnitCloseReview";
import DecisionIntelligenceSection from "./DecisionIntelligenceSection";
import InterventionLifecycleSection from "./InterventionLifecycleSection";
import { getAttainmentColor } from "@/lib/attainmentClassifier";

const belowTargetCell = (v: number | null) => {
  if (v === null) return <span className="text-slate-300">—</span>;
  return (
    <span className="font-medium" style={{ color: getAttainmentColor(v) }}>
      {Math.round(v)}%
    </span>
  );
};

export default function UnitCloseReviewPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const { t } = useTranslation("common");
  const { data: review, isLoading, isError } = useUnitCloseReview(courseId);

  const sortedClos = useMemo(
    () =>
      (review?.clos ?? [])
        .slice()
        .sort((a, b) => (a.course_avg ?? 100) - (b.course_avg ?? 100)),
    [review?.clos]
  );

  const matrixLookup = useMemo(() => {
    const map = new Map<string, UnitCloseMatrixEntry>();
    for (const m of review?.matrix ?? []) {
      map.set(`${m.clo_id}:${m.section_id}`, m);
    }
    return map;
  }, [review?.matrix]);

  if (!courseId) return null;

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="h-8 w-64 animate-pulse rounded bg-slate-200" />
        <div className="h-64 animate-pulse rounded bg-slate-100" />
      </div>
    );
  }

  if (isError || !review) {
    return (
      <div className="space-y-6 p-6">
        <p className="text-sm text-red-600">{t("errors.generic")}</p>
      </div>
    );
  }

  const sections = review.sections ?? [];
  const clos = sortedClos;
  const uncoveredCount = clos.filter((c) => !c.has_assessment).length;

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold tracking-tight">Unit-Close Review</h1>

      {uncoveredCount > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <span>
            {uncoveredCount} outcome{uncoveredCount > 1 ? "s" : ""} in this
            course have no linked assessments yet
          </span>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpen className="h-4 w-4 text-sky-600" />
            Section × CLO Attainment Matrix
          </CardTitle>
        </CardHeader>
        <CardContent>
          {clos.length === 0 || sections.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">
              No outcome or section data available for this course.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px]">Outcome</TableHead>
                    <TableHead>Bloom&apos;s</TableHead>
                    {sections.map((sec) => (
                      <TableHead key={sec.section_id} className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Users className="h-3 w-3 text-slate-400" />
                          {sec.section_code}
                        </div>
                      </TableHead>
                    ))}
                    <TableHead className="text-center">Course Avg</TableHead>
                    <TableHead className="text-center">Below Target</TableHead>
                    <TableHead className="text-center">Assessed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clos.map((clo: UnitCloseCLO) => (
                    <TableRow key={clo.clo_id}>
                      <TableCell className="font-medium">
                        {clo.clo_title}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">
                          {clo.blooms_level ?? "—"}
                        </Badge>
                      </TableCell>
                      {sections.map((sec) => {
                        const entry = matrixLookup.get(
                          `${clo.clo_id}:${sec.section_id}`
                        );
                        return (
                          <TableCell
                            key={sec.section_id}
                            className="text-center"
                          >
                            {belowTargetCell(entry?.avg_attainment ?? null)}
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-center">
                        {belowTargetCell(clo.course_avg)}
                      </TableCell>
                      <TableCell className="text-center">
                        {clo.total_below_target ?? 0}
                      </TableCell>
                      <TableCell className="text-center">
                        {clo.has_assessment ? "✓" : "⚠"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <DecisionIntelligenceSection courseId={courseId} />
      <InterventionLifecycleSection courseId={courseId} />
    </div>
  );
}
