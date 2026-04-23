// Task 119.1: Gap Status Badge shared component

import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertTriangle, XCircle, HelpCircle } from 'lucide-react';
import type { GapStatus, GapFlag } from '@/lib/gapAnalysis';

interface GapStatusBadgeProps {
  status: GapStatus;
  flag?: GapFlag;
}

const STATUS_CONFIG: Record<GapStatus, { label: string; className: string; icon: typeof CheckCircle }> = {
  fully_mapped: { label: 'Fully Mapped', className: 'bg-green-100 text-green-700', icon: CheckCircle },
  partially_mapped: { label: 'Partially Mapped', className: 'bg-yellow-100 text-yellow-700', icon: AlertTriangle },
  unmapped: { label: 'Unmapped', className: 'bg-red-100 text-red-700', icon: XCircle },
  no_evidence: { label: 'No Evidence', className: 'bg-gray-100 text-gray-700', icon: HelpCircle },
};

const GapStatusBadge = ({ status, flag }: GapStatusBadgeProps) => {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <div className="flex items-center gap-1">
      <Badge className={`text-[10px] ${config.className}`}>
        <Icon className="h-3 w-3 me-0.5" />{config.label}
      </Badge>
      {flag === 'under_mapped' && (
        <Badge className="text-[10px] bg-amber-100 text-amber-700">
          <AlertTriangle className="h-3 w-3 me-0.5" />Under-Mapped
        </Badge>
      )}
      {flag === 'unassessed' && (
        <Badge className="text-[10px] bg-amber-100 text-amber-700">
          <AlertTriangle className="h-3 w-3 me-0.5" />Unassessed
        </Badge>
      )}
    </div>
  );
};

export default GapStatusBadge;
