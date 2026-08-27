// =============================================================================
// OutcomeAlignmentSummary — student focus areas (alignment-summary host)
// =============================================================================
// Feature: Outcome focus UX (frontend-plan.md; tasks 3.1 — Wave D4).
//
// Hosted under EdeviserAssistantPanel's "alignment-summary" surface. Renders
// the student's lowest-attainment COURSE outcomes (CLOs), ranked weakest-first
// by the pure selector in @/lib/outcomeFocus, under an explicit DERIVED label.
//
// Scope honesty (Digital Twin guardrail, .clinerules/08-intelligence-layer):
// the numbers shown are CLO attainment evidence ONLY and are captioned as
// such in-UI. PLO/ILO contribution chains are a planned follow-up and are
// deliberately NOT displayed or implied here until that data lands. Data comes
// from the existing useCLOProgress hook (RLS-scoped; no new backend calls).

import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Shimmer } from "@/design-system";
import type { HostedSurfaceProps } from "@/ai/components/EdeviserAssistantPanel";
import { useAuth } from "@/hooks/useAuth";
import { useCLOProgress } from "@/hooks/useCLOProgress";
import { selectWeakestOutcomes } from "@/lib/outcomeFocus";

/** Renders the student's weakest rated CLOs across their courses, ascending. */
const OutcomeAlignmentSummary = ({ row: _row }: HostedSurfaceProps) => {
  void _row; // HostedSurfaceProps contract; caller resolves its own data.
  const { t } = useTranslation("ai");
  const { user } = useAuth();
  const studentId = user?.id;
  const progress = useCLOProgress(studentId);

  const weakest = useMemo(
    () => selectWeakestOutcomes(progress.data ?? []),
    [progress.data]
  );

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
        <Badge
          variant="outline"
          className="text-[10px] font-black tracking-wider"
        >
          {t("alignment.derived")}
        </Badge>
      </div>
      {/* Provenance caption: names exactly which evidence backs these numbers
          (CLO attainment) so the surface can never be read as PLO/ILO mastery. */}
      <p className="text-[11px] leading-snug text-slate-500">
        {t("alignment.caption")}
      </p>

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
                {Math.round(entry.percent)}%
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default OutcomeAlignmentSummary;
