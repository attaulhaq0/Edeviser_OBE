import type { LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import PCard from "@/design-system/patterns/PCard";

export interface KPICardProps {
  icon: LucideIcon;
  label: string;
  /** Already formatted by its domain owner; never classified or reformatted here. */
  value: string | number;
  /** Presentation of an explicit domain fact, never inferred from the value. */
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
  valueState?: "available" | "unavailable";
  surface?: "default" | "inset";
}

const toneClasses = {
  neutral: "text-card-foreground",
  success: "text-(--success-foreground)",
  warning: "text-(--warning-foreground)",
  danger: "text-(--error-foreground)",
  info: "text-(--info-foreground)",
} satisfies Record<NonNullable<KPICardProps["tone"]>, string>;

/** Static metric surface. Missing data is explicit; measured zero stays zero.
 * Invalid runtime values fail closed without turning a count into a status.
 */
const KPICard = ({
  icon: Icon,
  label,
  value,
  tone = "neutral",
  valueState = "available",
  surface = "default",
}: KPICardProps) => {
  const { t } = useTranslation("common");
  const validValue = typeof value === "number"
    ? Number.isFinite(value)
    : typeof value === "string" && value.trim().length > 0;
  const available = valueState === "available" && validValue;
  const effectiveTone = available && Object.prototype.hasOwnProperty.call(toneClasses, tone)
    ? tone : "neutral";

  return (
    <PCard
      className={cn("min-w-0 p-4", surface === "inset" && "shadow-none")}
      data-kpi-tone={effectiveTone}
      data-kpi-value-state={available ? "available" : "unavailable"}
    >
      <div className="flex items-start justify-between gap-3">
        <dl className="min-w-0 flex-1">
          <dt className="text-sm font-medium leading-normal text-muted-foreground [overflow-wrap:anywhere]">
            {label}
          </dt>
          <dd className={cn("mt-1 text-2xl font-semibold leading-normal tabular-nums [overflow-wrap:anywhere]", toneClasses[effectiveTone])}>
            {available ? value : t("metric.unavailable")}
          </dd>
        </dl>
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-transparent">
          <Icon className={cn("size-5", toneClasses[effectiveTone])} aria-hidden="true" />
        </div>
      </div>
    </PCard>
  );
};

export default KPICard;
