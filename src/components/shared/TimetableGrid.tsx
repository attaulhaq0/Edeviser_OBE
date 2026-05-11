// =============================================================================
// TimetableGrid — Weekly timetable grid
// =============================================================================

import { cn } from "@/lib/utils";

interface TimetableEntry {
  id: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  courseName: string;
  room: string;
  color?: string;
}

interface TimetableGridProps {
  entries: TimetableEntry[];
  className?: string;
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

const DAY_COLORS = [
  "bg-blue-50 border-blue-200 text-blue-700",
  "bg-green-50 border-green-200 text-green-700",
  "bg-purple-50 border-purple-200 text-purple-700",
  "bg-amber-50 border-amber-200 text-amber-700",
  "bg-teal-50 border-teal-200 text-teal-700",
];

const TimetableGrid = ({ entries, className }: TimetableGridProps) => (
  <div className={cn("grid grid-cols-5 gap-2", className)}>
    {DAYS.map((day, dayIdx) => (
      <div key={day} className="space-y-2">
        <h4 className="text-xs font-bold tracking-widest uppercase text-gray-500 text-center py-2">
          {day.slice(0, 3)}
        </h4>
        {entries
          .filter((e) => e.dayOfWeek === day)
          .sort((a, b) => a.startTime.localeCompare(b.startTime))
          .map((entry) => (
            <div
              key={entry.id}
              className={cn(
                "rounded-lg border p-2 text-xs space-y-0.5",
                entry.color ?? DAY_COLORS[dayIdx % DAY_COLORS.length]
              )}
            >
              <p className="font-semibold truncate">{entry.courseName}</p>
              <p className="opacity-70">
                {entry.startTime} – {entry.endTime}
              </p>
              {entry.room && <p className="opacity-60">{entry.room}</p>}
            </div>
          ))}
        {entries.filter((e) => e.dayOfWeek === day).length === 0 && (
          <div className="rounded-lg border border-dashed border-gray-200 p-2 text-xs text-gray-300 text-center">
            Free
          </div>
        )}
      </div>
    ))}
  </div>
);

export default TimetableGrid;
export { DAYS };
export type { TimetableGridProps, TimetableEntry };
