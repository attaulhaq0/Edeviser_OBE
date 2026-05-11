// =============================================================================
// CQIStatusBadge — CQI action plan status badge
// planned / in_progress / completed / evaluated
// =============================================================================

import { cn } from "@/lib/utils";

type CQIStatus = "planned" | "in_progress" | "completed" | "evaluated";

interface CQIStatusBadgeProps {
  status: CQIStatus;
  className?: string;
}

const CQI_STATUS_STYLES: Record<
  CQIStatus,
  { bg: string; text: string; label: string }
> = {
  planned: { bg: "bg-gray-100", text: "text-gray-700", label: "Planned" },
  in_progress: {
    bg: "bg-blue-100",
    text: "text-blue-700",
    label: "In Progress",
  },
  completed: { bg: "bg-green-100", text: "text-green-700", label: "Completed" },
  evaluated: {
    bg: "bg-purple-100",
    text: "text-purple-700",
    label: "Evaluated",
  },
};

const CQIStatusBadge = ({ status, className }: CQIStatusBadgeProps) => {
  const style = CQI_STATUS_STYLES[status];

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

export default CQIStatusBadge;
export { CQI_STATUS_STYLES };
export type { CQIStatusBadgeProps, CQIStatus };
