// =============================================================================
// DailyProgressSummary — 3 KPI cards (study minutes, tasks completed,
// sessions completed) using project KPI card pattern
// =============================================================================

import { Card } from "@/components/ui/card";
import { Clock, CheckCircle2, BookOpen, type LucideIcon } from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

interface DailyProgressSummaryProps {
  studyMinutes: number;
  tasksCompleted: number;
  sessionsCompleted: number;
}

// ─── KPI Card ───────────────────────────────────────────────────────────────

interface KPICardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  accent: string;
  iconColor: string;
}

const KPICard = ({
  icon: Icon,
  label,
  value,
  accent,
  iconColor,
}: KPICardProps) => (
  <Card className="bg-white border-0 shadow-md rounded-xl p-4 group">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-[10px] font-black tracking-widest uppercase text-gray-500">
          {label}
        </p>
        <p className="text-2xl font-black mt-1">{value}</p>
      </div>
      <div
        className={`p-2 rounded-lg ${accent} group-hover:scale-110 transition-transform`}
      >
        <Icon className={`h-5 w-5 ${iconColor}`} />
      </div>
    </div>
  </Card>
);

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatStudyTime(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

// ─── Main Component ─────────────────────────────────────────────────────────

const DailyProgressSummary = ({
  studyMinutes,
  tasksCompleted,
  sessionsCompleted,
}: DailyProgressSummaryProps) => (
  <div className="grid grid-cols-3 gap-4">
    <KPICard
      icon={Clock}
      label="Study Time"
      value={formatStudyTime(studyMinutes)}
      accent="bg-blue-50"
      iconColor="text-blue-600"
    />
    <KPICard
      icon={CheckCircle2}
      label="Tasks Done"
      value={String(tasksCompleted)}
      accent="bg-green-50"
      iconColor="text-green-600"
    />
    <KPICard
      icon={BookOpen}
      label="Sessions"
      value={String(sessionsCompleted)}
      accent="bg-amber-50"
      iconColor="text-amber-600"
    />
  </div>
);

export default DailyProgressSummary;
export type { DailyProgressSummaryProps };
