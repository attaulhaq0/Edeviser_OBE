// =============================================================================
// HabitGrid — 2x2 grid showing 4 daily habits with completion status
// Login, Submit, Journal, Read
// =============================================================================

import { LogIn, Upload, BookOpen, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

type HabitType = "login" | "submit" | "journal" | "read";

interface HabitGridProps {
  completedHabits: HabitType[];
  className?: string;
}

interface HabitConfig {
  type: HabitType;
  label: string;
  icon: LucideIcon;
}

const HABITS: HabitConfig[] = [
  { type: "login", label: "Login", icon: LogIn },
  { type: "submit", label: "Submit", icon: Upload },
  { type: "journal", label: "Journal", icon: BookOpen },
  { type: "read", label: "Read", icon: Eye },
];

const HabitGrid = ({ completedHabits, className }: HabitGridProps) => (
  <div className={cn("grid grid-cols-2 gap-3", className)}>
    {HABITS.map(({ type, label, icon: Icon }) => {
      const done = completedHabits.includes(type);
      return (
        <div
          key={type}
          className={cn(
            "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
            done ? "bg-green-50 text-green-700" : "bg-gray-50 text-gray-400"
          )}
        >
          <Icon className="h-4 w-4 shrink-0" />
          <span>{label}</span>
          {done && <span className="ml-auto text-xs">✓</span>}
        </div>
      );
    })}
  </div>
);

export default HabitGrid;
export { HABITS };
export type { HabitGridProps, HabitType };
