import { Bell } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { WellnessHabitType, WellnessReminderConfig } from '@/types/habits';

const HABIT_LABELS: Record<WellnessHabitType, string> = {
  meditation: 'Meditation',
  hydration: 'Hydration',
  exercise: 'Exercise',
  sleep: 'Sleep',
};

export interface WellnessReminderSettingsProps {
  reminders: WellnessReminderConfig[];
  onToggle: (habitType: WellnessHabitType, enabled: boolean) => void;
  onTimeChange: (habitType: WellnessHabitType, time: string) => void;
}

const WellnessReminderSettings = ({
  reminders,
  onToggle,
  onTimeChange,
}: WellnessReminderSettingsProps) => {
  if (reminders.length === 0) return null;

  return (
    <div data-testid="wellness-reminder-settings" className="space-y-3">
      <div className="flex items-center gap-2">
        <Bell className="h-4 w-4 text-gray-500" />
        <h4 className="text-sm font-bold tracking-wide uppercase text-gray-500">
          Reminders
        </h4>
      </div>

      <div className="space-y-2">
        {reminders.map((reminder) => (
          <div
            key={reminder.habitType}
            data-testid={`reminder-${reminder.habitType}`}
            className="flex items-center gap-3 rounded-xl border bg-white p-3 shadow-sm"
          >
            <div className="flex-1 min-w-0">
              <Label className="text-sm font-medium">
                {HABIT_LABELS[reminder.habitType]}
              </Label>
            </div>

            <Input
              data-testid={`reminder-time-${reminder.habitType}`}
              type="time"
              value={reminder.reminderTime ?? ''}
              onChange={(e) => onTimeChange(reminder.habitType, e.target.value)}
              disabled={!reminder.enabled}
              className={cn(
                'w-28 h-8 text-xs',
                !reminder.enabled && 'opacity-50',
              )}
              aria-label={`${HABIT_LABELS[reminder.habitType]} reminder time`}
            />

            <Switch
              data-testid={`reminder-toggle-${reminder.habitType}`}
              checked={reminder.enabled}
              onCheckedChange={(checked) => onToggle(reminder.habitType, checked)}
              aria-label={`Enable ${HABIT_LABELS[reminder.habitType]} reminder`}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default WellnessReminderSettings;
