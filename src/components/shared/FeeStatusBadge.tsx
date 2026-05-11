// =============================================================================
// FeeStatusBadge — Fee payment status badge
// =============================================================================

import { cn } from "@/lib/utils";
import type { PaymentStatus } from "@/types/app";

interface FeeStatusBadgeProps {
  status: PaymentStatus;
  className?: string;
}

const FEE_STATUS_STYLES: Record<
  PaymentStatus,
  { bg: string; text: string; label: string }
> = {
  pending: { bg: "bg-yellow-100", text: "text-yellow-700", label: "Pending" },
  paid: { bg: "bg-green-100", text: "text-green-700", label: "Paid" },
  overdue: { bg: "bg-red-100", text: "text-red-700", label: "Overdue" },
  waived: { bg: "bg-gray-100", text: "text-gray-700", label: "Waived" },
};

const FeeStatusBadge = ({ status, className }: FeeStatusBadgeProps) => {
  const style = FEE_STATUS_STYLES[status];

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold tracking-wide uppercase",
        style.bg,
        style.text,
        className
      )}
    >
      {style.label}
    </span>
  );
};

export default FeeStatusBadge;
export { FEE_STATUS_STYLES };
export type { FeeStatusBadgeProps };
