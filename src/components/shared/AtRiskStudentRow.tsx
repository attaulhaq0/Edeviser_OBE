// =============================================================================
// AtRiskStudentRow — Displays a single AI at-risk prediction row
// Validates: Requirements 47.3, 47.4
// =============================================================================

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Send, Loader2 } from "lucide-react";
import type { ContributingSignals } from "@/hooks/useAtRiskPredictions";

// ─── Types ───────────────────────────────────────────────────────────────────

interface AtRiskStudentRowProps {
  studentName: string;
  cloTitle: string;
  probabilityScore: number;
  contributingSignals: ContributingSignals;
  onSendNudge: () => void;
  isNudging: boolean;
}

// ─── Signal Helpers ──────────────────────────────────────────────────────────

const getSignalBadge = (label: string, value: string) => {
  const colorMap: Record<string, string> = {
    low: "bg-red-50 text-red-600 border-red-200",
    medium: "bg-yellow-50 text-yellow-600 border-yellow-200",
    high: "bg-green-50 text-green-600 border-green-200",
    early: "bg-green-50 text-green-600 border-green-200",
    on_time: "bg-blue-50 text-blue-600 border-blue-200",
    late: "bg-yellow-50 text-yellow-600 border-yellow-200",
    missed: "bg-red-50 text-red-600 border-red-200",
    improving: "bg-green-50 text-green-600 border-green-200",
    declining: "bg-red-50 text-red-600 border-red-200",
    stagnant: "bg-yellow-50 text-yellow-600 border-yellow-200",
  };

  return (
    <Badge
      key={`${label}-${value}`}
      variant="outline"
      className={`text-[10px] ${
        colorMap[value] ?? "bg-gray-50 text-gray-600 border-gray-200"
      }`}
    >
      {label}: {value.replace("_", " ")}
    </Badge>
  );
};

const getProbabilityColor = (score: number): string => {
  if (score >= 75) return "text-red-600 bg-red-50";
  if (score >= 50) return "text-yellow-600 bg-yellow-50";
  return "text-blue-600 bg-blue-50";
};

// ─── Component ───────────────────────────────────────────────────────────────

const AtRiskStudentRow = ({
  studentName,
  cloTitle,
  probabilityScore,
  contributingSignals,
  onSendNudge,
  isNudging,
}: AtRiskStudentRowProps) => {
  const probColor = getProbabilityColor(probabilityScore);

  return (
    <div className="flex items-start justify-between gap-3 py-3 border-b border-slate-100 last:border-0">
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium truncate">{studentName}</p>
          <Badge
            variant="outline"
            className={`text-xs font-bold border-0 shrink-0 ${probColor}`}
          >
            {Math.round(probabilityScore)}% risk
          </Badge>
        </div>
        <p className="text-xs text-gray-500 truncate" title={cloTitle}>
          CLO: {cloTitle}
        </p>
        <div className="flex flex-wrap items-center gap-1">
          {getSignalBadge("Login", contributingSignals.login_frequency)}
          {getSignalBadge(
            "Submissions",
            contributingSignals.submission_pattern
          )}
          {getSignalBadge("Trend", contributingSignals.attainment_trend)}
        </div>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="ms-2 shrink-0"
        onClick={onSendNudge}
        disabled={isNudging}
        aria-label={`Send nudge to ${studentName}`}
      >
        {isNudging ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
        Nudge
      </Button>
    </div>
  );
};

export default AtRiskStudentRow;
export type { AtRiskStudentRowProps };
