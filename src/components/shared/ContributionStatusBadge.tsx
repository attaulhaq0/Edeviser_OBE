// =============================================================================
// ContributionStatusBadge — Task 4.8
// Color-coded badge (green=active, yellow=warning, red=inactive)
// =============================================================================

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type ContributionStatus = 'active' | 'warning' | 'inactive';

interface ContributionStatusBadgeProps {
  status: ContributionStatus;
  className?: string;
}

const STATUS_CONFIG: Record<
  ContributionStatus,
  { label: string; classes: string }
> = {
  active: {
    label: 'Active',
    classes: 'bg-green-50 text-green-700 border-green-200',
  },
  warning: {
    label: 'Warning',
    classes: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  },
  inactive: {
    label: 'Inactive',
    classes: 'bg-red-50 text-red-700 border-red-200',
  },
};

const ContributionStatusBadge = ({
  status,
  className,
}: ContributionStatusBadgeProps) => {
  const config = STATUS_CONFIG[status];

  return (
    <Badge
      variant="outline"
      className={cn('text-xs font-bold', config.classes, className)}
      data-testid={`contribution-status-${status}`}
    >
      {config.label}
    </Badge>
  );
};

export default ContributionStatusBadge;
