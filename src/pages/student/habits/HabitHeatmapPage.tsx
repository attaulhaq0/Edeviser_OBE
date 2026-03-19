import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { parseAsString, useQueryState } from 'nuqs';
import { BarChart3, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import ErrorBoundary from '@/components/shared/ErrorBoundary';
import HeatmapSummaryStats from '@/components/shared/HeatmapSummaryStats';
import HeatmapFilters from '@/components/shared/HeatmapFilters';
import HeatmapGrid from '@/components/shared/HeatmapGrid';
import HeatmapTooltip from '@/components/shared/HeatmapTooltip';
import HabitMobileBottomSheet from '@/components/shared/HabitMobileBottomSheet';
import WellnessHabitLogger from '@/components/shared/WellnessHabitLogger';
import WellnessTipCard from '@/components/shared/WellnessTipCard';
import WellnessSettingsPanel from '@/components/shared/WellnessSettingsPanel';
import Shimmer from '@/components/shared/Shimmer';
import { useAuth } from '@/hooks/useAuth';
import { useHeatmapData, useHeatmapSummary } from '@/hooks/useHeatmapData';
import { useWellnessPreferences, useUpdateWellnessPreferences } from '@/hooks/useWellnessPreferences';
import { useWellnessHabitLogs, useLogWellnessHabit } from '@/hooks/useWellnessHabits';
import { useSemesterRange } from '@/hooks/useSemesterRange';
import { useCurrentTip, useDismissOnboardingTip } from '@/hooks/useWellnessTips';
import { useWellnessReminders, useUpdateWellnessReminder } from '@/hooks/useWellnessReminders';
import { useWellnessGoals, useDailyProgress, useUpdateWellnessGoal } from '@/hooks/useWellnessGoals';
import type { DateRange, WellnessHabitType, WellnessTarget } from '@/types/habits';

// ---------------------------------------------------------------------------
// Wellness Tip Display (per-habit)
// ---------------------------------------------------------------------------

const WellnessHabitTip = ({ habitType, studentId }: { habitType: WellnessHabitType; studentId: string }) => {
  const { tip, isOnboarding } = useCurrentTip(habitType, studentId);
  const dismissMutation = useDismissOnboardingTip();

  if (!tip) return null;

  return (
    <WellnessTipCard
      tip={tip}
      isOnboarding={isOnboarding}
      onDismiss={
        isOnboarding
          ? () => dismissMutation.mutate({ studentId, habitType })
          : undefined
      }
    />
  );
};

// ---------------------------------------------------------------------------
// Page Content (inside ErrorBoundary)
// ---------------------------------------------------------------------------

const HabitHeatmapContent = () => {
  const { user } = useAuth();
  const studentId = user?.id;

  // Semester range resolution
  const { data: semesterRange, isLoading: semesterLoading } = useSemesterRange(studentId);

  // URL-persisted filter
  const [filter] = useQueryState('habit', parseAsString.withDefault('all'));

  // Settings panel toggle
  const [showSettings, setShowSettings] = useState(false);

  // Today's date for wellness logging
  const today = useMemo(() => {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }, []);

  // Data hooks
  const resolvedRange: DateRange = semesterRange ?? { start: '', end: '' };
  const { data: heatmapData, isLoading: heatmapLoading } = useHeatmapData(studentId, resolvedRange, filter);
  const { data: summary, isLoading: summaryLoading } = useHeatmapSummary(studentId, heatmapData);
  const { data: preferences } = useWellnessPreferences(studentId);
  const { data: todayLogs } = useWellnessHabitLogs(studentId, today);
  const updatePreferences = useUpdateWellnessPreferences();
  const logWellnessHabit = useLogWellnessHabit();

  const enabledHabits = preferences?.enabledHabits ?? [];
  const parentVisibility = preferences?.parentVisibility ?? false;

  // Wellness reminders & goals
  const { data: reminders } = useWellnessReminders(studentId);
  const updateReminder = useUpdateWellnessReminder();
  const { data: goals } = useWellnessGoals(studentId);
  const dailyProgress = useDailyProgress(studentId, todayLogs ?? []);
  const updateGoal = useUpdateWellnessGoal();

  // Tooltip / bottom sheet state
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const hoveredDay = useMemo(
    () => heatmapData?.find((d) => d.date === hoveredDate) ?? null,
    [heatmapData, hoveredDate],
  );

  const selectedDay = useMemo(
    () => heatmapData?.find((d) => d.date === selectedDate) ?? null,
    [heatmapData, selectedDate],
  );

  // Handlers
  const handleToggleHabit = (type: WellnessHabitType, enabled: boolean) => {
    if (!studentId) return;
    const next = enabled
      ? [...enabledHabits, type]
      : enabledHabits.filter((h) => h !== type);
    updatePreferences.mutate({ studentId, enabledHabits: next, parentVisibility });
  };

  const handleToggleParentVisibility = (visible: boolean) => {
    if (!studentId) return;
    updatePreferences.mutate({ studentId, enabledHabits, parentVisibility: visible });
  };

  const handleLogWellness = (type: WellnessHabitType, value?: number) => {
    if (!studentId) return;
    logWellnessHabit.mutate({ studentId, wellnessType: type, value: value ?? null, date: today });
  };

  const handleReminderToggle = (habitType: WellnessHabitType, enabled: boolean) => {
    if (!studentId) return;
    updateReminder.mutate({
      studentId,
      habitType,
      reminderTime: enabled ? '09:00' : null,
    });
  };

  const handleReminderTimeChange = (habitType: WellnessHabitType, time: string) => {
    if (!studentId) return;
    updateReminder.mutate({ studentId, habitType, reminderTime: time || null });
  };

  const handleGoalSave = (target: WellnessTarget) => {
    if (!studentId) return;
    updateGoal.mutate({
      studentId,
      habitType: target.habitType,
      targetValue: target.targetValue,
      unit: target.unit,
    });
  };

  const isLoading = semesterLoading || heatmapLoading;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Habit Tracker</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSettings((s) => !s)}
            className="gap-1"
          >
            <Settings2 className="h-4 w-4" />
            Settings
          </Button>
          <Link to="/student/habits/analytics">
            <Button className="bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95 gap-1">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </Button>
          </Link>
        </div>
      </div>

      {/* Summary Stats */}
      {summaryLoading ? (
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Shimmer key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : summary ? (
        <HeatmapSummaryStats
          currentStreak={summary.currentStreak}
          longestStreak={summary.longestStreak}
          totalActiveDays={summary.totalActiveDays}
        />
      ) : null}

      {/* Filters */}
      <HeatmapFilters enabledWellnessHabits={enabledHabits} />

      {/* Heatmap Grid */}
      {isLoading ? (
        <Shimmer className="h-48 rounded-xl" />
      ) : resolvedRange.start && resolvedRange.end ? (
        <Card className="bg-white border-0 shadow-md rounded-xl p-4 relative">
          <HeatmapGrid
            data={heatmapData ?? []}
            semesterRange={resolvedRange}
            onCellClick={(date) => setSelectedDate(date)}
            onCellHover={(date) => setHoveredDate(date)}
          />
          {hoveredDay && hoveredDate && (
            <HeatmapTooltip
              date={hoveredDay.date}
              habits={hoveredDay.habits}
              xpEarned={0}
              streakActive={hoveredDay.academicCount > 0}
            />
          )}
        </Card>
      ) : null}

      {/* Mobile Bottom Sheet */}
      <HabitMobileBottomSheet
        date={selectedDay?.date ?? ''}
        habits={selectedDay?.habits ?? []}
        xpEarned={0}
        streakActive={selectedDay ? selectedDay.academicCount > 0 : false}
        open={!!selectedDate}
        onClose={() => setSelectedDate(null)}
      />

      {/* Wellness Section */}
      {enabledHabits.length > 0 && (
        <div className="space-y-3">
          {/* Wellness Tips */}
          {studentId && enabledHabits.map((ht) => (
            <WellnessHabitTip key={ht} habitType={ht} studentId={studentId} />
          ))}

          <WellnessHabitLogger
            enabledHabits={enabledHabits}
            todayLogs={todayLogs ?? []}
            onLog={handleLogWellness}
            dailyProgress={dailyProgress}
          />
        </div>
      )}

      {/* Settings Panel (collapsible) */}
      {showSettings && (
        <Card className="bg-white border-0 shadow-md rounded-xl p-4">
          <WellnessSettingsPanel
            enabledHabits={enabledHabits}
            parentVisibility={parentVisibility}
            onToggleHabit={handleToggleHabit}
            onToggleParentVisibility={handleToggleParentVisibility}
            reminders={reminders}
            onReminderToggle={handleReminderToggle}
            onReminderTimeChange={handleReminderTimeChange}
            goals={goals}
            goalProgress={dailyProgress}
            onGoalSave={handleGoalSave}
          />
        </Card>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Exported Page (wrapped in ErrorBoundary)
// ---------------------------------------------------------------------------

const HabitHeatmapPage = () => (
  <ErrorBoundary>
    <HabitHeatmapContent />
  </ErrorBoundary>
);

export default HabitHeatmapPage;
