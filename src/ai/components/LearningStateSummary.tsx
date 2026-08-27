// =============================================================================
// LearningStateSummary — digital-twin snapshot surface (twin-summary host)
// =============================================================================
// Feature: Digital Twin frontend (frontend-plan.md; tasks 3.1/4.x — Wave D4).
//
// Hosted under EdeviserAssistantPanel's "twin-summary" surface for roles whose
// capability row allows it. Reads the student's OWN digital-twin row via
// useLearningState (RLS-scoped to auth.uid()). Fail-closed: loading/error/no-
// snapshot states render a calm notice, never a crash or fabricated numbers.

import { Activity, Flame, ShieldAlert } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Shimmer } from "@/design-system";
import type { HostedSurfaceProps } from "@/ai/components/EdeviserAssistantPanel";
import { useLearningState } from "@/ai/hooks/useLearningState";
import { useAuth } from "@/hooks/useAuth";

const RISK_TONE: Record<string, string> = {
  none: "bg-slate-100 text-slate-600",
  attention: "bg-amber-100 text-amber-700",
  urgent: "bg-red-100 text-red-700",
};

const LearningStateSummary = ({ row: _row }: HostedSurfaceProps) => {
  void _row; // HostedSurfaceProps contract; this surface resolves its own data.
  const { t } = useTranslation("ai");
  const { user } = useAuth();
  const studentId = user?.id;
  const state = useLearningState(studentId);

  if (state.isPending) {
    return (
      <div className="py-3">
        <Shimmer className="h-16 rounded-lg" />
      </div>
    );
  }

  if (state.isError) {
    return (
      <div className="py-3" role="note">
        <p className="text-xs font-semibold text-red-700">
          {t("learningState.unavailable")}
        </p>
      </div>
    );
  }

  const snapshot = state.data;
  if (!snapshot) {
    return (
      <div className="py-3" role="status">
        <p className="text-xs text-gray-500">{t("learningState.empty")}</p>
      </div>
    );
  }

  const masteryPercent = snapshot.mastery?.percent;
  const trend = snapshot.mastery?.trend;
  const severity = snapshot.risk_signals?.severity;
  const riskNotice = snapshot.risk_signals?.notice;
  const streak = snapshot.habits?.streak;
  const consistency = snapshot.habits?.consistency;

  return (
    <div className="space-y-2.5 py-3">
      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
        <Activity className="h-3.5 w-3.5" aria-hidden="true" />
        {t("learningState.title")}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {typeof masteryPercent === "number" && (
          <Badge variant="outline" className="text-xs font-bold">
            {t("learningState.mastery", { percent: Math.round(masteryPercent) })}
          </Badge>
        )}
        {trend && (
          <Badge variant="outline" className="text-xs font-bold">
            {t(`learningState.trend.${trend}`)}
          </Badge>
        )}
        {typeof streak === "number" && (
          <span className="flex items-center gap-1 text-xs font-semibold text-gray-600">
            <Flame className="h-3.5 w-3.5 text-orange-500" aria-hidden="true" />
            {t("learningState.streak", { count: streak })}
          </span>
        )}
        {typeof consistency === "number" && (
          <span className="flex items-center gap-1 text-xs font-semibold text-gray-600">
            <Activity className="h-3.5 w-3.5" aria-hidden="true" />
            {t("learningState.consistency", { percent: Math.round(consistency) })}
          </span>
        )}
      </div>

      {severity && severity !== "none" && (
        <div
          className={`flex items-start gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold ${
            RISK_TONE[severity] ?? RISK_TONE.none
          }`}
        >
          <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{riskNotice ?? t(`learningState.risk.${severity}`)}</span>
        </div>
      )}
    </div>
  );
};

export default LearningStateSummary;