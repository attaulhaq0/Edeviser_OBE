// Feature: Parent digital-twin surface (Wave D parent mount).
//
// Hosted under the "twin-summary" surface on /parent routes. Unlike the
// student host (self-only read), a parent reads their VERIFIED linked
// children's twin rows through the parent-scoped RLS chain
// (student_learning_states_parent_read + parent_has_verified_link).
// Fail-closed: per-row parsing drops malformed snapshots; empty/error states
// render calm notices, never fabricated numbers.

import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shimmer } from "@/design-system";
import type { HostedSurfaceProps } from "@/ai/components/EdeviserAssistantPanel";
import { LearningStateSummaryView } from "@/ai/components/LearningStateSummary";
import { useParentChildrenLearningStates } from "@/ai/hooks/useParentChildrenLearningStates";
import { cn } from "@/lib/utils";

export interface ParentTwinSummaryProps extends HostedSurfaceProps {
  readonly className?: string;
}

const ParentTwinSummary = ({ className }: ParentTwinSummaryProps) => {
  const { t } = useTranslation("ai");
  const { data, isLoading, isError } = useParentChildrenLearningStates();

  return (
    <Card className={cn("border-slate-200/60 bg-white/80", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-slate-900">
          {t("parentTwin.title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="space-y-2" aria-hidden="true">
            <Shimmer className="h-16 rounded-lg" />
          </div>
        ) : isError ? (
          <p className="py-2 text-xs text-slate-500">
            {t("parentTwin.unavailable")}
          </p>
        ) : !data || data.length === 0 ? (
          <p className="py-2 text-xs text-slate-500">{t("parentTwin.empty")}</p>
        ) : (
          data.map(({ studentId, state }) => (
            <div key={studentId}>
              {state ? (
                <LearningStateSummaryView
                  state={{ isPending: false, isError: false, data: state }}
                  className="border-slate-100"
                />
              ) : (
                <p className="rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2 text-xs text-slate-500">
                  {t("parentTwin.childEmpty")}
                </p>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};

export default ParentTwinSummary;
