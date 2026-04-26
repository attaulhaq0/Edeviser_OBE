import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Plus, Play } from 'lucide-react';
import { useTodayViewData } from '@/hooks/useTodayView';
import { useCreateStudySession } from '@/hooks/useStudySessions';
import { useCreatePlannerTask, useCompleteTask } from '@/hooks/usePlannerTasks';
import { useCourses } from '@/hooks/useCourses';
import { isSessionMissed } from '@/lib/plannerUtils';
import DailyProgressSummary from '@/components/shared/DailyProgressSummary';
import TodayTimeline from '@/components/shared/TodayTimeline';
import CreateTaskDialog from '@/components/shared/CreateTaskDialog';
import CreateSessionDialog from '@/components/shared/CreateSessionDialog';
import Shimmer from '@/components/shared/Shimmer';
import type { TimelineItem, StudySession, PlannerTask } from '@/types/planner';

const TodayViewPage = () => {
  const navigate = useNavigate();
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0] as string;

  const { sessions, tasks, deadlines, habits, progress, isLoading } = useTodayViewData();
  const { data: coursesData } = useCourses({ pageSize: 100 });
  const courses = useMemo(
    () => (coursesData?.data ?? []).map((c) => ({ id: c.id, name: c.name })),
    [coursesData],
  );

  const createSession = useCreateStudySession();
  const createTask = useCreatePlannerTask();
  const completeTask = useCompleteTask();

  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [sessionDialogOpen, setSessionDialogOpen] = useState(false);

  // Build timeline items
  const timelineItems: TimelineItem[] = useMemo(() => {
    const items: TimelineItem[] = [];
    const now = new Date();

    for (const session of sessions) {
      const missed = isSessionMissed(session, now);
      items.push({
        id: session.id,
        type: 'session',
        time: session.plannedStartTime,
        timeOfDay: getTimeOfDay(session.plannedStartTime),
        data: missed ? { ...session, status: 'cancelled' as const } : session,
      });
    }

    for (const task of tasks) {
      items.push({
        id: task.id,
        type: 'task',
        time: null,
        timeOfDay: null,
        data: task,
      });
    }

    for (const deadline of deadlines) {
      const dueTime = new Date(deadline.dueDate);
      const timeStr = `${String(dueTime.getHours()).padStart(2, '0')}:${String(dueTime.getMinutes()).padStart(2, '0')}`;
      items.push({
        id: deadline.id,
        type: 'deadline',
        time: timeStr,
        timeOfDay: getTimeOfDay(timeStr),
        data: deadline,
      });
    }

    return items;
  }, [sessions, tasks, deadlines]);

  const handleStartUnplanned = () => {
    setSessionDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Shimmer className="h-8 w-48 rounded-lg" />
        <div className="grid grid-cols-3 gap-4">
          <Shimmer className="h-24 rounded-xl" />
          <Shimmer className="h-24 rounded-xl" />
          <Shimmer className="h-24 rounded-xl" />
        </div>
        <Shimmer className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Today</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {today.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setTaskDialogOpen(true)}
          >
            <Plus className="h-4 w-4" /> Quick Add
          </Button>
          <Button
            size="sm"
            className="bg-gradient-to-r from-teal-500 to-blue-600 text-white active:scale-95"
            onClick={handleStartUnplanned}
          >
            <Play className="h-4 w-4" /> Start Session
          </Button>
        </div>
      </div>

      {/* Daily Progress */}
      <DailyProgressSummary
        studyMinutes={progress.studyMinutes}
        tasksCompleted={progress.tasksCompleted}
        sessionsCompleted={progress.sessionsCompleted}
      />

      {/* Timeline */}
      <TodayTimeline
        items={timelineItems}
        habits={habits}
        onStartSession={(session: StudySession) => navigate(`/student/focus/${session.id}`)}
        onToggleTask={(task: PlannerTask) => completeTask.mutate(task.id)}
      />

      {/* Dialogs */}
      <CreateTaskDialog
        open={taskDialogOpen}
        onOpenChange={setTaskDialogOpen}
        date={todayStr}
        courses={courses}
        onSubmit={(data) => createTask.mutate(data, { onSuccess: () => setTaskDialogOpen(false) })}
        isPending={createTask.isPending}
      />
      <CreateSessionDialog
        open={sessionDialogOpen}
        onOpenChange={setSessionDialogOpen}
        date={todayStr}
        courses={courses}
        onSubmit={(data) => createSession.mutate(data, { onSuccess: () => setSessionDialogOpen(false) })}
        isPending={createSession.isPending}
      />
    </div>
  );
};

function getTimeOfDay(time: string): 'morning' | 'afternoon' | 'evening' | null {
  if (!time) return null;
  const hour = parseInt(time.split(':')[0] ?? '0', 10);
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

export default TodayViewPage;
