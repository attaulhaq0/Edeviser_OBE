// =============================================================================
// OutcomeTypeBadge — Badge for ILO/PLO/CLO with color coding
// ILO red, PLO blue, CLO green
// =============================================================================

import { cn } from '@/lib/utils';

type OutcomeType = 'ILO' | 'PLO' | 'CLO';

interface OutcomeTypeBadgeProps {
  type: OutcomeType;
  className?: string;
}

const OUTCOME_STYLES: Record<OutcomeType, { bg: string; text: string; border: string }> = {
  ILO: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' },
  PLO: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' },
  CLO: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' },
};

const OutcomeTypeBadge = ({ type, className }: OutcomeTypeBadgeProps) => {
  const style = OUTCOME_STYLES[type];

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold tracking-wide uppercase',
        style.bg,
        style.text,
        style.border,
        className,
      )}
    >
      {type}
    </span>
  );
};

export default OutcomeTypeBadge;
export { OUTCOME_STYLES };
export type { OutcomeTypeBadgeProps, OutcomeType };
