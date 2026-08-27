// =============================================================================
// OutcomeAlignmentSummary — student focus areas (alignment-summary host)
// =============================================================================
// Feature: Outcome focus UX (frontend-plan.md; tasks 3.1 — Wave D4).
//
// Hosted under EdeviserAssistantPanel's "alignment-summary" surface. Renders
// the student's lowest-attainment COURSE outcomes (CLOs), ranked weakest-first
// by the pure selector in @/lib/outcomeFocus, under an explicit DERIVED label.
// Each focus area also shows its mapped parent chain (PLO → ILO), resolved by
// @/hooks/useOutcomeParents over outcome_mappings (canonical source=parent /
// target=child direction; institution-scoped RLS reads — no agent round-trip).
//
// Scope honesty (Digital Twin guardrail, .clinerules/08-intelligence-layer):
// the numbers shown are CLO attainment evidence ONLY and are captioned as
// such in-UI; mapped PLO/ILO relationships are DERIVED alignment, never
// official attainment at those levels. Data comes from useCLOProgress +
// useOutcomeParents (both RLS-scoped).

import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Shimmer } from "@/design-system";
import type { HostedSurfaceProps } from "@/ai/components/EdeviserAssistantPanel";
import { useAuth } from "@/hooks/useAuth";
import { useCLOProgress } from "@/hooks/useCLOProgress";
import { useOutcomeParents } from "@/hooks/useOutcomeParents";
import { selectWeakestOutcomes } from "@/lib/outcomeFocus";

/** Renders the student's weakest rated CLOs across their courses, ascending. */
const OutcomeAlignmentSummary = ({ row: _row }: HostedSurfaceProps) => {
  void _row; // HostedSurfaceProps contract; caller resolves its own data.
  const { t } = useTranslation("ai");
  const { user } = useAuth();
  const studentId = user?.id;
  const { data, isPending, isError } = useCLOProgress(studentId);

  const weakest = useMemo(() => selectWeakestOutcomes(data ?? []), [data]);
  const cloIds = useMemo(() => weakest.map((entry) => entry.cloId), [weakest]);
  const parentsByClo = useOutcomeParents(cloIds);

  if (isPending) {
    return (
      <div className="py-3">
        <Shimmer className="h-16 rounded-lg" />
      </div>
    );
  }

  // Failed query: surface an explicit unavailable notice rather than silently
  // collapsing into the honest-empty state below (same contract as
  // LearningStateSummary's twin-summary host).
  if (isError) {
    return (
      <div className="py-3" role="note">
        <p className="text-xs font-semibold text-red-700">
          {t("alignment.unavailable")}
        </p>
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
          {weakest.map((entry) => {
            const parents = parentsByClo?.data?.[entry.cloId];
            return (
              <li key={entry.cloId} className="space-y-0.5">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="min-w-0 truncate font-medium text-slate-700">
                    {entry.title}
                  </span>
                  <span className="shrink-0 font-black text-slate-400">
                    {Math.round(entry.percent)}%
                  </span>
                </div>
                {/* Mapped parent chain — DERIVED alignment, never attainment at
                    the PLO/ILO level. Supplementary: a failed chain lookup
                    leaves the (honest) scores visible with no chain line. */}
                {parents && parents.plos.length > 0 && (
                  <p className="text-[10px] leading-snug text-slate-400">
                    <span className="font-semibold">
                      {t("alignment.plos")}:
                    </span>{" "}
                    {parents.plos.map((plo) => plo.title).join(", ")}
                    {parents.ilos.length > 0 && (
                      <>
                        {" "}
                        <span aria-hidden="true">·</span>{" "}
                        <span className="font-semibold">
                          {t("alignment.ilos")}:
                        </span>{" "}
                        {parents.ilos.map((ilo) => ilo.title).join(", ")}
                      </>
                    )}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default OutcomeAlignmentSummary;
