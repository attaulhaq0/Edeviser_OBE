import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface DifficultyBadgeProps {
  difficulty: number; // 1.0 to 5.0
  className?: string;
}

const getDifficultyClasses = (difficulty: number): string => {
  if (difficulty < 2.0) return 'bg-green-100 text-green-700';
  if (difficulty < 3.0) return 'bg-blue-100 text-blue-700';
  if (difficulty < 3.5) return 'bg-yellow-100 text-yellow-700';
  if (difficulty < 4.5) return 'bg-orange-100 text-orange-700';
  return 'bg-red-100 text-red-700';
};

const DifficultyBadge = ({ difficulty, className }: DifficultyBadgeProps) => {
  return (
    <Badge
      variant="outline"
      className={cn(
        'text-[10px] font-bold tracking-wide uppercase border-transparent',
        getDifficultyClasses(difficulty),
        className,
      )}
    >
      Difficulty: {difficulty.toFixed(1)}
    </Badge>
  );
};

export { DifficultyBadge };
export default DifficultyBadge;
