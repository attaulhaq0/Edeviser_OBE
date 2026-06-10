// =============================================================================
// ParentPlannerView — Read-only weekly planner showing linked student's
// sessions, tasks, goals with progress, and total study hours.
// No session notes, reflections, or evidence visible (private to student).
// =============================================================================

import { useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { format, parseISO, addDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import WeeklyCalendarGrid from "@/components/shared/WeeklyCalendarGrid";
import WeeklyGoalPanel from "@/components/shared/WeeklyGoalPanel";
import GradientCardHeader from "@/components/shared/GradientCardHeader";
import Shimmer from "@/components/shared/Shimmer";
import { useWeeklyPlannerData } from "@/hooks/useWeeklyPlanner";
import { getWeekStartDate, calculateGoalProgress } from "@/lib/plannerUtils";
import type { WeekDay, GoalProgress } from "@/types/planner";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Users,
} from "lucide-react";

const ParentPlannerView = () => {
  const { studentId } = useParams<{ studentId: string }>();
  const { t } = useTranslation("common");

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

  // ─── Data Fetching ──────────────────────────────────────────────────────────
  const { sessions, tasks, deadlines, goals, isLoading } = useWeeklyPlannerData(
    studentId,
    currentWeekStart
  );

  // ─── Build WeekDay[] ────────────────────────────────────────────────────────
  const weekData: WeekDay[] = useMemo(() => {
    const days: WeekDay[] = [];
    const start = parseISO(currentWeekStart);

    for (let i = 0; i < 7; i++) {
      const date = format(addDays(start, i), "yyyy-MM-dd");
      days.push({
        date,
        sessions: sessions.filter((s) => s.plannedDate === date),
        tasks: tasks.filter((t) => t.dueDate === date),
        deadlines: deadlines.filter((d) => {
          try {
            return d.dueDate.startsWith(date);
          } catch {
            return false;
          }
        }),
        isToday: date === todayStr,
      });
    }
    return days;
  }, [currentWeekStart, sessions, tasks, deadlines, todayStr]);

  // ─── Goal Progress ──────────────────────────────────────────────────────────
  const goalProgress: GoalProgress[] = useMemo(
    () => goals.map((g) => calculateGoalProgress(g, sessions, tasks)),
    [goals, sessions, tasks]
  );

  // ─── Total Study Hours KPI ──────────────────────────────────────────────────
  const totalStudyHours = useMemo(() => {
    const totalMinutes = sessions
      .filter((s) => s.status === "completed")
      .reduce((sum, s) => sum + (s.actualDurationMinutes ?? 0), 0);
    return (totalMinutes / 60).toFixed(1);
  }, [sessions]);

  const completedSessions = useMemo(
    () => sessions.filter((s) => s.status === "completed").length,
    [sessions]
  );

  const completedTasks = useMemo(
    () => tasks.filter((t) => t.status === "done").length,
    [tasks]
  );

  // ─── No Student Selected ───────────────────────────────────────────────────
  if (!studentId) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">
          {t("parentPlanner.title")}
        </h1>
        <Card className="bg-white border-0 shadow-md rounded-xl p-6">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Users className="h-12 w-12 text-gray-300 mb-4" />
            <p className="text-sm font-medium text-gray-700 mb-1">
              {t("parentPlanner.noStudent.title")}
            </p>
            <p className="text-sm text-gray-500 mb-4">
              {t("parentPlanner.noStudent.description")}
            </p>
            <Link to="/parent/children">
              <Button variant="outline" size="sm" className="gap-2 text-xs">
                <Users className="h-3.5 w-3.5" />
                {t("parentPlanner.noStudent.cta")}
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  // ─── Loading State ──────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Shimmer className="h-12 rounded-xl" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Shimmer className="h-24 rounded-xl" />
          <Shimmer className="h-24 rounded-xl" />
          <Shimmer className="h-24 rounded-xl" />
        </div>
        <Shimmer className="h-64 rounded-xl" />
        <Shimmer className="h-40 rounded-xl" />
      </div>
    );
  }

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <CalendarDays className="h-6 w-6 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {t("parentPlanner.title")}
            </h1>
            <p className="text-sm text-gray-500">{weekLabel}</p>
          </div>
        </div>

        {/* Week navigation */}
        <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-0.5">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => setWeekOffset((o) => o - 1)}
            aria-label={t("parentPlanner.previousWeek")}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-3 text-xs font-medium"
            onClick={() => setWeekOffset(0)}
          >
            {t("parentPlanner.today")}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => setWeekOffset((o) => o + 1)}
            aria-label={t("parentPlanner.nextWeek")}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card className="bg-white border-0 shadow-md rounded-xl p-4 group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black tracking-widest uppercase text-gray-500">
                {t("parentPlanner.studyHours")}
              </p>
              <p className="text-2xl font-black mt-1">{totalStudyHours}h</p>
            </div>
            <div className="p-2 rounded-lg bg-blue-50 group-hover:scale-110 transition-transform">
              <Clock className="h-5 w-5 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="bg-white border-0 shadow-md rounded-xl p-4 group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black tracking-widest uppercase text-gray-500">
                {t("parentPlanner.sessions")}
              </p>
              <p className="text-2xl font-black mt-1">{completedSessions}</p>
            </div>
            <div className="p-2 rounded-lg bg-teal-50 group-hover:scale-110 transition-transform">
              <CalendarDays className="h-5 w-5 text-teal-600" />
            </div>
          </div>
        </Card>

        <Card className="bg-white border-0 shadow-md rounded-xl p-4 group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black tracking-widest uppercase text-gray-500">
                {t("parentPlanner.tasksDone")}
              </p>
              <p className="text-2xl font-black mt-1">{completedTasks}</p>
            </div>
            <div className="p-2 rounded-lg bg-green-50 group-hover:scale-110 transition-transform">
              <Clock className="h-5 w-5 text-green-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Calendar Grid — read-only */}
      <Card
        className="bg-white border-0 shadow-md rounded-xl overflow-hidden gap-0 py-0"
        data-tour="planner"
      >
        <GradientCardHeader
          icon={CalendarDays}
          title={t("parentPlanner.weeklySchedule")}
        />
        <div className="p-4">
          <WeeklyCalendarGrid weekData={weekData} today={todayStr} readOnly />
        </div>
      </Card>

      {/* Weekly Goals — read-only */}
      <WeeklyGoalPanel
        goals={goals}
        progress={goalProgress}
        weekStartDate={currentWeekStart}
        onSave={() => {}}
        isEditable={false}
      />
    </div>
  );
};

export default ParentPlannerView;
