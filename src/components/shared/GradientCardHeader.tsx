// =============================================================================
// GradientCardHeader — Reusable gradient header for section cards
// =============================================================================

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface GradientCardHeaderProps {
  icon?: LucideIcon;
  title: string;
  className?: string;
  children?: React.ReactNode;
}

const GradientCardHeader = ({
  icon: Icon,
  title,
  className,
  children,
}: GradientCardHeaderProps) => (
  <div
    className={cn("px-6 py-4 flex items-center gap-2", className)}
    style={{
      background: "var(--brand-gradient)",
    }}
  >
    {Icon && <Icon className="h-5 w-5 text-white" />}
    <h2 className="text-lg font-bold tracking-tight text-white">{title}</h2>
    {children && <div className="ml-auto">{children}</div>}
  </div>
);

export default GradientCardHeader;
export type { GradientCardHeaderProps };
