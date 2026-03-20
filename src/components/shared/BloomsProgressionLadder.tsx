// =============================================================================
// BloomsProgressionLadder — Vertical 6-level Bloom's taxonomy ladder per CLO
// Shows the student's highest reached level with color coding and animation
// =============================================================================

import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface BloomsProgressionLadderProps {
  highestLevel: number; // 0-6, 0 means no level reached
  cloTitle?: string;
  compact?: boolean;
}

interface BloomsLevelConfig {
  level: number;
  label: string;
  bg: string;
  text: string;
  dimBg: string;
  dimText: string;
}

// ─── Bloom's level config (ordered bottom-to-top for rendering) ─────────────

const BLOOMS_LEVELS: BloomsLevelConfig[] = [
  { level: 6, label: 'Creating',      bg: 'bg-red-500',    text: 'text-white',    dimBg: 'bg-red-100',    dimText: 'text-red-300' },
  { level: 5, label: 'Evaluating',    bg: 'bg-orange-500', text: 'text-white',    dimBg: 'bg-orange-100', dimText: 'text-orange-300' },
  { level: 4, label: 'Analyzing',     bg: 'bg-yellow-500', text: 'text-gray-900', dimBg: 'bg-yellow-100', dimText: 'text-yellow-400' },
  { level: 3, label: 'Applying',      bg: 'bg-green-500',  text: 'text-white',    dimBg: 'bg-green-100',  dimText: 'text-green-300' },
  { level: 2, label: 'Understanding', bg: 'bg-blue-500',   text: 'text-white',    dimBg: 'bg-blue-100',   dimText: 'text-blue-300' },
  { level: 1, label: 'Remembering',   bg: 'bg-purple-500', text: 'text-white',    dimBg: 'bg-purple-100', dimText: 'text-purple-300' },
];

// ─── Component ──────────────────────────────────────────────────────────────

export const BloomsProgressionLadder = ({
  highestLevel,
  cloTitle,
  compact = false,
}: BloomsProgressionLadderProps) => {
  const prefersReducedMotion = useReducedMotion();
  const clampedLevel = Math.max(0, Math.min(6, Math.round(highestLevel)));

  return (
    <div
      className={cn('flex flex-col', compact ? 'gap-1' : 'gap-1.5')}
      role="img"
      aria-label={`Bloom's progression ladder${cloTitle ? ` for ${cloTitle}` : ''}: highest level reached is ${clampedLevel > 0 ? BLOOMS_LEVELS.find((l) => l.level === clampedLevel)?.label ?? 'None' : 'None'}`}
    >
      {cloTitle && (
        <p
          className={cn(
            'font-bold tracking-tight truncate',
            compact ? 'text-xs' : 'text-sm',
          )}
        >
          {cloTitle}
        </p>
      )}

      <div className={cn('flex flex-col', compact ? 'gap-0.5' : 'gap-1')}>
        {BLOOMS_LEVELS.map((config) => {
          const isReached = clampedLevel >= config.level;
          const isHighest = clampedLevel === config.level;

          return (
            <motion.div
              key={config.level}
              className={cn(
                'flex items-center rounded-md font-semibold transition-colors',
                compact ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1.5 text-xs',
                isReached ? cn(config.bg, config.text) : cn(config.dimBg, config.dimText),
                isHighest && 'ring-2 ring-offset-1 ring-gray-900/20',
              )}
              initial={
                prefersReducedMotion
                  ? false
                  : { opacity: 0, y: 8 }
              }
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: prefersReducedMotion ? 0 : 0.3,
                delay: prefersReducedMotion ? 0 : (6 - config.level) * 0.05,
                ease: 'easeOut',
              }}
            >
              <span className={cn('font-bold', compact ? 'w-3 mr-1' : 'w-4 mr-2')}>
                {config.level}
              </span>
              <span className="truncate">{config.label}</span>
              {isHighest && clampedLevel > 0 && (
                <span className={cn('ml-auto', compact ? 'text-[9px]' : 'text-[10px]')}>
                  ★
                </span>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default BloomsProgressionLadder;
