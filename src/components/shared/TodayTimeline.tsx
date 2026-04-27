// =============================================================================
// TodayTimeline — Chronological timeline with Morning/Afternoon/Evening/ToDo
// sections, rendering session cards, task items, deadline items, and habit status
// =============================================================================

import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import StudySessionCard from "@/components/shared/StudySessionCard";
import PlannerTaskItem from "@/components/shared/PlannerTaskItem";
import DeadlineItem from "@/components/shared/DeadlineItem";
import GradientCardHeader from "@/components/shared/GradientCardHeader";
import { cn } from "@/lib/utils";
import { groupByTimeOfDay, isSessionMissed } from "@/lib/plannerUtils";
import type {
  StudySession,
  PlannerTask,
  UpcomingDeadline,
  HabitStatus,
  TimelineItem,
  TimeOfDay,
} from "@/types/planner";
import {
  Sun,
  CloudSun,
  Moon,
  ListChecks,
  LogIn,
  Send,
  BookOpen,
  Eye,
  Clock,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

interface TodayTimelineProps {
  sessions: StudySession[];
  tasks: PlannerTask[];
  deadlines: UpcomingDeadline[];
  habits: HabitStatus;
  onSessionStart?: (session: StudySession) => void;
  onSessionEdit?: (session: StudySession) => void;
  onTaskToggle?: (task: PlannerTask) => void;
  onTaskEdit?: (task: PlannerTask) => void;
  onTaskDelete?: (task: PlannerTask) => void;
}

// ─── Section Config ─────────────────────────────────────────────────────────

const SECTION_CONFIG: Record<
  TimeOfDay | "todo",
  { label: string; icon: typeof Sun; color: string }
> = {
  morning: { label: "Morning", icon: Sun, color: "text-amber-500" },
  afternoon: { label: "Afternoon", icon: CloudSun, color: "text-orange-500" },
  evening: { label: "Evening", icon: Moon, color: "text-indigo-500" },
  todo: { label: "To Do", icon: ListChecks, color: "text-gray-500" },
};

// ─── Habit Config ───────────────────────────────────────────────────────────

const HABIT_ITEMS: Array<{
  key: keyof HabitStatus;
  label: string;
  icon: typeof LogIn;
  color: string;
}> = [
  { key: "login", label: "Login", icon: LogIn, color: "text-blue-500" },
  { key: "submit", label: "Submit", icon: Send, color: "text-green-500" },
  {
    key: "journal",
    label: "Journal",
    icon: BookOpen,
    color: "text-purple-500",
  },
  { key: "read", label: "Read", icon: Eye, color: "text-amber-500" },
];

// ─── Timeline Section ───────────────────────────────────────────────────────

interface TimelineSectionProps {
  sectionKey: TimeOfDay | "todo";
  items: TimelineItem[];
  onSessionStart?: (session: StudySession) => void;
  onSessionEdit?: (session: StudySession) => void;
  onTaskToggle?: (task: PlannerTask) => void;
  onTaskEdit?: (task: PlannerTask) => void;
  onTaskDelete?: (task: PlannerTask) => void;
}

const TimelineSection = ({
  sectionKey,
  items,
  onSessionStart,
  onSessionEdit,
  onTaskToggle,
  onTaskEdit,
  onTaskDelete,
}: TimelineSectionProps) => {
  const config = SECTION_CONFIG[sectionKey];
  const Icon = config.icon;

  if (items.length === 0) return null;

  return (
    <div className="space-y-2">
      {/* Section Header */}
      <div className="flex items-center gap-2 py-1">
        <Icon className={cn("h-4 w-4", config.color)} />
        <h3 className="text-sm font-semibold text-gray-700">{config.label}</h3>
        <div className="flex-1 border-t border-dashed border-gray-200" />
      </div>

      {/* Items */}
      <div className="space-y-2 ps-6">
        {items.map((item) => {
          switch (item.type) {
            case "session": {
              const session = item.data as StudySession;
              const missed = isSessionMissed(session, new Date());
              return (
                <div key={item.id} className="relative">
                  {missed && (
                    <div className="absolute -start-5 top-2 flex items-center gap-1">
                      <Clock className="h-3 w-3 text-red-500" />
                    </div>
                  )}
                  <div className={cn(missed && "opacity-60")}>
                    <StudySessionCard
                      session={session}
                      onStart={
                        onSessionStart
                          ? () => onSessionStart(session)
                          : undefined
                      }
                      onEdit={
                        onSessionEdit ? () => onSessionEdit(session) : undefined
                      }
                    />
                    {missed && (
                      <span className="mt-1 inline-block text-[11px] font-medium text-red-500">
                        Missed
                      </span>
                    )}
                  </div>
                </div>
              );
            }
            case "task":
              return (
                <PlannerTaskItem
                  key={item.id}
                  task={item.data as PlannerTask}
                  onToggle={onTaskToggle}
                  onEdit={onTaskEdit}
                  onDelete={onTaskDelete}
                />
              );
            case "deadline":
              return (
                <DeadlineItem
                  key={item.id}
                  deadline={item.data as UpcomingDeadline}
                />
              );
            default:
              return null;
          }
        })}
      </div>
    </div>
  );
};

// ─── Habit Status Section ───────────────────────────────────────────────────

const HabitStatusSection = ({ habits }: { habits: HabitStatus }) => (
  <div className="space-y-2">
    <div className="flex items-center gap-2 py-1">
      <ListChecks className="h-4 w-4 text-teal-500" />
      <h3 className="text-sm font-semibold text-gray-700">Daily Habits</h3>
      <div className="flex-1 border-t border-dashed border-gray-200" />
    </div>
    <div className="grid grid-cols-2 gap-2 ps-6">
      {HABIT_ITEMS.map(({ key, label, icon: HIcon, color }) => {
        const done = habits[key];
        return (
          <div
            key={key}
            className={cn(
              "flex items-center gap-2 rounded-lg border p-2",
              done
                ? "border-green-200 bg-green-50/60"
                : "border-gray-200 bg-white"
            )}
          >
            <HIcon
              className={cn("h-3.5 w-3.5", done ? "text-green-500" : color)}
            />
            <span
              className={cn(
                "text-xs font-medium",
                done ? "text-green-700 line-through" : "text-gray-700"
              )}
            >
              {label}
            </span>
            {done && (
              <span className="ms-auto text-[10px] font-bold text-green-600">
                ✓
              </span>
            )}
          </div>
        );
      })}
    </div>
  </div>
);

// ─── Main Component ─────────────────────────────────────────────────────────

const TodayTimeline = ({
  sessions,
  tasks,
  deadlines,
  habits,
  onSessionStart,
  onSessionEdit,
  onTaskToggle,
  onTaskEdit,
  onTaskDelete,
}: TodayTimelineProps) => {
  // Build timeline items from sessions, tasks, and deadlines
  const timelineItems: TimelineItem[] = useMemo(() => {
    const items: TimelineItem[] = [];

    // Sessions have a scheduled time
    for (const session of sessions) {
      items.push({
        id: `session-${session.id}`,
        type: "session",
        time: session.plannedStartTime || null,
        timeOfDay: null,
        data: session,
      });
    }

    // Tasks are unscheduled (go to "To Do")
    for (const task of tasks) {
      items.push({
        id: `task-${task.id}`,
        type: "task",
        time: null,
        timeOfDay: null,
        data: task,
      });
    }

    // Deadlines have a due date/time
    for (const deadline of deadlines) {
      // Extract time from dueDate if it contains a time component
      let time: string | null = null;
      if (deadline.dueDate.includes("T")) {
        const timePart = deadline.dueDate.split("T")[1];
        if (timePart) {
          time = timePart.substring(0, 5); // HH:MM
        }
      }
      items.push({
        id: `deadline-${deadline.id}`,
        type: "deadline",
        time,
        timeOfDay: null,
        data: deadline,
      });
    }

    return items;
  }, [sessions, tasks, deadlines]);

  // Group items by time of day
  const grouped = useMemo(
    () => groupByTimeOfDay(timelineItems),
    [timelineItems]
  );

  const sectionOrder: Array<TimeOfDay | "todo"> = [
    "morning",
    "afternoon",
    "evening",
    "todo",
  ];
  const hasItems = sectionOrder.some((key) => grouped[key].length > 0);

  return (
    <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
      <GradientCardHeader icon={Clock} title="Today's Timeline" />
      <div className="p-6 space-y-4">
        {/* Timeline Sections */}
        {hasItems ? (
          sectionOrder.map((key) => (
            <TimelineSection
              key={key}
              sectionKey={key}
              items={grouped[key]}
              onSessionStart={onSessionStart}
              onSessionEdit={onSessionEdit}
              onTaskToggle={onTaskToggle}
              onTaskEdit={onTaskEdit}
              onTaskDelete={onTaskDelete}
            />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="p-3 rounded-full bg-blue-50 mb-3">
              <Clock className="h-8 w-8 text-blue-400" />
            </div>
            <p className="text-sm text-gray-500">
              Nothing scheduled for today. Add a session or task to get started.
            </p>
          </div>
        )}

        {/* Habit Status */}
        <HabitStatusSection habits={habits} />
      </div>
    </Card>
  );
};

export default TodayTimeline;
export type { TodayTimelineProps };
