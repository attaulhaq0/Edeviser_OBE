import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ChevronLeft, ChevronRight, CalendarDays, BarChart3, PenLine, Plus } from 'lucide-react';
import { useWeeklyPlannerData } from '@/hooks/useWeeklyPlanner';
import { useCreateStudySession } from '@/hooks/useStudySessions';
import { useCreatePlannerTask, useCompleteTask, useDeletePlannerTask } from '@/hooks/usePlannerTasks';
import { useSaveWeeklyGoals } from '@/hooks/useWeeklyGoals';
import { useWeeklyProgressSummary } from '@/hooks/useWeeklyProgress';
import { useStudyTimeTrend } from '@/hooks/useStudyTimeAnalytics';
import { useSaveWeeklyReflection } from '@/hooks/useSessionReflections';
import { useCourses } from '@/hooks/useCourses';
import { getWeekStartDate, isWeekInPast, calculateGoalProgress } from '@/lib/plannerUtils';
import WeeklyCalendarGrid from '@/components/shared/WeeklyCalendarGrid';
import WeeklyGoalPanel from '@/components/shared/WeeklyGoalPanel';
import ProgressSummaryPanel from '@/components/shared/ProgressSummaryPanel';
import CourseStudyBreakdown from '@/components/shared/CourseStudyBreakdown';
import StudyTimeChart from '@/components/shared/StudyTimeChart';
import WeeklyReflectionPanel from '@/components/shared/WeeklyReflectionPanel';
import CreateSessionDialog from '@/components/shared/CreateSessionDialog';
import CreateTaskDialog from '@/components/shared/CreateTaskDialog';
import Shimmer from '@/components/shared/Shimmer';
import type { WeekDay, GoalType } from '@/types/planner';
import type { CreateStudySessionInput, CreatePlannerTaskInput } from '@/lib/schemas/planner';

