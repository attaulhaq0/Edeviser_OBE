import { Flame, Trophy, Calendar } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { HeatmapSummary } from '@/types/habits';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type HeatmapSummaryStatsProps = HeatmapSummary;

// ---------------------------------------------------------------------------
// Internal KPI Card
// ---------------------------------------------------------------------------

interface KPICardProps {
  icon: React.ElementType;
  label: string;
  value: number;
  iconColor: string;
  iconBg: string;
  testId: string;
}

const KPICard = ({ icon: Icon, label, value, iconColor, iconBg, testId }: KPICardProps) => (
  <Card
    className="bg-white border-0 shadow-md rounded-xl p-4 group"
    data-testid={testId}
  >
    <div className="flex items-center justify-between">
      <div>
        <p className="text-[10px] font-black tracking-widest uppercase text-gray-500">
          {label}
        </p>
        <p className="text-2xl font-black mt-1" data-testid={`${testId}-value`}>
          {value}
        </p>
      </div>
      <div
        className={cn(
          'p-2 rounded-lg group-hover:scale-110 transition-transform',
          iconBg,
        )}
      >
        <Icon className={cn('h-5 w-5', iconColor)} />
      </div>
    </div>
  </Card>
);

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const HeatmapSummaryStats = ({
  currentStreak,
  longestStreak,
  totalActiveDays,
}: HeatmapSummaryStatsProps) => (
  <div className="grid grid-cols-3 gap-4" data-testid="heatmap-summary-stats">
    <KPICard
      icon={Flame}
      label="Current Streak"
      value={currentStreak}
      iconColor="text-orange-500"
      iconBg="bg-orange-50"
      testId="kpi-current-streak"
    />
    <KPICard
      icon={Trophy}
      label="Longest Streak"
      value={longestStreak}
      iconColor="text-amber-500"
      iconBg="bg-amber-50"
      testId="kpi-longest-streak"
    />
    <KPICard
      icon={Calendar}
      label="Total Active Days"
      value={totalActiveDays}
      iconColor="text-blue-600"
      iconBg="bg-blue-50"
      testId="kpi-total-active-days"
    />
  </div>
);

export default HeatmapSummaryStats;
