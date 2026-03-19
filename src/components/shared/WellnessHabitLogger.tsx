import { useState } from 'react';
import { Brain, Droplets, Dumbbell, Moon, Check } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { WellnessHabitType, WellnessHabitLog } from '@/types/habits';

export interface WellnessHabitLoggerProps {
  enabledHabits: WellnessHabitType[];
  todayLogs: WellnessHabitLog[];
  onLog: (type: WellnessHabitType, value?: number) => void;
}

const HABIT_CONFIG: Record<
  WellnessHabitType,
  { label: string; description: string; unit: string; icon: typeof Brain }
> = {
  meditation: {
    label: 'Meditation',
    description: '5+ minute session',
    unit: 'minutes',
    icon: Brain,
  },
  hydration: {
    label: 'Hydration',
    description: '8 glasses of water',
    unit: 'glasses',
    icon: Droplets,
  },
  exercise: {
    label: 'Exercise',
    description: '30+ minute activity',
    unit: 'minutes',
    icon: Dumbbell,
  },
  sleep: {
    label: 'Sleep',
    description: '7+ hours logged',
    unit: 'hours',
    icon: Moon,
  },
};

const WellnessHabitLogger = ({
  enabledHabits,
  todayLogs,
  onLog,
}: WellnessHabitLoggerProps) => {
  const [values, setValues] = useState<Partial<Record<WellnessHabitType, string>>>({});

  const isLogged = (type: WellnessHabitType): boolean =>
    todayLogs.some((log) => log.wellnessType === type);

  const handleToggle = (type: WellnessHabitType) => {
    if (isLogged(type)) return;
    const raw = values[type];
    const numericValue = raw ? parseFloat(raw) : undefined;
    onLog(type, numericValue && !isNaN(numericValue) ? numericValue : undefined);
  };

  const handleValueChange = (type: WellnessHabitType, val: string) => {
    setValues((prev) => ({ ...prev, [type]: val }));
  };

  if (enabledHabits.length === 0) return null;

  return (
    <div data-testid="wellness-habit-logger" className="space-y-3">
      <h3 className="text-sm font-bold tracking-wide uppercase text-gray-500">
        Wellness
      </h3>
      <div className="space-y-2">
        {enabledHabits.map((type) => {
          const config = HABIT_CONFIG[type];
          const Icon = config.icon;
          const logged = isLogged(type);

          return (
            <div
              key={type}
              data-testid={`wellness-habit-${type}`}
              className={cn(
                'flex items-center gap-3 rounded-xl border bg-white p-3 shadow-sm transition-colors',
                logged && 'bg-green-50 border-green-200',
              )}
            >
              <div
                className={cn(
                  'p-2 rounded-lg',
                  logged ? 'bg-green-100' : 'bg-slate-50',
                )}
              >
                <Icon
                  className={cn(
                    'h-4 w-4',
                    logged ? 'text-green-600' : 'text-slate-500',
                  )}
                />
              </div>

              <div className="flex-1 min-w-0">
                <Label className="text-sm font-medium">{config.label}</Label>
                <p className="text-xs text-gray-500">{config.description}</p>
              </div>

              <div className="flex items-center gap-2">
                <Input
                  data-testid={`wellness-value-${type}`}
                  type="number"
                  min={0}
                  placeholder={config.unit}
                  value={values[type] ?? ''}
                  onChange={(e) => handleValueChange(type, e.target.value)}
                  disabled={logged}
                  className="w-20 h-8 text-xs"
                  aria-label={`${config.label} value in ${config.unit}`}
                />

                {logged ? (
                  <div
                    data-testid={`wellness-check-${type}`}
                    className="flex items-center justify-center h-5 w-9"
                    aria-label={`${config.label} completed`}
                  >
                    <Check className="h-5 w-5 text-green-600" />
                  </div>
                ) : (
                  <Switch
                    data-testid={`wellness-toggle-${type}`}
                    checked={false}
                    onCheckedChange={() => handleToggle(type)}
                    aria-label={`Log ${config.label}`}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WellnessHabitLogger;
