import { cn } from '@/lib/utils';
import type { CompletedHabit } from '@/types/habits';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface HeatmapTooltipProps {
  date: string;
  habits: CompletedHabit[];
  xpEarned: number;
  streakActive: boolean;
  position?: { x: number; y: number };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const HABIT_LABELS: Record<string, string> = {
  login: 'Login',
  submit: 'Submit',
  journal: 'Journal',
  read: 'Read',
  meditation: 'Meditation',
  hydration: 'Hydration',
  exercise: 'Exercise',
  sleep: 'Sleep',
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const HeatmapTooltip = ({
  date,
  habits,
  xpEarned,
  streakActive,
  position,
}: HeatmapTooltipProps) => {
  const academic = habits.filter((h) => h.category === 'academic');
  const wellness = habits.filter((h) => h.category === 'wellness');
  const isEmpty = habits.length === 0;

  return (
    <div
      className={cn(
        'bg-white border border-slate-200 shadow-lg rounded-xl p-4 min-w-[220px] max-w-[280px] z-50',
        position ? 'absolute' : 'relative',
      )}
      style={
        position
          ? { left: position.x, top: position.y }
          : undefined
      }
      role="tooltip"
      data-testid="heatmap-tooltip"
    >
      <p className="text-sm font-semibold text-gray-900" data-testid="tooltip-date">
        {formatDate(date)}
      </p>

      {isEmpty ? (
        <p className="text-sm text-gray-500 mt-2" data-testid="tooltip-empty">
          No habits completed
        </p>
      ) : (
        <>
          {academic.length > 0 && (
            <div className="mt-2" data-testid="tooltip-academic-section">
              <p className="text-[10px] font-black tracking-widest uppercase text-gray-400">
                Academic
              </p>
              <ul className="mt-1 space-y-0.5">
                {academic.map((h) => (
                  <li
                    key={h.type}
                    className="flex items-center gap-1.5 text-sm text-gray-700"
                    data-testid={`tooltip-habit-${h.type}`}
                  >
                    <span className="text-green-500">✓</span>
                    {HABIT_LABELS[h.type] ?? h.type}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {wellness.length > 0 && (
            <div className="mt-2" data-testid="tooltip-wellness-section">
              <p className="text-[10px] font-black tracking-widest uppercase text-gray-400">
                Wellness
              </p>
              <ul className="mt-1 space-y-0.5">
                {wellness.map((h) => (
                  <li
                    key={h.type}
                    className="flex items-center gap-1.5 text-sm text-gray-700"
                    data-testid={`tooltip-habit-${h.type}`}
                  >
                    <span className="text-green-500">✓</span>
                    {HABIT_LABELS[h.type] ?? h.type}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2">
            <span className="text-xs text-gray-500" data-testid="tooltip-xp">
              {xpEarned} XP earned
            </span>
            <span
              className="text-xs font-medium"
              data-testid="tooltip-streak"
            >
              {streakActive ? '🔥 Streak active' : 'Streak broken'}
            </span>
          </div>
        </>
      )}
    </div>
  );
};

export default HeatmapTooltip;
