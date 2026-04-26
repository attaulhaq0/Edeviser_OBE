// =============================================================================
// TeamHealthBadge — Task 4.13
// Color-coded health score badge (green ≥70, yellow 40-69, red <40)
// =============================================================================

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Heart } from 'lucide-react';

type HealthStatus = 'healthy' | 'needs_attention' | 'at_risk';

interface TeamHealthBadgeProps {
  score: number;
  status?: HealthStatus;
  showScore?: boolean;
  className?: string;
}

const STATUS_CONFIG: Record<
  HealthStatus,
  { label: string; classes: string; iconColor: string }
> = {
  healthy: {
    label: 'Healthy',
    classes: 'bg-green-50 text-green-700 border-green-200',
    iconColor: 'text-green-500',
  },
  needs_attention: {
    label: 'Needs Attention',
    classes: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    iconColor: 'text-yellow-500',
  },
  at_risk: {
    label: 'At Risk',
    classes: 'bg-red-50 text-red-700 border-red-200',
    iconColor: 'text-red-500',
  },
};

const classifyStatus = (score: number): HealthStatus => {
  if (score >= 70) return 'healthy';
  if (score >= 40) return 'needs_attention';
  return 'at_risk';
};

const TeamHealthBadge = ({
  score,
  status,
  showScore = true,
  className,
}: TeamHealthBadgeProps) => {
  const resolvedStatus = status ?? classifyStatus(score);
  const config = STATUS_CONFIG[resolvedStatus];

  return (
    <Badge
      variant="outline"
      className={cn(
        'text-xs font-bold gap-1',
        config.classes,
        className,
      )}
      data-testid={`team-health-badge-${resolvedStatus}`}
    >
      <Heart className={cn('h-3 w-3', config.iconColor)} />
      {showScore && <span>{score}</span>}
      {config.label}
    </Badge>
  );
};

export default TeamHealthBadge;
