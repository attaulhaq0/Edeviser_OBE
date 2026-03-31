// Task 145.6: Habit Difficulty Indicator component

import { Sprout, TreePine, Leaf } from 'lucide-react';

interface HabitDifficultyIndicatorProps {
  level: number;
  habitLevelStreak: number;
}

const levelConfig = [
  { icon: Leaf, label: 'Seedling', color: 'text-green-400', bg: 'bg-green-50' },
  { icon: Sprout, label: 'Sprout', color: 'text-green-500', bg: 'bg-green-50' },
  { icon: TreePine, label: 'Tree', color: 'text-green-700', bg: 'bg-green-100' },
];

const HabitDifficultyIndicator = ({ level, habitLevelStreak }: HabitDifficultyIndicatorProps) => {
  const idx = Math.min(Math.max(level - 1, 0), 2);
  const config = levelConfig[idx]!;
  const Icon = config.icon;
  const daysToNext = level < 3 ? Math.max(7 - habitLevelStreak, 0) : 0;
  const progress = level < 3 ? Math.min((habitLevelStreak / 7) * 100, 100) : 100;

  return (
    <div className="flex items-center gap-3">
      <div className={`p-1.5 rounded-lg ${config.bg}`}>
        <Icon className={`h-4 w-4 ${config.color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-1.5">
          <span className="text-xs font-bold text-gray-700">Level {level}</span>
          <span className="text-[10px] text-gray-500">{config.label}</span>
        </div>
        {level < 3 ? (
          <div className="mt-1">
            <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-green-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-[10px] text-gray-400 mt-0.5">
              {daysToNext} day{daysToNext !== 1 ? 's' : ''} to Level {level + 1}
            </p>
          </div>
        ) : (
          <p className="text-[10px] text-green-600 font-medium">Max level reached</p>
        )}
      </div>
    </div>
  );
};

export default HabitDifficultyIndicator;
