// =============================================================================
// TodayViewPage — Main page composing: DailyProgressSummary, TodayTimeline,
// Quick Add task button, Start Unplanned Session button, Missed Reviews section,
// and today's scheduled reviews
// =============================================================================

import { useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import DailyProgressSummary from "@/components/shared/DailyProgressSummary";
import TodayTimeline from "@/components/shared/TodayTimeline";
import CreateTaskDialog from "@/components/shared/CreateTaskDialog";
import Shimmer from "@/components/shared/Shimmer";
import { ReviewSessionBadge } from "@/components/shared/ReviewSessionBadge";
import { useAuth } from "@/hooks/useAuth";
import { useTodayViewData } from "@/hooks/useTodayView";
import { useCreateStudySession } from "@/hooks/useStudySessions";
import { useCreatePlannerTask, useCompleteTask } from "@/hooks/usePlannerTasks";
import {
  useWeeklyReviews,
  useCreateReviewSession,
  useSkipReview,
} from "@/hooks/useReviewSchedule";
import { getWeekStartDate } from "@/lib/plannerUtils";
import type {
  StudySession,
  PlannerTask,
  ReviewSchedule,
} from "@/types/planner";
import type { CreatePlannerTaskInput } from "@/lib/schemas/planner";
import {
  CalendarCheck,
  Plus,
  Play,
  Loader2,
  AlertTriangle,
  SkipForward,
} from "lucide-react";
import { toast } from "sonner";

// ─── Main Component ─────────────────────────────────────────────────────────

const TodayViewPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const studentId = user?.id;

  // ─── Data ─────────────────────────────────────────────────────────────────
  const { sessions, tasks, deadlines, habits, isLoading, isError } =
    useTodayViewData(studentId);

  // ─── Review Data ───────────────────────────────────────────────────────────
  const weekStartDate = useMemo(() => getWeekStartDate(new Date()), []);
  const { data: weeklyReviews = [] } = useWeeklyReviews(
    studentId,
    weekStartDate
  );

  // ─── Mutations ────────────────────────────────────────────────────────────
  const createTask = useCreatePlannerTask();
  const completeTask = useCompleteTask();
  const createSession = useCreateStudySession();
  const createReviewSession = useCreateReviewSession();
  const skipReview = useSkipReview();

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

  // ─── Review Filtering ────────────────────────────────────────────────────
  const missedReviews = useMemo(
    () =>
      weeklyReviews.filter(
        (r) => r.status === "pending" && r.reviewDate < todayStr
      ),
    [weeklyReviews, todayStr]
  );

  const todayReviews = useMemo(
    () =>
      weeklyReviews.filter(
        (r) => r.reviewDate === todayStr && r.status === "pending"
      ),
    [weeklyReviews, todayStr]
  );

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleSessionStart = useCallback(
    (session: StudySession) => {
      navigate(`/student/focus/${session.id}`);
    },
    [navigate]
  );

  const handleSessionEdit = useCallback((_session: StudySession) => {
    toast.info("Edit feature coming soon");
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
    toast.info("Edit feature coming soon");
  }, []);

  const handleTaskDelete = useCallback((_task: PlannerTask) => {
    toast.info("Delete feature coming soon");
  }, []);

  const handleQuickAddSubmit = useCallback(
    (data: CreatePlannerTaskInput) => {
      createTask.mutate(data, {
        onSuccess: () => setQuickAddOpen(false),
      });
    },
    [createTask]
  );

  const handleStartReview = useCallback(
    (review: ReviewSchedule) => {
      createReviewSession.mutate(
        {
          reviewScheduleId: review.id,
          cloId: review.cloId,
          cloTitle: review.cloId, // CLO title not available on ReviewSchedule; use ID as fallback
          courseId: review.courseId ?? "",
        },
        {
          onSuccess: ({ sessionId }) => {
            navigate(`/student/focus/${sessionId}`);
          },
        }
      );
    },
    [createReviewSession, navigate]
  );

  const handleSkipReview = useCallback(
    (reviewId: string) => {
      skipReview.mutate(reviewId);
    },
    [skipReview]
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

      {/* Missed Reviews Section */}
      {missedReviews.length > 0 && (
        <Card className="border border-red-200 bg-red-50 shadow-sm rounded-xl overflow-hidden">
          <div className="px-4 py-3 flex items-center gap-2 border-b border-red-200">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <h2 className="text-sm font-bold text-red-700">Missed Reviews</h2>
            <span className="ms-auto text-xs font-medium text-red-500">
              {missedReviews.length} overdue
            </span>
          </div>
          <div
            className="p-4 space-y-2"
            role="list"
            aria-label="Missed reviews"
          >
            {missedReviews.map((review) => (
              <div
                key={review.id}
                role="listitem"
                className="flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-white p-3"
              >
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <ReviewSessionBadge
                      intervalDays={review.intervalDays}
                      status={review.status}
                    />
                    <span className="text-[10px] font-bold tracking-wide uppercase text-red-600 bg-red-100 border border-red-200 px-1.5 py-0.5 rounded">
                      Missed Review
                    </span>
                  </div>
                  <p className="text-xs font-medium text-slate-700 line-clamp-1">
                    CLO: {review.cloId}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Due: {review.reviewDate}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    size="sm"
                    className="h-7 gap-1 bg-gradient-to-r from-teal-500 to-blue-600 text-[11px] active:scale-95"
                    onClick={() => handleStartReview(review)}
                    disabled={createReviewSession.isPending}
                  >
                    <Play className="h-3 w-3" />
                    Start
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1 text-[11px]"
                    onClick={() => handleSkipReview(review.id)}
                    disabled={skipReview.isPending}
                  >
                    <SkipForward className="h-3 w-3" />
                    Skip
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Today's Reviews Section */}
      {todayReviews.length > 0 && (
        <Card className="border border-purple-200 bg-purple-50/50 shadow-sm rounded-xl overflow-hidden">
          <div className="px-4 py-3 flex items-center gap-2 border-b border-purple-200">
            <CalendarCheck className="h-4 w-4 text-purple-500" />
            <h2 className="text-sm font-bold text-purple-700">
              Today&apos;s Reviews
            </h2>
            <span className="ms-auto text-xs font-medium text-purple-500">
              {todayReviews.length} scheduled
            </span>
          </div>
          <div
            className="p-4 space-y-2"
            role="list"
            aria-label="Today's reviews"
          >
            {todayReviews.map((review) => (
              <div
                key={review.id}
                role="listitem"
                className="flex items-center justify-between gap-3 rounded-lg border border-purple-200 bg-white p-3"
              >
                <div className="flex-1 min-w-0 space-y-1">
                  <ReviewSessionBadge
                    intervalDays={review.intervalDays}
                    status={review.status}
                  />
                  <p className="text-xs font-medium text-slate-700 line-clamp-1">
                    CLO: {review.cloId}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    size="sm"
                    className="h-7 gap-1 bg-gradient-to-r from-teal-500 to-blue-600 text-[11px] active:scale-95"
                    onClick={() => handleStartReview(review)}
                    disabled={createReviewSession.isPending}
                  >
                    <Play className="h-3 w-3" />
                    Start
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1 text-[11px]"
                    onClick={() => handleSkipReview(review.id)}
                    disabled={skipReview.isPending}
                  >
                    <SkipForward className="h-3 w-3" />
                    Skip
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

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
