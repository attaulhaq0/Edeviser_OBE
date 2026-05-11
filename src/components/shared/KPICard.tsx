// =============================================================================
// KPICard — Reusable KPI card with icon, label, value, and hover effect
// =============================================================================

import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface KPICardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  iconBgClass?: string;
  iconColorClass?: string;
  className?: string;
}

const KPICard = ({
  icon: Icon,
  label,
  value,
  iconBgClass = "bg-blue-50",
  iconColorClass = "text-blue-600",
  className,
}: KPICardProps) => (
  <Card
    className={cn(
      "bg-white border-0 shadow-md rounded-xl p-4 group",
      className
    )}
  >
    <div className="flex items-center justify-between">
      <div>
        <p className="text-[10px] font-black tracking-widest uppercase text-gray-500">
          {label}
        </p>
        <p className="text-2xl font-black mt-1">{value}</p>
      </div>
      <div
        className={cn(
          "p-2 rounded-lg transition-transform group-hover:scale-110",
          iconBgClass
        )}
      >
        <Icon className={cn("h-5 w-5", iconColorClass)} />
      </div>
    </div>
  </Card>
);

export default KPICard;
export type { KPICardProps };
