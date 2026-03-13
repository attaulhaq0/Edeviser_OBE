import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { GoalDifficulty } from '@/lib/goalTemplates';

export interface GoalDifficultyBadgeProps {
  difficulty: GoalDifficulty;
  className?: string;
}

const DIFFICULTY_CONFIG: Record<GoalDifficulty, { label: string; classes: string }> = {
  easy: {
    label: 'Easy',
    classes: 'bg-green-100 text-green-700 border-green-200',
  },
  moderate: {
    label: 'Moderate',
    classes: 'bg-amber-100 text-amber-700 border-amber-200',
  },
  ambitious: {
    label: 'Ambitious',
    classes: 'bg-red-100 text-red-700 border-red-200',
  },
};

const GoalDifficultyBadge = ({ difficulty, className }: GoalDifficultyBadgeProps) => {
  const config = DIFFICULTY_CONFIG[difficulty];

  return (
    <Badge
      variant="outline"
      className={cn('text-[10px] font-bold tracking-wide uppercase', config.classes, className)}
    >
      {config.label}
    </Badge>
  );
};

export default GoalDifficultyBadge;
