// =============================================================================
// CLOProgressBar — Reusable attainment bar with Bloom's color coding
// =============================================================================

import { motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { BloomsLevel, AttainmentLevel } from '@/types/app';

// ─── Color Maps ──────────────────────────────────────────────────────────────

const BLOOMS_COLORS: Record<BloomsLevel, { bg: string; text: string; label: string }> = {
  remembering: { bg: 'bg-purple-500', text: 'text-white', label: 'Remember' },
  understanding: { bg: 'bg-blue-500', text: 'text-white', label: 'Understand' },
  applying: { bg: 'bg-green-500', text: 'text-white', label: 'Apply' },
  analyzing: { bg: 'bg-yellow-500', text: 'text-gray-900', label: 'Analyze' },
  evaluating: { bg: 'bg-orange-500', text: 'text-white', label: 'Evaluate' },
  creating: { bg: 'bg-red-500', text: 'text-white', label: 'Create' },
};

const ATTAINMENT_STYLES: Record<AttainmentLevel, { bar: string; text: string; label: string }> = {
  Excellent: { bar: 'bg-green-500', text: 'text-green-600', label: 'Excellent' },
  Satisfactory: { bar: 'bg-blue-500', text: 'text-blue-600', label: 'Satisfactory' },
  Developing: { bar: 'bg-yellow-500', text: 'text-yellow-600', label: 'Developing' },
  Not_Yet: { bar: 'bg-red-500', text: 'text-red-600', label: 'Not Yet' },
};

// ─── Props ───────────────────────────────────────────────────────────────────

interface CLOProgressBarProps {
  title: string;
  bloomsLevel: BloomsLevel;
  attainmentPercent: number | null;
  attainmentLevel: AttainmentLevel | null;
  className?: string;
  onClick?: () => void;
  isExpanded?: boolean;
}

// ─── Component ───────────────────────────────────────────────────────────────

const CLOProgressBar = ({
  title,
  bloomsLevel,
  attainmentPercent,
  attainmentLevel,
  className,
  onClick,
  isExpanded,
}: CLOProgressBarProps) => {
  const blooms = BLOOMS_COLORS[bloomsLevel];
  const attainment = attainmentLevel ? ATTAINMENT_STYLES[attainmentLevel] : null;
  const percent = attainmentPercent ?? 0;
  const isAssessed = attainmentPercent !== null;
  const isClickable = !!onClick;

  return (
    <div
      className={cn('space-y-2', isClickable && 'cursor-pointer rounded-lg p-2 -m-2 transition-colors hover:bg-slate-50', className)}
      onClick={onClick}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={isClickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.(); } } : undefined}
      aria-expanded={isClickable ? isExpanded : undefined}
    >
      {/* Header row: CLO title + Bloom's pill + attainment label */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Badge className={cn(blooms.bg, blooms.text, 'text-xs font-bold tracking-wide uppercase shrink-0')}>
            {blooms.label}
          </Badge>
          <span className="text-sm font-medium truncate">{title}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isAssessed ? (
            <>
              <span className="text-sm font-bold tabular-nums">{Math.round(percent)}%</span>
              <span className={cn('text-xs font-semibold', attainment?.text)}>
                {attainment?.label}
              </span>
            </>
          ) : (
            <span className="text-xs text-gray-400 italic">Not assessed</span>
          )}
          {isClickable && (
            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="h-4 w-4 text-gray-400" />
            </motion.div>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
        {isAssessed ? (
          <motion.div
            className={cn('h-full rounded-full', attainment?.bar ?? 'bg-gray-300')}
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(percent, 100)}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        ) : (
          <div className="h-full w-full bg-slate-100" />
        )}
      </div>
    </div>
  );
};

export default CLOProgressBar;
export { BLOOMS_COLORS, ATTAINMENT_STYLES };
