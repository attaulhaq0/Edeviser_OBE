import { Badge } from '@/components/ui/badge';
import { useIndependenceScore } from '@/hooks/useIndependenceScore';
import { classifyIndependenceScore } from '@/lib/independenceCalculator';
import { cn } from '@/lib/utils';
import { Shield } from 'lucide-react';

interface IndependenceScoreBadgeProps {
  /** Student ID */
  studentId: string;
  /** CLO ID */
  cloId: string;
  /** Optional: show label text */
  showLabel?: boolean;
}

const colorStyles = {
  green: 'bg-green-50 text-green-700 border-green-200',
  yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  red: 'bg-red-50 text-red-700 border-red-200',
} as const;

/**
 * Color-coded independence score chip.
 * Green (≥70%), Yellow (40-69%), Red (<40%)
 *
 * Requirement 28: Independence Score Tracking
 */
const IndependenceScoreBadge = ({ studentId, cloId, showLabel = false }: IndependenceScoreBadgeProps) => {
  const { data: score, isLoading } = useIndependenceScore(studentId, cloId);

  if (isLoading || score === undefined) return null;

  const color = classifyIndependenceScore(score);
  const percent = Math.round(score * 100);

  return (
    <Badge
      className={cn(
        'text-xs font-bold whitespace-nowrap gap-1',
        colorStyles[color],
      )}
      title={`Independence Score: ${percent}%`}
    >
      <Shield className="h-3 w-3" />
      {showLabel && <span>Independence:</span>}
      {percent}%
    </Badge>
  );
};

export default IndependenceScoreBadge;
