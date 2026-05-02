// =============================================================================
// ContributionStatusBadge — Color-coded contribution status badge
// Task 4.8: green=active, yellow=warning, red=inactive
// =============================================================================

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ContributionStatus } from '@/lib/contributionThresholds';

export interface ContributionStatusBadgeProps {
  status: ContributionStatus;
  className?: string;
}

const STATUS_CONFIG: Record<ContributionStatus, { label: string; classes: string }> = {
  active: {
    label: 'Active',
    classes: 'bg-green-100 text-green-700 border-green-200',
  },
  warning: {
    label: 'Warning',
    classes: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  },
  inactive: {
    label: 'Inactive',
    classes: 'bg-red-100 text-red-700 border-red-200',
  },
};

const ContributionStatusBadge = ({ status, className }: ContributionStatusBadgeProps) => {
  const config = STATUS_CONFIG[status];

  return (
    <Badge
      className={cn('text-[10px] font-bold', config.classes, className)}
      aria-label={`Contribution status: ${config.label}`}
    >
      {config.label}
    </Badge>
  );
};

export default ContributionStatusBadge;
