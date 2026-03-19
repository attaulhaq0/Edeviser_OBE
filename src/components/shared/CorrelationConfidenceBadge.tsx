import { Badge } from '@/components/ui/badge';
import type { CorrelationConfidenceLevel } from '@/types/habits';

export interface CorrelationConfidenceBadgeProps {
  level: CorrelationConfidenceLevel;
  dataPointCount: number;
}

const CONFIDENCE_CONFIG: Record<
  CorrelationConfidenceLevel,
  { label: string; className: string }
> = {
  early_pattern: {
    label: 'Early Pattern',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  emerging_trend: {
    label: 'Emerging Trend',
    className: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  strong_pattern: {
    label: 'Strong Pattern',
    className: 'bg-green-50 text-green-700 border-green-200',
  },
};

const CorrelationConfidenceBadge = ({ level, dataPointCount }: CorrelationConfidenceBadgeProps) => {
  const config = CONFIDENCE_CONFIG[level];

  return (
    <Badge
      variant="outline"
      className={config.className}
      data-testid={`confidence-badge-${level}`}
    >
      {config.label} ({dataPointCount} days)
    </Badge>
  );
};

export default CorrelationConfidenceBadge;
