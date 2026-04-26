import { cn } from '@/lib/utils';
import { RotateCcw, Check, SkipForward } from 'lucide-react';
import type { ReviewStatus } from '@/types/planner';

export interface ReviewSessionBadgeProps {
  intervalDays: 1 | 3 | 7;
  status: ReviewStatus;
}

const intervalLabels: Record<number, string> = {
  1: 'Day 1 Review',
  3: 'Day 3 Review',
  7: 'Day 7 Review',
};

const intervalColors: Record<number, { bg: string; text: string; border: string }> = {
  1: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  3: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  7: { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200' },
};

const statusIcons: Record<ReviewStatus, React.ReactNode> = {
  pending: <RotateCcw className="h-3.5 w-3.5" />,
  completed: <Check className="h-3.5 w-3.5" />,
  skipped: <SkipForward className="h-3.5 w-3.5" />,
};

const ReviewSessionBadge = ({ intervalDays, status }: ReviewSessionBadgeProps) => {
  const colors = intervalColors[intervalDays] ?? intervalColors[1]!;
  const label = intervalLabels[intervalDays] ?? `Day ${intervalDays} Review`;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold tracking-wide rounded-md border',
        status === 'completed' && 'opacity-60',
        status === 'skipped' && 'opacity-40 line-through',
        colors.bg,
        colors.text,
        colors.border,
      )}
      data-testid="review-session-badge"
    >
      {statusIcons[status]}
      {label}
    </span>
  );
};

export default ReviewSessionBadge;
