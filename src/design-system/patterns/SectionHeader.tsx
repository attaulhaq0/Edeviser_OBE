// =============================================================================
// SectionHeader — semantic section heading with a decorative icon and actions.
// Copy wraps without truncation; callers retain their heading-level contract.
// =============================================================================

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface SectionHeaderProps {
  /** Optional decorative icon on a transparent surface. */
  icon?: LucideIcon;
  title: string;
  description?: string;
  /** Trailing action, inline-end aligned when space allows. */
  action?: ReactNode;
  as?: "h2" | "h3";
  className?: string;
}

// Shared only by heading compositions, not an additional public barrel API.
// Direct controls wrap; nested action groups continue to own their own layout.
export const HeadingActions = ({ children }: { children: ReactNode }) => (
  <div className="ms-auto flex min-w-0 max-w-full flex-wrap items-center justify-end gap-2 [&>button]:h-auto [&>button]:min-h-11 [&>button]:min-w-11 [&>button]:max-w-full [&>button]:whitespace-normal [&>button]:[overflow-wrap:anywhere] [&>a]:inline-flex [&>a]:h-auto [&>a]:min-h-11 [&>a]:min-w-11 [&>a]:max-w-full [&>a]:items-center [&>a]:justify-center [&>a]:whitespace-normal [&>a]:[overflow-wrap:anywhere]">
    {children}
  </div>
);

const SectionHeader = ({
  icon: Icon,
  title,
  description,
  action,
  as: Heading = "h2",
  className,
}: SectionHeaderProps) => (
  <div className={cn("flex min-w-0 flex-wrap items-center gap-3", className)}>
    <div className="flex min-w-0 basis-56 grow items-start gap-2">
      {Icon && (
        <span
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-transparent text-primary"
          aria-hidden="true"
        >
          <Icon className="size-4" />
        </span>
      )}
      <div className="min-w-0">
        <Heading className="break-words text-base font-semibold text-foreground">
          {title}
        </Heading>
        {description && (
          <p className="break-words text-sm text-muted-foreground">{description}</p>
        )}
      </div>
    </div>
    {action && <HeadingActions>{action}</HeadingActions>}
  </div>
);

export default SectionHeader;
