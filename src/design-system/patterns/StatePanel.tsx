// =============================================================================
// StatePanel — localized loading / empty / error / partial / permission states.
// PCard owns reading surfaces; actions never sit inside a live or busy message.
// =============================================================================

import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import PCard from "@/design-system/patterns/PCard";
import { HeadingActions } from "@/design-system/patterns/SectionHeader";

export interface StatePanelProps {
  variant: "loading" | "empty" | "error" | "partial" | "permission";
  /** State message; overrides the localized default, including loading. */
  message?: string;
  className?: string;
  /** Caller-owned Button/Link controls (or a Fragment); nested groups own layout. */
  action?: ReactNode;
}

const StatePanel = ({ variant, message, className, action }: StatePanelProps) => {
  const { t } = useTranslation("common");
  const hasAction = action !== undefined && action !== null && typeof action !== "boolean";

  if (variant === "loading") {
    const label = message ?? t("status.loading");
    const skeleton = (
      <div
        role="status"
        aria-label={label}
        aria-busy="true"
        className={cn(
          "h-40 animate-pulse rounded-xl bg-muted motion-reduce:animate-none",
          !hasAction && className
        )}
      >
        <span className="sr-only">{label}</span>
      </div>
    );
    // Preserve the existing standalone skeleton when no action is supplied.
    if (!hasAction) return skeleton;
    return (
      <PCard className={cn("grid min-w-0 gap-4 p-6", className)}>
        {skeleton}
        <HeadingActions>{action}</HeadingActions>
      </PCard>
    );
  }

  const isAlert = variant === "error" || variant === "permission";
  const isPartial = variant === "partial";
  const label = message ?? (variant === "error"
    ? t("errors.generic")
    : t(`statePanel.${variant}`));

  return (
    <PCard className={cn("grid min-w-0 gap-4 p-6", className)}>
      {/* Errors and access blocks are alerts; partial results announce politely.
          Empty copy remains static, matching its existing public behavior. */}
      <p
        role={isAlert ? "alert" : isPartial ? "status" : undefined}
        aria-live={isPartial ? "polite" : undefined}
        aria-atomic={isAlert || isPartial ? true : undefined}
        className={cn(
          "min-w-0 text-sm [overflow-wrap:anywhere]",
          isAlert ? "text-destructive" : "text-muted-foreground"
        )}
      >
        {label}
      </p>
      {hasAction && <HeadingActions>{action}</HeadingActions>}
    </PCard>
  );
};

export default StatePanel;
