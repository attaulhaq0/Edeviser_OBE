// =============================================================================
// PageHeader — page title row (prototype design system)
// =============================================================================
// The standard page heading: `text-2xl font-bold tracking-tight` with an
// optional trailing action, matching the prototype's page titles.
// =============================================================================

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface PageHeaderProps {
  title: string;
  /** Optional trailing action (button/link), inline-end aligned. */
  action?: ReactNode;
  className?: string;
}

const PageHeader = ({ title, action, className }: PageHeaderProps) => (
  <div className={cn("flex items-center justify-between gap-3", className)}>
    <h1 className="text-2xl font-bold tracking-tight text-foreground">
      {title}
    </h1>
    {action ? <div className="shrink-0">{action}</div> : null}
  </div>
);

export default PageHeader;
