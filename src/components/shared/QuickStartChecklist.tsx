// =============================================================================
// QuickStartChecklist — Onboarding checklist for new users
// =============================================================================

import { CheckCircle, Circle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ChecklistItem {
  id: string;
  label: string;
  isCompleted: boolean;
  route: string;
}

interface QuickStartChecklistProps {
  items: ChecklistItem[];
  onItemClick: (route: string) => void;
  onDismiss: () => void;
  className?: string;
}

const QuickStartChecklist = ({
  items,
  onItemClick,
  onDismiss,
  className,
}: QuickStartChecklistProps) => {
  const completedCount = items.filter((i) => i.isCompleted).length;
  const progress = items.length > 0 ? (completedCount / items.length) * 100 : 0;

  return (
    <div
      className={cn(
        "rounded-xl border border-slate-200 bg-white p-4 space-y-3",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold">Quick Start</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDismiss}
          className="h-6 w-6 p-0"
          aria-label="Dismiss checklist"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
        <div
          className="h-full rounded-full bg-teal-500 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-xs text-gray-500">
        {completedCount}/{items.length} completed
      </p>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id}>
            <button
              onClick={() => onItemClick(item.route)}
              className="flex items-center gap-2 w-full text-start text-sm hover:bg-slate-50 rounded-lg px-2 py-1.5 transition-colors"
            >
              {item.isCompleted ? (
                <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
              ) : (
                <Circle className="h-4 w-4 text-gray-300 shrink-0" />
              )}
              <span
                className={cn(item.isCompleted && "line-through text-gray-400")}
              >
                {item.label}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default QuickStartChecklist;
export type { QuickStartChecklistProps, ChecklistItem };
