import { Clock3 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { ProactiveContributingEvidence } from "@/hooks/useAtRiskPredictions";

interface AtRiskStudentRowProps {
  studentName: string;
  cloTitle: string;
  contributingEvidence: ProactiveContributingEvidence[];
  calculationVersion: string;
  triggerVersion: string;
  recommendedNextAction: string;
  triggeredAt: string;
}

const evidenceLabel = (evidence: ProactiveContributingEvidence): string =>
  evidence.key
    .split("_")
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ");

const AtRiskStudentRow = ({
  studentName,
  cloTitle,
  contributingEvidence,
  calculationVersion,
  triggerVersion,
  recommendedNextAction,
  triggeredAt,
}: AtRiskStudentRowProps) => (
  <div className="space-y-3 border-b border-slate-100 py-4 last:border-0">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-slate-900">{studentName}</p>
          <Badge
            variant="outline"
            className="border-amber-200 bg-amber-50 text-amber-700"
          >
            Needs Attention
          </Badge>
        </div>
        <p className="text-xs text-slate-600">CLO: {cloTitle}</p>
        <p className="text-xs leading-5 text-slate-500">
          Next: {recommendedNextAction}
        </p>
      </div>
      <Badge variant="secondary" className="shrink-0">
        Evidence only
      </Badge>
    </div>

    <div className="flex flex-wrap gap-1.5">
      {contributingEvidence.map((evidence) => (
        <Badge
          key={`${evidence.key}-${String(evidence.observedValue)}`}
          variant="outline"
          className="border-slate-200 bg-slate-50 text-[10px] text-slate-700"
          title={`${evidence.source}; trigger: ${evidence.threshold}`}
        >
          {evidenceLabel(evidence)}: {String(evidence.observedValue)}
        </Badge>
      ))}
    </div>

    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-400">
      <span className="inline-flex items-center gap-1">
        <Clock3 className="size-3" aria-hidden="true" />
        {new Date(triggeredAt).toLocaleString()}
      </span>
      <span>Calculation: {calculationVersion}</span>
      <span>Trigger: {triggerVersion}</span>
    </div>
  </div>
);

export default AtRiskStudentRow;
export type { AtRiskStudentRowProps };
