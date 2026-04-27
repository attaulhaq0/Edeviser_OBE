// =============================================================================
// TodayViewPage — Main page composing: DailyProgressSummary, TodayTimeline,
// Quick Add task button, Start Unplanned Session button
// =============================================================================

import { useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import DailyProgressSummary from "@/components/shared/DailyProgressSummary";
import TodayTimeline from "@/components/shared/TodayTimeline";
import CreateTaskDialog from "@/components/shared/CreateTaskDialog";
import Shimmer from "@/components/shared/Shimmer";
import { useAuth } from "@/hooks/useAuth";
import { useTodayViewData } from "@/hooks/useTodayView";
import { useCreateStudySession } from "@/hooks/useStudySessions";
import { useCreatePlannerTask, useCompleteTask } from "@/hooks/usePlannerTasks";
import type { StudySession, PlannerTask } from "@/types/planner";
import type { CreatePlannerTaskInput } from "@/lib/schemas/planner";
import { CalendarCheck, Plus, Play, Loader2 } from "lucide-react";

// ─── Main Component ─────────────────────────────────────────────────────────

const TodayViewPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const studentId = user?.id;

  // ─── Data ─────────────────────────────────────────────────────────────────
  const { sessions, tasks, deadlines, habits, isLoading, isError } =
    useTodayViewData(studentId);

  // ─── Mutations ────────────────────────────────────────────────────────────
  const createTask = useCreatePlannerTask();
  const completeTask = useCompleteTask();
  const createSession = useCreateStudySession();

  // ─── Dialog State ─────────────────────────────────────────────────────────
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [startingUnplanned, setStartingUnplanned] = useState(false);

  // ─── Today's date ─────────────────────────────────────────────────────────
  const todayStr = useMemo(() => format(new Date(), "yyyy-MM-dd"), []);
  const todayLabel = useMemo(
    () => format(new Date(), "EEEE, MMMM d, yyyy"),
    []
  );

  // ─── Daily Progress Computation ───────────────────────────────────────────
  const studyMinutes = useMemo(
    () =>
      sessions
        .filter((s) => s.status === "completed")
        .reduce((sum, s) => sum + (s.actualDurationMinutes ?? 0), 0),
    [sessions]
  );

  const tasksCompleted = useMemo(
    () => tasks.filter((t) => t.status === "completed").length,
    [tasks]
  );

  const sessionsCompleted = useMemo(
    () => sessions.filter((s) => s.status === "completed").length,
    [sessions]
  );

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleSessionStart = useCallback(
    (session: StudySession) => {
      navigate(`/student/focus/${session.id}`);
    },
    [navigate]
  );

  const handleSessionEdit = useCallback((_session: StudySession) => {
    // TODO: open edit dialog (Task 8 scope)
  }, []);

  const handleTaskToggle = useCallback(
    (task: PlannerTask) => {
      if (task.status === "pending") {
        completeTask.mutate(task.id);
      }
    },
    [completeTask]
  );

  const handleTaskEdit = useCallback((_task: PlannerTask) => {
    // TODO: open edit dialog
  }, []);

  const handleTaskDelete = useCallback((_task: PlannerTask) => {
    // TODO: confirm + delete
  }, []);

  const handleQuickAddSubmit = useCallback(
    (data: CreatePlannerTaskInput) => {
      createTask.mutate(data, {
        onSuccess: () => setQuickAddOpen(false),
      });
    },
    [createTask]
  );

  const handleStartUnplannedSession = useCallback(() => {
    if (!studentId) return;
    setStartingUnplanned(true);

    const now = new Date();
    const startTime = format(now, "HH:mm");

    createSession.mutate(
      {
        title: "Unplanned Study Session",
        plannedDate: todayStr,
        plannedStartTime: startTime,
        plannedDurationMinutes: 25,
        courseId: "",
        timerMode: "pomodoro",
        description: null,
        cloIds: null,
      },
      {
        onSuccess: (session) => {
          setStartingUnplanned(false);
          navigate(`/student/focus/${session.id}`);
        },
        onError: () => {
          setStartingUnplanned(false);
        },
      }
    );
  }, [studentId, todayStr, createSession, navigate]);

  // ─── Loading State ────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Shimmer className="h-12 rounded-xl" />
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Shimmer key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Shimmer className="h-64 rounded-xl" />
      </div>
    );
  }

  // ─── Error State ──────────────────────────────────────────────────────────
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-sm text-red-500">
          Failed to load today's data. Please try again.
        </p>
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <CalendarCheck className="h-6 w-6 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Today</h1>
            <p className="text-sm text-gray-500">{todayLabel}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Add Task */}
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 text-xs"
            onClick={() => setQuickAddOpen(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            Quick Add
          </Button>

          {/* Start Unplanned Session */}
          <Button
            size="sm"
            className="h-9 gap-1.5 bg-gradient-to-r from-teal-500 to-blue-600 text-xs active:scale-95"
            onClick={handleStartUnplannedSession}
            disabled={startingUnplanned}
          >
            {startingUnplanned ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Play className="h-3.5 w-3.5" />
            )}
            Start Unplanned Session
          </Button>
        </div>
      </div>

      {/* Daily Progress Summary */}
      <DailyProgressSummary
        studyMinutes={studyMinutes}
        tasksCompleted={tasksCompleted}
        sessionsCompleted={sessionsCompleted}
      />

      {/* Today Timeline */}
      <TodayTimeline
        sessions={sessions}
        tasks={tasks}
        deadlines={deadlines}
        habits={habits}
        onSessionStart={handleSessionStart}
        onSessionEdit={handleSessionEdit}
        onTaskToggle={handleTaskToggle}
        onTaskEdit={handleTaskEdit}
        onTaskDelete={handleTaskDelete}
      />

      {/* Quick Add Task Dialog */}
      <CreateTaskDialog
        open={quickAddOpen}
        onOpenChange={setQuickAddOpen}
        defaultDate={todayStr}
        courses={[]}
        onSubmit={handleQuickAddSubmit}
        isPending={createTask.isPending}
      />
    </div>
  );
};

export default TodayViewPage;
