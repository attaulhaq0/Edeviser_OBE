// =============================================================================
// SaleBadge — Sale discount badge component
// =============================================================================

import { Tag } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface SaleBadgeProps {
  discountPercentage: number;
  className?: string;
}

const SaleBadge = ({ discountPercentage, className }: SaleBadgeProps) => {
  const { t, i18n } = useTranslation("common");
  if (!Number.isFinite(discountPercentage) || discountPercentage <= 0)
    return null;
  const locale = i18n.language.startsWith("ar") ? "ar-QA" : "en";
  const percent = new Intl.NumberFormat(locale, {
    style: "percent",
    maximumFractionDigits: 2,
  }).format(discountPercentage / 100);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-[var(--promotion-badge-bg)] px-2 py-0.5 text-xs font-bold text-[var(--promotion-badge-fg)] tabular-nums",
        className
      )}
    >
      <Tag className="h-3 w-3" aria-hidden="true" />
      {t("saleBadge.off", { percent })}
    </span>
  );
};

export default SaleBadge;
