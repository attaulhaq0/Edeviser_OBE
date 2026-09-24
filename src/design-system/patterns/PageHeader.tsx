// =============================================================================
// PageHeader — semantic page title with a bounded, wrapping action area.
// Narrow layouts place actions on their own row rather than squeezing the h1.
// =============================================================================

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { HeadingActions } from "@/design-system/patterns/SectionHeader";

export interface PageHeaderProps {
  title: string;
  /** Optional trailing action (button/link), inline-end aligned. */
  action?: ReactNode;
  className?: string;
}

const PageHeader = ({ title, action, className }: PageHeaderProps) => (
  <div className={cn("grid min-w-0 grid-cols-1 items-center gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,auto)]", className)}>
    <h1 className="min-w-0 break-words text-2xl font-bold tracking-tight text-foreground">
      {title}
    </h1>
    {action ? <HeadingActions>{action}</HeadingActions> : null}
  </div>
);

export default PageHeader;
