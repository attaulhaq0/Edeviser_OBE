// =============================================================================
// SectionCard — PCard + in-body SectionHeader (design system)
// =============================================================================
// The standard prototype section card: a white surface with a `.sec-h` header
// (gradient chip + title + optional action) and a content body.
// =============================================================================

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import PCard from "./PCard";
import SectionHeader from "./SectionHeader";

export interface SectionCardProps {
  icon?: LucideIcon;
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

const SectionCard = ({
  icon,
  title,
  action,
  children,
  className,
}: SectionCardProps) => (
  <PCard className={cn("space-y-4 p-6", className)}>
    <SectionHeader icon={icon} title={title} action={action} />
    {children}
  </PCard>
);

export default SectionCard;
