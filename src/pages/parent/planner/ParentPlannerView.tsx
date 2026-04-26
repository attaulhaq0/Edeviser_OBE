import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getWeekStartDate, calculateGoalProgress } from '@/lib/plannerUtils';
import WeeklyCalendarGrid from '@/components/shared/WeeklyCalendarGrid';
import WeeklyGoalPanel from '@/components/shared/WeeklyGoalPanel';
import Shimmer from '@/components/shared/Shimmer';
import type { StudySession, PlannerTask, WeeklyGoal, UpcomingDeadline, WeekDay } from '@/types/planner';

const ParentPlannerView = () => {
  const { studentId: paramStudentId } = useParams<{ studentId: string }>();
  const { user } = useAuth();
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

  // Resolve student ID from params or linked student
  const { data: linkedStudentId } = useQuery({
    queryKey: ['parent-linked-student', user?.id],
    queryFn: async () => {
      if (paramStudentId) return paramStudentId;
      const { data } = await supabase
        .from('parent_student_links')
        .select('student_id')
        .eq('parent_id', user!.id)
        .eq('verified', true)
        .limit(1)
        .maybeSingle();
      return data?.student_id as string | null;
    },
    enabled: !!user?.id,
  });

  const studentId = paramStudentId ?? linkedStudentId ?? '';

  // Fetch student name
  const { data: studentProfile } = useQuery({
    queryKey: ['student-profile', studentId],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', studentId)
        .maybeSingle();
      return data;
    },
    enabled: !!studentId,
  });

  // Fetch sessions
  const { data: sessions = [], isLoading: sessionsLoading } = useQuery({
    queryKey: queryKeys.studySessions.list({ studentId, weekStartDate, weekEndDate, parent: true } as Record<string, unknown>),
    queryFn: async (): Promise<StudySession[]> => {
      const { data, error } = await supabase
        .from('study_sessions')
        .select('*, courses(name)')
        .eq('student_id', studentId)
        .gte('planned_date', weekStartDate)
        .lte('planned_date', weekEndDate)
        .order('planned_date')
        .order('planned_start_time');
      if (error) throw error;
      return (data ?? []).map((s: Record<string, unknown>) => ({
        id: s.id as string,
        studentId: s.student_id as string,
        courseId: s.course_id as string,
        courseName: (s.courses as Record<string, unknown> | null)?.name as string | undefined,
        title: s.title as string,
        description: null,
        plannedDate: s.planned_date as string,
        plannedStartTime: s.planned_start_time as string,
        plannedDurationMinutes: s.planned_duration_minutes as number,
        actualStartAt: s.actual_start_at as string | null,
        actualEndAt: s.actual_end_at as string | null,
        actualDurationMinutes: s.actual_duration_minutes as number | null,
        timerMode: s.timer_mode as 'pomodoro' | 'custom',
        status: s.status as 'planned' | 'in_progress' | 'completed' | 'cancelled',
        satisfactionRating: null,
        cloIds: null,
        createdAt: s.created_at as string,
      }));
    },
    enabled: !!studentId,
  });

  // Fetch tasks
  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: queryKeys.plannerTasks.list({ studentId, weekStartDate, weekEndDate, parent: true } as Record<string, unknown>),
    queryFn: async (): Promise<PlannerTask[]> => {
      const { data, error } = await supabase
        .from('planner_tasks')
        .select('*, courses(name)')
        .eq('student_id', studentId)
        .gte('due_date', weekStartDate)
        .lte('due_date', weekEndDate)
        .order('due_date');
      if (error) throw error;
      return (data ?? []).map((t: Record<string, unknown>) => ({
        id: t.id as string,
        studentId: t.student_id as string,
        title: t.title as string,
        description: null,
        dueDate: t.due_date as string,
        priority: t.priority as 'low' | 'medium' | 'high',
        status: t.status as 'pending' | 'completed',
        courseId: t.course_id as string | null,
        courseName: (t.courses as Record<string, unknown> | null)?.name as string | undefined,
        completedAt: t.completed_at as string | null,
        createdAt: t.created_at as string,
      }));
    },
    enabled: !!studentId,
  });

  // Fetch goals
  const { data: goals = [] } = useQuery({
    queryKey: queryKeys.weeklyGoals.list({ studentId, weekStartDate, parent: true } as Record<string, unknown>),
    queryFn: async (): Promise<WeeklyGoal[]> => {
      const { data, error } = await supabase
        .from('weekly_goals')
        .select('*')
        .eq('student_id', studentId)
        .eq('week_start_date', weekStartDate);
      if (error) throw error;
      return (data ?? []).map((g: Record<string, unknown>) => ({
        id: g.id as string,
        studentId: g.student_id as string,
        weekStartDate: g.week_start_date as string,
        goalType: g.goal_type as 'study_hours' | 'sessions_completed' | 'tasks_completed',
        targetValue: Number(g.target_value),
      }));
    },
    enabled: !!studentId,
  });

  const isLoading = sessionsLoading || tasksLoading;

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
        deadlines: [] as UpcomingDeadline[],
        isToday: dateStr === todayStr,
      });
    }
    return days;
  }, [weekStartDate, sessions, tasks, todayStr]);

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

  // Total study hours for the week
  const totalStudyHours = useMemo(() => {
    const totalMin = sessions
      .filter((s) => s.status === 'completed')
      .reduce((sum, s) => sum + (s.actualDurationMinutes ?? 0), 0);
    return (totalMin / 60).toFixed(1);
  }, [sessions]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {studentProfile?.full_name ? `${studentProfile.full_name}'s Study Plan` : 'Study Plan'}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {formatWeekRange()} · {totalStudyHours}h studied
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="icon" variant="outline" onClick={() => setWeekOffset((o) => o - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={() => setWeekOffset(0)} disabled={weekOffset === 0}>
            This Week
          </Button>
          <Button size="icon" variant="outline" onClick={() => setWeekOffset((o) => o + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3">
          {isLoading ? (
            <Shimmer className="h-64 rounded-xl" />
          ) : (
            <WeeklyCalendarGrid
              weekData={weekData}
              today={todayStr}
              readOnly
            />
          )}
        </div>
        <div>
          <WeeklyGoalPanel
            goals={goals}
            progress={goalProgress}
            isEditable={false}
          />
        </div>
      </div>
    </div>
  );
};

export default ParentPlannerView;
