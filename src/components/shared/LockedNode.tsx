// =============================================================================
// LockedNode — Locked/prerequisite-gated assignment node for learning path
// =============================================================================

import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LockedNodeProps {
  title: string;
  prerequisiteCLO?: string;
  requiredAttainment?: number;
  currentAttainment?: number;
  className?: string;
}

const LockedNode = ({
  title,
  prerequisiteCLO,
  requiredAttainment,
  currentAttainment,
  className,
}: LockedNodeProps) => (
  <div
    className={cn(
      'relative flex items-center gap-3 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 opacity-60',
      className,
    )}
  >
    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200">
      <Lock className="h-4 w-4 text-gray-500" />
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-sm font-medium text-gray-500 truncate">{title}</p>
      {prerequisiteCLO && (
        <p className="text-xs text-gray-400 mt-0.5">
          Requires {requiredAttainment ?? 70}% on {prerequisiteCLO}
          {currentAttainment != null && (
            <span className="ms-1">(current: {Math.round(currentAttainment)}%)</span>
          )}
        </p>
      )}
    </div>
  </div>
);

export default LockedNode;
export type { LockedNodeProps };
