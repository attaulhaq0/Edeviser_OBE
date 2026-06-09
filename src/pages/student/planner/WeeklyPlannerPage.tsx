// =============================================================================
// WeeklyPlannerPage — Main page composing: week navigation,
// WeeklyCalendarGrid, WeeklyGoalPanel, tabs for Check Progress and Reflect
// =============================================================================

import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { format, parseISO, addDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import WeeklyCalendarGrid from "@/components/shared/WeeklyCalendarGrid";
import WeeklyGoalPanel from "@/components/shared/WeeklyGoalPanel";
import ProgressSummaryPanel from "@/components/shared/ProgressSummaryPanel";
import CourseStudyBreakdown from "@/components/shared/CourseStudyBreakdown";
import StudyTimeChart from "@/components/shared/StudyTimeChart";
import WeeklyReflectionPanel from "@/components/shared/WeeklyReflectionPanel";
import CreateSessionDialog from "@/components/shared/CreateSessionDialog";
import CreateTaskDialog from "@/components/shared/CreateTaskDialog";
import Shimmer from "@/components/shared/Shimmer";
import { useAuth } from "@/hooks/useAuth";
import { useWeeklyPlannerData } from "@/hooks/useWeeklyPlanner";
import { useStudentCourses } from "@/hooks/useStudentCourses";
import { useWeeklyProgressSummary } from "@/hooks/useWeeklyProgress";
import { useStudyTimeTrend } from "@/hooks/useStudyTimeAnalytics";
import { useCreateStudySession } from "@/hooks/useStudySessions";
import {
  useCreatePlannerTask,
  useCompleteTask,
  useDeletePlannerTask,
} from "@/hooks/usePlannerTasks";
import { useSaveWeeklyGoals } from "@/hooks/useWeeklyGoals";
import { useSaveWeeklyReflection } from "@/hooks/useSessionReflections";
import {
  useMonthlyDigest,
  useShareDigest,
  useRevokeDigestShare,
} from "@/hooks/useReflectionDigest";
import ReflectionDigestCard from "@/components/shared/ReflectionDigestCard";
import {
  getWeekStartDate,
  isWeekInPast,
  calculateGoalProgress,
} from "@/lib/plannerUtils";
import {
  buildPlannerWeek,
  getExampleGoals,
  getPlannerLocalizationState,
  type SuggestionCourse,
} from "@/lib/weeklyPlannerContent";
import i18n from "@/lib/i18n";
import type {
  WeekDay,
  StudySession,
  PlannerTask,
  GoalProgress,
  SuggestedStudySession,
} from "@/types/planner";
import type { ExampleGoalDisplay } from "@/components/shared/WeeklyGoalPanel";
import type {
  CreateStudySessionInput,
  CreatePlannerTaskInput,
} from "@/lib/schemas/planner";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  BarChart3,
  BookOpen,
} from "lucide-react";
import { toast } from "sonner";

const WeeklyPlannerPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation("student");
  const { user } = useAuth();
  const studentId = user?.id;

  // ─── Week Navigation ────────────────────────────────────────────────────────
  const [weekOffset, setWeekOffset] = useState(0);
  const todayStr = useMemo(() => format(new Date(), "yyyy-MM-dd"), []);

  const currentWeekStart = useMemo(() => {
    const baseStart = getWeekStartDate(new Date());
    const baseDate = parseISO(baseStart);
    const offsetDate = addDays(baseDate, weekOffset * 7);
    return format(offsetDate, "yyyy-MM-dd");
  }, [weekOffset]);

  const weekLabel = useMemo(() => {
    const start = parseISO(currentWeekStart);
    const end = addDays(start, 6);
    return `${format(start, "MMM d")} – ${format(end, "MMM d, yyyy")}`;
  }, [currentWeekStart]);

  const isPast = isWeekInPast(currentWeekStart, new Date());

  // ─── Data Fetching ──────────────────────────────────────────────────────────
  const { sessions, tasks, deadlines, goals, isLoading } = useWeeklyPlannerData(
    studentId,
    currentWeekStart
  );

  // Enrolled courses power suggested study sessions and dialog course pickers
  // (reuses the batched `useStudentCourses` hook — no per-card N+1).
  const { data: enrolledCourses } = useStudentCourses(studentId);

  const suggestionCourses: SuggestionCourse[] = useMemo(
    () => (enrolledCourses ?? []).map((c) => ({ id: c.id, name: c.name })),
    [enrolledCourses]
  );

  // ─── Progress & Analytics Data ────────────────────────────────────────────
  const {
    progress: weeklyProgress,
    goalProgress: progressGoals,
    isLoading: isProgressLoading,
  } = useWeeklyProgressSummary(studentId, currentWeekStart);

  const {
    weeklyData: studyTimeTrendData,
    averageMinutesPerWeek,
    isLoading: isTrendLoading,
  } = useStudyTimeTrend(studentId, 8);

  // ─── Mutations ──────────────────────────────────────────────────────────────
  const createSession = useCreateStudySession();
  const createTask = useCreatePlannerTask();
  const completeTask = useCompleteTask();
  const deleteTask = useDeletePlannerTask();
  const saveGoals = useSaveWeeklyGoals();
  const saveWeeklyReflection = useSaveWeeklyReflection();

  // ─── Monthly Digest ─────────────────────────────────────────────────────────
  const currentMonth = useMemo(() => format(new Date(), "yyyy-MM"), []);
  const { data: monthlyDigest } = useMonthlyDigest(studentId, currentMonth);
  const shareDigest = useShareDigest();
  const revokeDigestShare = useRevokeDigestShare();

  // ─── Dialog State ───────────────────────────────────────────────────────────
  const [sessionDialogOpen, setSessionDialogOpen] = useState(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(todayStr);

  // ─── Build WeekDay[] ────────────────────────────────────────────────────────
  // Derived assignments/deadlines per day plus suggested study sessions on
  // otherwise-empty days come from the pure `buildPlannerWeek` helper (R19.1/2).
  const weekData: WeekDay[] = useMemo(
    () =>
      buildPlannerWeek({
        weekStartDate: currentWeekStart,
        todayStr,
        sessions,
        tasks,
        deadlines,
        courses: suggestionCourses,
      }),
    [currentWeekStart, todayStr, sessions, tasks, deadlines, suggestionCourses]
  );

  // ─── Goal Progress ──────────────────────────────────────────────────────────
  const goalProgress: GoalProgress[] = useMemo(
    () => goals.map((g) => calculateGoalProgress(g, sessions, tasks)),
    [goals, sessions, tasks]
  );

  // ─── Handlers ───────────────────────────────────────────────────────────────
  const handleSessionStart = useCallback(
    (session: StudySession) => {
      navigate(`/student/focus/${session.id}`);
    },
    [navigate]
  );

  const handleSessionEdit = useCallback(
    (session: StudySession) => {
      // Edit-in-place is not yet a dialog; jump to focus mode where the
      // session can be started or the user can delete + recreate it.
      navigate(`/student/focus/${session.id}`);
    },
    [navigate]
  );

  const handleTaskToggle = useCallback(
    (task: PlannerTask) => {
      if (task.status !== "done") {
        completeTask.mutate(task.id);
      }
    },
    [completeTask]
  );

  const handleTaskEdit = useCallback(
    (task: PlannerTask) => {
      // Until the full edit dialog ships, the only inline edit is toggling
      // status. Click on the row's checkbox is the canonical action; the
      // pencil icon falls back to that.
      if (task.status !== "done") {
        completeTask.mutate(task.id, {
          onSuccess: () => toast.success("Task marked complete"),
        });
      } else {
        toast.info(
          "This task is already complete. Use Delete to remove it or Reopen via the calendar."
        );
      }
    },
    [completeTask]
  );

  const handleTaskDelete = useCallback(
    (task: PlannerTask) => {
      if (
        !window.confirm(`Delete task "${task.title}"? This cannot be undone.`)
      ) {
        return;
      }
      deleteTask.mutate(task.id, {
        onSuccess: () => toast.success("Task deleted"),
        onError: (err) => toast.error((err as Error).message),
      });
    },
    [deleteTask]
  );

  const handleDayClick = useCallback((date: string) => {
    setSelectedDate(date);
  }, []);

  const handleCreateSession = useCallback(
    (data: CreateStudySessionInput) => {
      createSession.mutate(data, {
        onSuccess: () => setSessionDialogOpen(false),
      });
    },
    [createSession]
  );

  const handleCreateTask = useCallback(
    (data: CreatePlannerTaskInput) => {
      createTask.mutate(data, {
        onSuccess: () => setTaskDialogOpen(false),
      });
    },
    [createTask]
  );

  // Planning a suggested session opens the create dialog pre-dated to that day;
  // the student can confirm the course/details before it is persisted (R19.2).
  const handlePlanSuggestion = useCallback(
    (suggestion: SuggestedStudySession) => {
      setSelectedDate(suggestion.date);
      setSessionDialogOpen(true);
    },
    []
  );

  // ─── Derived / Suggested Content Localization (R19.5/6/7) ────────────────────
  // Derived planner content and actions must be available in both en + ar.
  // If exactly one pack is present, withhold planner actions; if neither is
  // present, hide planner content entirely.
  const localizationState = useMemo(
    () =>
      getPlannerLocalizationState((lng) =>
        i18n.hasResourceBundle(lng, "student")
      ),
    []
  );
  const actionsEnabled = localizationState === "ready";

  // Localized example goals shown when the student has set no weekly goals.
  const exampleGoals: ExampleGoalDisplay[] = useMemo(
    () =>
      getExampleGoals().map((g) => ({
        label: t(`planner.goals.types.${g.goalType}`),
        targetText: t(`planner.goals.target.${g.goalType}`, {
          count: g.targetValue,
        }),
      })),
    [t]
  );
  const exampleGoalsCopy = useMemo(
    () => ({
      heading: t("planner.goals.exampleHeading"),
      hint: t("planner.goals.exampleHint"),
      cta: t("planner.goals.setGoals"),
    }),
    [t]
  );

  // ─── Render ─────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Shimmer className="h-12 rounded-xl" />
        <Shimmer className="h-64 rounded-xl" />
        <Shimmer className="h-40 rounded-xl" />
      </div>
    );
  }

  // R19.7: if neither language pack is available, hide planner content entirely
  // rather than render unlocalized text.
  if (localizationState === "hidden") {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <CalendarDays className="h-6 w-6 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Weekly Planner
            </h1>
            <p className="text-sm text-gray-500">{weekLabel}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Week navigation */}
          <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-0.5">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setWeekOffset((o) => o - 1)}
              aria-label="Previous week"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-3 text-xs font-medium"
              onClick={() => setWeekOffset(0)}
            >
              Today
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setWeekOffset((o) => o + 1)}
              aria-label="Next week"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Add buttons — withheld until both en + ar packs are available */}
          {actionsEnabled && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1 text-xs"
                onClick={() => {
                  setSelectedDate(todayStr);
                  setTaskDialogOpen(true);
                }}
              >
                <Plus className="h-3.5 w-3.5" />
                {t("planner.actions.addTask")}
              </Button>
              <Button
                size="sm"
                className="h-8 gap-1 bg-gradient-to-r from-teal-500 to-blue-600 text-xs active:scale-95"
                onClick={() => {
                  setSelectedDate(todayStr);
                  setSessionDialogOpen(true);
                }}
              >
                <Plus className="h-3.5 w-3.5" />
                {t("planner.actions.startSession")}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Calendar Grid */}
      <WeeklyCalendarGrid
        weekData={weekData}
        today={todayStr}
        onSessionStart={handleSessionStart}
        onSessionEdit={handleSessionEdit}
        onTaskToggle={handleTaskToggle}
        onTaskEdit={handleTaskEdit}
        onTaskDelete={handleTaskDelete}
        onDayClick={handleDayClick}
        onPlanSuggestion={actionsEnabled ? handlePlanSuggestion : undefined}
      />

      {/* Goals + Tabs Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Weekly Goals */}
        <div className="lg:col-span-1">
          <WeeklyGoalPanel
            goals={goals}
            progress={goalProgress}
            weekStartDate={currentWeekStart}
            onSave={(goalInputs) => saveGoals.mutate(goalInputs)}
            isEditable={!isPast && actionsEnabled}
            isPending={saveGoals.isPending}
            exampleGoals={exampleGoals}
            exampleGoalsCopy={exampleGoalsCopy}
          />
        </div>

        {/* Check Progress / Reflect Tabs */}
        <div className="lg:col-span-2">
          <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
            <Tabs defaultValue="progress">
              <div className="border-b px-6 py-3">
                <TabsList className="gap-2 bg-transparent p-0">
                  <TabsTrigger
                    value="progress"
                    className="rounded-xl px-4 py-1.5 text-sm font-medium data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=inactive]:bg-white data-[state=inactive]:text-gray-600 data-[state=inactive]:border data-[state=inactive]:border-gray-200"
                  >
                    <BarChart3 className="me-1.5 h-4 w-4" />
                    Check Progress
                  </TabsTrigger>
                  <TabsTrigger
                    value="reflect"
                    className="rounded-xl px-4 py-1.5 text-sm font-medium data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=inactive]:bg-white data-[state=inactive]:text-gray-600 data-[state=inactive]:border data-[state=inactive]:border-gray-200"
                  >
                    <BookOpen className="me-1.5 h-4 w-4" />
                    Reflect
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="progress" className="p-6">
                <div className="space-y-6">
                  {isProgressLoading ? (
                    <Shimmer className="h-48 rounded-xl" />
                  ) : (
                    <ProgressSummaryPanel
                      summary={weeklyProgress}
                      goals={progressGoals}
                    />
                  )}

                  {/* Course Study Breakdown */}
                  {!isProgressLoading &&
                    weeklyProgress.courseBreakdown.length > 0 && (
                      <CourseStudyBreakdown
                        data={weeklyProgress.courseBreakdown}
                      />
                    )}

                  {/* Study Time Trends */}
                  {isTrendLoading ? (
                    <Shimmer className="h-64 rounded-xl" />
                  ) : (
                    <StudyTimeChart
                      data={studyTimeTrendData}
                      averageMinutesPerWeek={averageMinutesPerWeek}
                    />
                  )}
                </div>
              </TabsContent>

              <TabsContent value="reflect" className="p-6">
                <div className="space-y-6">
                  <WeeklyReflectionPanel
                    weekStartDate={currentWeekStart}
                    onSave={(content) =>
                      saveWeeklyReflection.mutate({
                        content,
                        weekStartDate: currentWeekStart,
                      })
                    }
                    isPending={saveWeeklyReflection.isPending}
                  />

                  {/* Monthly Insights */}
                  {monthlyDigest && (
                    <ReflectionDigestCard
                      digest={monthlyDigest}
                      onShare={(digestId, role) =>
                        shareDigest.mutate({ digestId, role })
                      }
                      onRevokeShare={(digestId, role) =>
                        revokeDigestShare.mutate({ digestId, role })
                      }
                      isSharing={
                        shareDigest.isPending || revokeDigestShare.isPending
                      }
                    />
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </Card>
        </div>
      </div>

      {/* Dialogs */}
      <CreateSessionDialog
        open={sessionDialogOpen}
        onOpenChange={setSessionDialogOpen}
        defaultDate={selectedDate}
        courses={suggestionCourses}
        onSubmit={handleCreateSession}
        isPending={createSession.isPending}
      />
      <CreateTaskDialog
        open={taskDialogOpen}
        onOpenChange={setTaskDialogOpen}
        defaultDate={selectedDate}
        courses={suggestionCourses}
        onSubmit={handleCreateTask}
        isPending={createTask.isPending}
      />
    </div>
  );
};

export default WeeklyPlannerPage;
