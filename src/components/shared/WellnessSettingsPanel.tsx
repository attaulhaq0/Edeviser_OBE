import { Brain, Droplets, Dumbbell, Moon, Eye } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { WellnessHabitType } from '@/types/habits';

export interface WellnessSettingsPanelProps {
  enabledHabits: WellnessHabitType[];
  parentVisibility: boolean;
  onToggleHabit: (type: WellnessHabitType, enabled: boolean) => void;
  onToggleParentVisibility: (visible: boolean) => void;
}

const WELLNESS_HABITS: {
  type: WellnessHabitType;
  label: string;
  description: string;
  icon: typeof Brain;
}[] = [
  {
    type: 'meditation',
    label: 'Meditation',
    description: 'Track daily meditation sessions (5+ minutes)',
    icon: Brain,
  },
  {
    type: 'hydration',
    label: 'Hydration',
    description: 'Track daily water intake (8 glasses)',
    icon: Droplets,
  },
  {
    type: 'exercise',
    label: 'Exercise',
    description: 'Track daily physical activity (30+ minutes)',
    icon: Dumbbell,
  },
  {
    type: 'sleep',
    label: 'Sleep',
    description: 'Track nightly sleep duration (7+ hours)',
    icon: Moon,
  },
];

const WellnessSettingsPanel = ({
  enabledHabits,
  parentVisibility,
  onToggleHabit,
  onToggleParentVisibility,
}: WellnessSettingsPanelProps) => {
  return (
    <div data-testid="wellness-settings-panel" className="space-y-4">
      <h3 className="text-sm font-bold tracking-wide uppercase text-gray-500">
        Wellness Preferences
      </h3>

      <div className="space-y-2">
        {WELLNESS_HABITS.map(({ type, label, description, icon: Icon }) => {
          const enabled = enabledHabits.includes(type);
          return (
            <div
              key={type}
              data-testid={`wellness-setting-${type}`}
              className={cn(
                'flex items-center gap-3 rounded-xl border bg-white p-3 shadow-sm transition-colors',
                enabled && 'border-blue-200 bg-blue-50/30',
              )}
            >
              <div
                className={cn(
                  'p-2 rounded-lg',
                  enabled ? 'bg-blue-100' : 'bg-slate-50',
                )}
              >
                <Icon
                  className={cn(
                    'h-4 w-4',
                    enabled ? 'text-blue-600' : 'text-slate-500',
                  )}
                />
              </div>

              <div className="flex-1 min-w-0">
                <Label className="text-sm font-medium">{label}</Label>
                <p className="text-xs text-gray-500">{description}</p>
              </div>

              <Switch
                data-testid={`wellness-setting-toggle-${type}`}
                checked={enabled}
                onCheckedChange={(checked) => onToggleHabit(type, checked)}
                aria-label={`Enable ${label}`}
              />
            </div>
          );
        })}
      </div>

      <div
        data-testid="wellness-parent-visibility"
        className="flex items-center gap-3 rounded-xl border bg-white p-3 shadow-sm"
      >
        <div className="p-2 rounded-lg bg-slate-50">
          <Eye className="h-4 w-4 text-slate-500" />
        </div>
        <div className="flex-1 min-w-0">
          <Label className="text-sm font-medium">Parent Visibility</Label>
          <p className="text-xs text-gray-500">
            Allow parents to see wellness data
          </p>
        </div>
        <Switch
          data-testid="wellness-parent-visibility-toggle"
          checked={parentVisibility}
          onCheckedChange={onToggleParentVisibility}
          aria-label="Allow parents to see wellness data"
        />
      </div>
    </div>
  );
};

export default WellnessSettingsPanel;