const WeeklyPlannerPage = () => {
  const navigate = useNavigate();
  const todayStr = new Date().toISOString().split('T')[0] as string;

  const [weekOffset, setWeekOffset] = useState(0);
  const weekStartDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + weekOffset * 7);
    return getWeekStartDate(d);
  }, [weekOffset]);

  const weekEndDate = useMemo(() => {
    const d = new Date(weekStartDate);
    d.setDate(d.getDate() + 6);
    return d.toISOString().split('T')[0] as string;
  }, [weekStartDate]);

  const { sessions, tasks, deadlines, goals, isLoading } = useWeeklyPlannerData(weekStartDate);
  const { data: coursesData } = useCourses({ pageSize: 100 });
  const courses = useMemo(
    () => (coursesData?.data ?? []).map((c) => ({ id: c.id, name: c.name })),
    [coursesData],
  );

  const createSession = useCreateStudySession();
  const createTask = useCreatePlannerTask();
  const completeTask = useCompleteTask();
  const deleteTask = useDeletePlannerTask();
  const saveGoals = useSaveWeeklyGoals();
  const { data: progressData, isLoading: progressLoading } = useWeeklyProgressSummary(weekStartDate);
  const { data: trendData } = useStudyTimeTrend(8);
  const weeklyReflection = useSaveWeeklyReflection();

  const [sessionDialogOpen, setSessionDialogOpen] = useState(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(todayStr);

  const isPast = isWeekInPast(weekStartDate, new Date());

  // Build week data for the grid
  const weekData: WeekDay[] = useMemo(() => {
    const days: WeekDay[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStartDate);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split('T')[0] as string;
      days.push({
        date: dateStr,
        sessions: sessions.filter((s) => s.plannedDate === dateStr),
        tasks: tasks.filter((t) => t.dueDate === dateStr),
        deadlines: deadlines.filter((dl) => dl.dueDate.startsWith(dateStr)),
        isToday: dateStr === todayStr,
      });
    }
    return days;
  }, [weekStartDate, sessions, tasks, deadlines, todayStr]);

  // Goal progress
  const goalProgress = useMemo(
    () => goals.map((g) => calculateGoalProgress(g, sessions, tasks)),
    [goals, sessions, tasks],
  );

  const formatWeekRange = () => {
    const start = new Date(weekStartDate);
    const end = new Date(weekEndDate);
    const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    return `${start.toLocaleDateString([], opts)} – ${end.toLocaleDateString([], { ...opts, year: 'numeric' })}`;
  };

  const handleCreateSession = (data: CreateStudySessionInput) => {
    createSession.mutate(data, { onSuccess: () => setSessionDialogOpen(false) });
  };

  const handleCreateTask = (data: CreatePlannerTaskInput) => {
    createTask.mutate(data, { onSuccess: () => setTaskDialogOpen(false) });
  };

  const handleSaveGoals = (goalDrafts: Array<{ goalType: GoalType; targetValue: number }>) => {
    saveGoals.mutate(
      goalDrafts.map((g) => ({
        weekStartDate,
        goalType: g.goalType,
        targetValue: g.targetValue,
      })),
    );
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Weekly Planner</h1>
          <p className="text-sm text-gray-500 mt-0.5">{formatWeekRange()}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="icon"
            variant="outline"
            onClick={() => setWeekOffset((o) => o - 1)}
            aria-label="Previous week"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setWeekOffset(0)}
            disabled={weekOffset === 0}
          >
            Today
          </Button>
          <Button
            size="icon"
            variant="outline"
            onClick={() => setWeekOffset((o) => o + 1)}
            aria-label="Next week"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Quick Add Buttons */}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          className="bg-gradient-to-r from-teal-500 to-blue-600 text-white active:scale-95"
          onClick={() => {
            setSelectedDate(todayStr);
            setSessionDialogOpen(true);
          }}
        >
          <Plus className="h-4 w-4" /> Study Session
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setSelectedDate(todayStr);
            setTaskDialogOpen(true);
          }}
        >
          <Plus className="h-4 w-4" /> Task
        </Button>
      </div>

      {/* Tabs: Plan / Check / Reflect */}
      <Tabs defaultValue="plan">
        <TabsList className="bg-white border border-slate-200 rounded-xl p-1 gap-1">
          <TabsTrigger
            value="plan"
            className="rounded-xl data-[state=active]:bg-blue-600 data-[state=active]:text-white"
          >
            <CalendarDays className="h-4 w-4" /> Plan
          </TabsTrigger>
          <TabsTrigger
            value="check"
            className="rounded-xl data-[state=active]:bg-blue-600 data-[state=active]:text-white"
          >
            <BarChart3 className="h-4 w-4" /> Check Progress
          </TabsTrigger>
          <TabsTrigger
            value="reflect"
            className="rounded-xl data-[state=active]:bg-blue-600 data-[state=active]:text-white"
          >
            <PenLine className="h-4 w-4" /> Reflect
          </TabsTrigger>
        </TabsList>

        <TabsContent value="plan" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <div className="lg:col-span-3">
              <WeeklyCalendarGrid
                weekData={weekData}
                today={todayStr}
                isLoading={isLoading}
                onStartSession={(session) => navigate(`/student/focus/${session.id}`)}
                onToggleTask={(task) => completeTask.mutate(task.id)}
                onDeleteTask={(task) => deleteTask.mutate(task.id)}
                onAddSession={(date) => {
                  setSelectedDate(date);
                  setSessionDialogOpen(true);
                }}
                onAddTask={(date) => {
                  setSelectedDate(date);
                  setTaskDialogOpen(true);
                }}
              />
            </div>
            <div>
              <WeeklyGoalPanel
                goals={goals}
                progress={goalProgress}
                onSave={handleSaveGoals}
                isEditable={!isPast}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="check" className="mt-4">
          {progressLoading ? (
            <Shimmer className="h-64 rounded-xl" />
          ) : progressData ? (
            <div className="space-y-6">
              <ProgressSummaryPanel summary={progressData} goals={goalProgress} />
              <CourseStudyBreakdown data={progressData.courseBreakdown} />
              {trendData && (
                <StudyTimeChart
                  data={trendData.data}
                  average={trendData.average}
                  courses={courses}
                />
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <BarChart3 className="h-12 w-12 mx-auto text-gray-300 mb-3" />
              <p className="text-sm">No progress data yet. Complete some sessions to see your stats.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="reflect" className="mt-4">
          <WeeklyReflectionPanel
            weekStartDate={weekStartDate}
            onSave={(content) => {
              const firstCourseId = courses[0]?.id ?? '';
              weeklyReflection.mutate({
                weekStartDate,
                content,
                courseId: firstCourseId,
              });
            }}
            isSaving={weeklyReflection.isPending}
          />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <CreateSessionDialog
        open={sessionDialogOpen}
        onOpenChange={setSessionDialogOpen}
        date={selectedDate}
        courses={courses}
        onSubmit={handleCreateSession}
        isPending={createSession.isPending}
      />
      <CreateTaskDialog
        open={taskDialogOpen}
        onOpenChange={setTaskDialogOpen}
        date={selectedDate}
        courses={courses}
        onSubmit={handleCreateTask}
        isPending={createTask.isPending}
      />
    </div>
  );
};

export default WeeklyPlannerPage;
