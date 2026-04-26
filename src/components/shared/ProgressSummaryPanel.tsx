import { Card } from '@/components/ui/card';
import { Clock, CheckCircle2, ListChecks, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WeeklyProgressData, GoalProgress } from '@/types/planner';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ProgressSummaryPanelProps {
  summary: WeeklyProgressData;
  goals: GoalProgress[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const formatHours = (minutes: number): string => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
};

const goalTypeLabels: Record<string, string> = {
  study_hours: 'Study Hours',
  sessions_completed: 'Sessions',
  tasks_completed: 'Tasks',
};

const goalTypeUnits: Record<string, string> = {
  study_hours: 'hours',
  sessions_completed: 'sessions',
  tasks_completed: 'tasks',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const ProgressSummaryPanel = ({ summary, goals }: ProgressSummaryPanelProps) => {
  const kpis = [
    {
      icon: Clock,
      label: 'Study Time',
      value: formatHours(summary.totalStudyMinutes),
    },
    {
      icon: CheckCircle2,
      label: 'Sessions',
      value: String(summary.sessionsCompleted),
    },
    {
      icon: ListChecks,
      label: 'Tasks Done',
      value: String(summary.tasksCompleted),
    },
  ];

  return (
    <div className="space-y-6" data-testid="progress-summary-panel">
      {/* KPI Row */}
      <div className="grid grid-cols-3 gap-4">
        {kpis.map(({ icon: Icon, label, value }) => (
          <Card key={label} className="bg-white border-0 shadow-md rounded-xl p-4 group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black tracking-widest uppercase text-gray-500">
                  {label}
                </p>
                <p className="text-2xl font-black mt-1">{value}</p>
              </div>
              <div className="p-2 rounded-lg bg-blue-50 group-hover:scale-110 transition-transform">
                <Icon className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Goal Progress */}
      {goals.length > 0 && (
        <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
          <div
            className="px-6 py-4 flex items-center gap-2"
            style={{
              background: 'linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)',
            }}
          >
            <Target className="h-5 w-5 text-white" />
            <h2 className="text-lg font-bold tracking-tight text-white">Goal Progress</h2>
          </div>
          <div className="p-6 space-y-4">
            {goals.map((gp) => (
              <div key={gp.goal.id} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">
                    {goalTypeLabels[gp.goal.goalType] ?? gp.goal.goalType}
                  </span>
                  <span
                    className={cn(
                      'text-xs font-semibold',
                      gp.isMet ? 'text-green-600' : 'text-gray-500',
                    )}
                  >
                    {gp.isMet ? '✓ Met' : `${gp.currentValue} / ${gp.goal.targetValue} ${goalTypeUnits[gp.goal.goalType] ?? ''}`}
                  </span>
                </div>
                <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-500',
                      gp.isMet ? 'bg-green-500' : 'bg-blue-500',
                    )}
                    style={{ width: `${Math.min(gp.percentage, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

export default ProgressSummaryPanel;
