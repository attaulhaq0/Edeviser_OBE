// =============================================================================
// LevelProgress — XP progress bar with level info
// =============================================================================

import { motion, useReducedMotion } from 'framer-motion';
import { TrendingUp } from 'lucide-react';
import type { LevelData } from '@/hooks/useLevel';

interface LevelProgressProps {
  levelData: LevelData;
  compact?: boolean;
}

const LevelProgress = ({ levelData, compact = false }: LevelProgressProps) => {
  const prefersReducedMotion = useReducedMotion();
  const { level, title, xpTotal, xpForCurrentLevel, xpForNextLevel, progressPercent } = levelData;
  const isMaxLevel = xpForNextLevel <= xpForCurrentLevel;

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-blue-50">
          <TrendingUp className="h-4 w-4 text-blue-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-700">Lv {level}</span>
            <span className="text-xs text-gray-500">{title}</span>
          </div>
          <div className="mt-1 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-600"
              initial={prefersReducedMotion ? { width: `${progressPercent}%` } : { width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-blue-50">
            <TrendingUp className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">Level {level}</p>
            <p className="text-xs text-gray-500">{title}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-amber-600">{xpTotal.toLocaleString()} XP</p>
          {!isMaxLevel && (
            <p className="text-xs text-gray-400">
              {(xpForNextLevel - xpTotal).toLocaleString()} to next
            </p>
          )}
        </div>
      </div>

      <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-600"
          initial={prefersReducedMotion ? { width: `${progressPercent}%` } : { width: 0 }}
          animate={{ width: `${progressPercent}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          role="progressbar"
          aria-valuenow={progressPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Level ${level} progress: ${progressPercent}%`}
        />
      </div>

      {!isMaxLevel && (
        <div className="flex justify-between text-[10px] font-black tracking-widest uppercase text-gray-400">
          <span>Lv {level} — {xpForCurrentLevel.toLocaleString()}</span>
          <span>Lv {level + 1} — {xpForNextLevel.toLocaleString()}</span>
        </div>
      )}
    </div>
  );
};

export default LevelProgress;
