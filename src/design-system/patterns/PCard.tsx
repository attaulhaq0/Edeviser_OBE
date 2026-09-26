// =============================================================================
// PCard — static, unpadded composition of the canonical Card primitive.
// Callers own content layout and any explicit interaction treatment.
// =============================================================================

import type { HTMLAttributes, ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface PCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
}

const PCard = ({ children, className, ...props }: PCardProps) => (
  <Card
    className={cn(
      "block gap-0 rounded-2xl border border-border bg-card p-0 text-card-foreground shadow-(--depth-2) motion-reduce:transition-none motion-reduce:hover:translate-y-0",
      className
    )}
    {...props}
  >
    {children}
  </Card>
);

export default PCard;
