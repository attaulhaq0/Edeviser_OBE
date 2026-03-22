import {
  Brain,
  Droplets,
  Dumbbell,
  Moon,
  LogIn,
  Send,
  BookOpen,
  BookMarked,
  type LucideIcon,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import CorrelationConfidenceBadge from '@/components/shared/CorrelationConfidenceBadge';
import type { CorrelationInsight, CorrelationInsightWithConfidence, HabitType } from '@/types/habits';

export interface CorrelationInsightCardProps {
  insight: CorrelationInsight | CorrelationInsightWithConfidence;
}

const HABIT_ICONS: Record<HabitType, LucideIcon> = {
  meditation: Brain,
  hydration: Droplets,
  exercise: Dumbbell,
  sleep: Moon,
  login: LogIn,
  submit: Send,
  journal: BookOpen,
  read: BookMarked,
};

const HABIT_COLORS: Record<HabitType, string> = {
  meditation: 'bg-purple-50 text-purple-600',
  hydration: 'bg-blue-50 text-blue-600',
  exercise: 'bg-green-50 text-green-600',
  sleep: 'bg-indigo-50 text-indigo-600',
  login: 'bg-teal-50 text-teal-600',
  submit: 'bg-amber-50 text-amber-600',
  journal: 'bg-rose-50 text-rose-600',
  read: 'bg-cyan-50 text-cyan-600',
};

const CorrelationInsightCard = ({ insight }: CorrelationInsightCardProps) => {
  const Icon = HABIT_ICONS[insight.habitType] ?? Brain;
  const colorClasses = HABIT_COLORS[insight.habitType] ?? 'bg-slate-50 text-slate-600';
  const strengthPercent = Math.round(insight.strength * 100);

  const hasConfidence =
    'confidenceLevel' in insight &&
    insight.confidenceLevel != null &&
    'dataPointCount' in insight;

  return (
    <Card
      className="bg-white border-0 shadow-sm rounded-xl p-4"
      data-testid={`correlation-insight-${insight.id}`}
    >
      <div className="flex items-start gap-3">
        <div className={cn('p-2 rounded-lg shrink-0', colorClasses)}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0 space-y-2">
          <p className="text-sm font-medium text-gray-800">{insight.description}</p>
          {hasConfidence && (
            <CorrelationConfidenceBadge
              level={(insight as CorrelationInsightWithConfidence).confidenceLevel}
              dataPointCount={(insight as CorrelationInsightWithConfidence).dataPointCount}
            />
          )}
          {/* Strength indicator */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold tracking-widest uppercase text-gray-400">
                Strength
              </span>
              <span className="text-xs font-semibold text-gray-600">{strengthPercent}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${strengthPercent}%`,
                  background: 'linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)',
                }}
                data-testid="strength-bar"
              />
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default CorrelationInsightCard;
