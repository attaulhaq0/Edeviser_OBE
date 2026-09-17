// InterventionLifecycleSection — 7.4(d) intervention lifecycle (coordinator)
// =============================================================================
// Read-only lifecycle view of the official learning_interventions records for
// the Unit-Close course. Statuses (draft → proposed → approved → active →
// completed | cancelled) are owned by the intervention generation/evaluation
// machinery — this surface renders them and never writes.
// =============================================================================

import { ClipboardList, Users } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  useLearningInterventions,
  type LearningInterventionRow,
} from "@/hooks/useLearningInterventions";

const STATUS_BADGE_CLASS: Record<string, string> = {
  draft: "border-slate-300 text-slate-500",
  proposed: "border-sky-300 text-sky-700",
  approved: "border-indigo-300 text-indigo-700",
  active: "border-emerald-300 text-emerald-700",
  completed: "border-emerald-500 text-emerald-700",
  cancelled: "border-rose-300 text-rose-700",
  RECOMMENDED: "border-amber-300 text-amber-700",
  APPROVED: "border-indigo-300 text-indigo-700",
  ASSIGNED: "border-blue-300 text-blue-700",
  STARTED: "border-teal-300 text-teal-700",
  COMPLETED: "border-emerald-500 text-emerald-700",
  MEASURED: "border-purple-300 text-purple-700",
  EFFECTIVE: "border-green-400 text-green-700",
  PARTIALLY_EFFECTIVE: "border-lime-300 text-lime-700",
  INEFFECTIVE: "border-red-300 text-red-700",
  INCONCLUSIVE: "border-gray-300 text-gray-700",
  CANCELLED: "border-rose-300 text-rose-700",
};

function InterventionRow({
  intervention,
}: {
  intervention: LearningInterventionRow;
}) {
  const { t } = useTranslation("coordinator");
  const created = intervention.created_at
    ? intervention.created_at.slice(0, 10)
    : "—";
  const plan =
    typeof intervention.payload.plan === "string"
      ? intervention.payload.plan
      : null;

  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Users className="h-3 w-3 shrink-0 text-slate-400" />
        <span className="font-medium">
          {intervention.student_name ?? intervention.student_id}
        </span>
        <Badge
          variant="outline"
          className={`text-[10px] ${STATUS_BADGE_CLASS[intervention.status]}`}
        >
          {t(`unitClose.interventions.status.${intervention.status}`)}
        </Badge>
        <span className="ms-auto text-xs text-slate-400">{created}</span>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <Badge variant="outline" className="text-[10px]">
          {intervention.intervention_type}
        </Badge>
        <span>{intervention.source}</span>
      </div>
      {plan && (
        <p className="mt-2 whitespace-pre-wrap text-xs text-slate-500">
          {plan}
        </p>
      )}
    </div>
  );
}

export default function InterventionLifecycleSection({
  courseId,
}: {
  courseId: string;
}) {
  const { t } = useTranslation("coordinator");
  const { data, isLoading, isError } = useLearningInterventions(courseId);

  const interventions = data ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ClipboardList className="h-4 w-4 text-emerald-600" />
          {t("unitClose.interventions.title")}
        </CardTitle>
        <p className="text-sm text-slate-500">
          {t("unitClose.interventions.subtitle")}
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="h-16 animate-pulse rounded bg-slate-100" />
        ) : isError ? (
          <p className="text-sm text-red-600">
            {t("unitClose.interventions.error")}
          </p>
        ) : interventions.length === 0 ? (
          <p className="py-4 text-center text-sm text-slate-400">
            {t("unitClose.interventions.empty")}
          </p>
        ) : (
          interventions.map((intervention) => (
            <InterventionRow
              key={intervention.id}
              intervention={intervention}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}
