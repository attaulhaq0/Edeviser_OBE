import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import type { CompletedHabit } from "@/types/habits";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface HabitMobileBottomSheetProps {
  date: string;
  habits: CompletedHabit[];
  xpEarned: number;
  streakActive: boolean;
  open: boolean;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const HABIT_LABELS: Record<string, string> = {
  login: "Login",
  submit: "Submit",
  journal: "Journal",
  read: "Read",
  meditation: "Meditation",
  hydration: "Hydration",
  exercise: "Exercise",
  sleep: "Sleep",
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const HabitMobileBottomSheet = ({
  date,
  habits,
  xpEarned,
  streakActive,
  open,
  onClose,
}: HabitMobileBottomSheetProps) => {
  const academic = habits.filter((h) => h.category === "academic");
  const wellness = habits.filter((h) => h.category === "wellness");
  const isEmpty = habits.length === 0;

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent side="bottom" data-testid="habit-bottom-sheet">
        <SheetHeader>
          <SheetTitle data-testid="bottom-sheet-date">
            {formatDate(date)}
          </SheetTitle>
          <SheetDescription className="sr-only">
            Habit details for {formatDate(date)}
          </SheetDescription>
        </SheetHeader>

        <div className="px-4 pb-4">
          {isEmpty ? (
            <p
              className="text-sm text-gray-500"
              data-testid="bottom-sheet-empty"
            >
              No habits completed
            </p>
          ) : (
            <>
              {academic.length > 0 && (
                <div data-testid="bottom-sheet-academic-section">
                  <p className="text-[10px] font-black tracking-widest uppercase text-gray-400">
                    Academic
                  </p>
                  <ul className="mt-1 space-y-0.5">
                    {academic.map((h) => (
                      <li
                        key={h.type}
                        className="flex items-center gap-1.5 text-sm text-gray-700"
                        data-testid={`bottom-sheet-habit-${h.type}`}
                      >
                        <span className="text-green-500">✓</span>
                        {HABIT_LABELS[h.type] ?? h.type}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {wellness.length > 0 && (
                <div
                  className="mt-3"
                  data-testid="bottom-sheet-wellness-section"
                >
                  <p className="text-[10px] font-black tracking-widest uppercase text-gray-400">
                    Wellness
                  </p>
                  <ul className="mt-1 space-y-0.5">
                    {wellness.map((h) => (
                      <li
                        key={h.type}
                        className="flex items-center gap-1.5 text-sm text-gray-700"
                        data-testid={`bottom-sheet-habit-${h.type}`}
                      >
                        <span className="text-green-500">✓</span>
                        {HABIT_LABELS[h.type] ?? h.type}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                <span
                  className="text-xs text-gray-500"
                  data-testid="bottom-sheet-xp"
                >
                  {xpEarned} XP earned
                </span>
                <span
                  className="text-xs font-medium"
                  data-testid="bottom-sheet-streak"
                >
                  {streakActive ? "🔥 Streak active" : "Streak broken"}
                </span>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default HabitMobileBottomSheet;
