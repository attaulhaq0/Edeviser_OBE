// =============================================================================
// OutcomeAlignmentSummary — derived CLO→PLO/ILO alignment surface
// =============================================================================
// Feature: Outcome alignment UX (frontend-plan.md; tasks 3.1 — Wave D4).
//
// Hosted under EdeviserAssistantPanel's "alignment-summary" surface. Renders
// the student's weakest CLOs in ranked order with a clear **DERIVED ALIGNMENT**
// label — this is derived from CLO attainment evidence only and is NEVER
// presented as official ILO/PLO mastery (see .clinerules/08-intelligence-layer:
// derived alignment is clearly labeled, never official attainment). Data comes
// from the existing useCLOProgress hook (RLS-scoped; no new backend calls).

import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Shimmer } from "@/design-system";
import type { HostedSurfaceProps } from "@/ai/components/EdeviserAssistantPanel";
import { useAuth } from "@/hooks/useAuth";
import { useCLOProgress } from "@/hooks/useCLOProgress";

/** Renders the weakest CLOs across the student's courses, ascending. */
const OutcomeAlignmentSummary = ({ row: _row }: HostedSurfaceProps) => {
  void _row; // HostedSurfaceProps contract; caller resolves its own data.
  const { t } = useTranslation("ai");
  const { user } = useAuth();
  const studentId = user?.id;
  const progress = useCLOProgress(studentId);

  const weakest = useMemo(() => {
    const flattened = (progress.data ?? []).flatMap((course) =>
      course.entries.map((entry) => ({
        cloId: entry.clo_id,
        title: entry.clo_title,
        courseName: entry.course_name,
        percent: entry.attainment_percent ?? null,
      })),
    );
    return flattened
      .filter((entry) => entry.percent !== null)
      // Weakest first (lowest attainment).
      .sort((a, b) => (a.percent ?? 0) - (b.percent ?? 0))
      .slice(0, 3);
  }, [progress.data]);

  if (progress.isPending) {
    return (
      <div className="py-3">
        <Shimmer className="h-16 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-2.5 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-xs font-bold text-slate-500">
          {t("alignment.title")}
        </p>
        <Badge variant="outline" className="text-[10px] font-black tracking-wider">
          {t("alignment.derived")}
        </Badge>
      </div>

      {weakest.length === 0 ? (
        <p className="text-xs text-gray-500">{t("alignment.empty")}</p>
      ) : (
        <ul className="space-y-1.5">
          {weakest.map((entry) => (
            <li
              key={entry.cloId}
              className="flex items-center justify-between gap-2 text-xs"
            >
              <span className="min-w-0 truncate font-medium text-slate-700">
                {entry.title}
              </span>
              <span className="shrink-0 font-black text-slate-400">
                {typeof entry.percent === "number"
                  ? `${Math.round(entry.percent)}%`
                  : "—"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default OutcomeAlignmentSummary;