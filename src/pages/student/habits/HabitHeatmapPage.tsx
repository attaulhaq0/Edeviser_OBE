import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { parseAsString, useQueryState } from "nuqs";
import { BarChart3, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import ErrorBoundary from "@/components/shared/ErrorBoundary";
import HeatmapSummaryStats from "@/components/shared/HeatmapSummaryStats";
import HeatmapHabitSummary from "@/components/shared/HeatmapHabitSummary";
import HeatmapPlainSummary from "@/components/shared/HeatmapPlainSummary";
import HeatmapFilters from "@/components/shared/HeatmapFilters";
import HeatmapGrid from "@/components/shared/HeatmapGrid";
import HeatmapTooltip from "@/components/shared/HeatmapTooltip";
import HabitMobileBottomSheet from "@/components/shared/HabitMobileBottomSheet";
import WellnessHabitLogger from "@/components/shared/WellnessHabitLogger";
import WellnessTipCard from "@/components/shared/WellnessTipCard";
import WellnessSettingsPanel from "@/components/shared/WellnessSettingsPanel";
import { PCard, SectionHeader, Shimmer } from "@/design-system";
import { useAuth } from "@/hooks/useAuth";
import {
  useHeatmapData,
  useHeatmapSummary,
  useHeatmapXpByDate,
} from "@/hooks/useHeatmapData";
import {
  useWellnessPreferences,
  useUpdateWellnessPreferences,
} from "@/hooks/useWellnessPreferences";
import {
  useWellnessHabitLogs,
  useLogWellnessHabit,
} from "@/hooks/useWellnessHabits";
import { useSemesterRange } from "@/hooks/useSemesterRange";
import { useStreakMilestones } from "@/hooks/useStreakMilestones";
import {
  computeHabitSummary,
  PERFECT_DAY_XP,
  ACADEMIC_HABITS_PER_DAY,
} from "@/lib/heatmapUtils";
import {
  useCurrentTip,
  useDismissOnboardingTip,
} from "@/hooks/useWellnessTips";
import {
  useWellnessReminders,
  useUpdateWellnessReminder,
} from "@/hooks/useWellnessReminders";
import {
  useWellnessGoals,
  useDailyProgress,
  useUpdateWellnessGoal,
} from "@/hooks/useWellnessGoals";
import type {
  DateRange,
  WellnessHabitType,
  WellnessTarget,
} from "@/types/habits";

// ---------------------------------------------------------------------------
// Wellness Tip Display (per-habit)
// ---------------------------------------------------------------------------

const WellnessHabitTip = ({
  habitType,
  studentId,
}: {
  habitType: WellnessHabitType;
  studentId: string;
}) => {
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
  const { data: semesterRange, isLoading: semesterLoading } =
    useSemesterRange(studentId);

  // URL-persisted filter
  const [filter] = useQueryState("habit", parseAsString.withDefault("all"));

  // Settings panel toggle
  const [showSettings, setShowSettings] = useState(false);

  // Today's date for wellness logging
  const today = useMemo(() => {
    const d = new Date();
    return (
      d.getFullYear() +
      "-" +
      String(d.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(d.getDate()).padStart(2, "0")
    );
  }, []);

  // Data hooks
  const resolvedRange: DateRange = semesterRange ?? { start: "", end: "" };
  const { data: heatmapData, isLoading: heatmapLoading } = useHeatmapData(
    studentId,
    resolvedRange,
    filter
  );
  const { data: summary, isLoading: summaryLoading } = useHeatmapSummary(
    studentId,
    heatmapData
  );
  // Achieved 30/60/100-day milestones (renders markers on the grid and
  // fires the consent-gated `streak_milestone_seen` analytics event).
  const milestones = useStreakMilestones(heatmapData);
  const { data: xpByDate } = useHeatmapXpByDate(studentId, resolvedRange);
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

  // Card element used as the tooltip's positioning context (the tooltip is
  // placed next to the hovered cell instead of flowing below the grid).
  const cardRef = useRef<HTMLDivElement>(null);
  const [tooltipPos, setTooltipPos] = useState<{
    left: number;
    top: number;
  } | null>(null);

  // Stable callbacks keep the memoized HeatmapGrid from re-rendering on hover.
  const handleCellHover = useCallback(
    (date: string | null) => setHoveredDate(date),
    []
  );
  const handleCellClick = useCallback(
    (date: string) => setSelectedDate(date),
    []
  );

  // Position the tooltip above the hovered cell, relative to the card. Runs in
  // a layout effect so measurement happens after the cell is in the DOM and
  // before paint (no flicker). getBoundingClientRect reads are compositor-safe
  // here because they occur only on hover change, not during scroll.
  useLayoutEffect(() => {
    const card = cardRef.current;
    if (!hoveredDate || !card) {
      setTooltipPos(null);
      return;
    }
    const cell = card.querySelector<HTMLElement>(
      `[data-testid="heatmap-cell-${hoveredDate}"]`
    );
    if (!cell) {
      setTooltipPos(null);
      return;
    }
    const cardRect = card.getBoundingClientRect();
    const cellRect = cell.getBoundingClientRect();
    setTooltipPos({
      left: cellRect.left - cardRect.left + cellRect.width / 2,
      top: cellRect.top - cardRect.top,
    });
  }, [hoveredDate]);

  const hoveredDay = useMemo(
    () => heatmapData?.find((d) => d.date === hoveredDate) ?? null,
    [heatmapData, hoveredDate]
  );

  const selectedDay = useMemo(
    () => heatmapData?.find((d) => d.date === selectedDate) ?? null,
    [heatmapData, selectedDate]
  );

  // Best-habit + completion-rate summary across the visible period (R7.2)
  const habitSummary = useMemo(
    () => computeHabitSummary(heatmapData ?? []),
    [heatmapData]
  );

  // Per-day recorded habit XP (R7.1, R7.4) and Perfect Day detection (R7.3)
  const hoveredXp = hoveredDate ? xpByDate?.[hoveredDate] ?? 0 : 0;
  const selectedXp = selectedDate ? xpByDate?.[selectedDate] ?? 0 : 0;
  const hoveredIsPerfectDay =
    (hoveredDay?.academicCount ?? 0) >= ACADEMIC_HABITS_PER_DAY;
  const selectedIsPerfectDay =
    (selectedDay?.academicCount ?? 0) >= ACADEMIC_HABITS_PER_DAY;

  // Handlers
  const handleToggleHabit = (type: WellnessHabitType, enabled: boolean) => {
    if (!studentId) return;
    const next = enabled
      ? [...enabledHabits, type]
      : enabledHabits.filter((h) => h !== type);
    updatePreferences.mutate({
      studentId,
      enabledHabits: next,
      parentVisibility,
    });
  };

  const handleToggleParentVisibility = (visible: boolean) => {
    if (!studentId) return;
    updatePreferences.mutate({
      studentId,
      enabledHabits,
      parentVisibility: visible,
    });
  };

  const handleLogWellness = (type: WellnessHabitType, value?: number) => {
    if (!studentId) return;
    logWellnessHabit.mutate({
      studentId,
      wellnessType: type,
      value: value ?? null,
      date: today,
    });
  };

  const handleReminderToggle = (
    habitType: WellnessHabitType,
    enabled: boolean
  ) => {
    if (!studentId) return;
    updateReminder.mutate({
      studentId,
      habitType,
      reminderTime: enabled ? "09:00" : null,
    });
  };

  const handleReminderTimeChange = (
    habitType: WellnessHabitType,
    time: string
  ) => {
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
      <SectionHeader
        icon={BarChart3}
        title="Habit Tracker"
        action={
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
              <Button variant="tactile" className="gap-1">
                <BarChart3 className="h-4 w-4" />
                Analytics
              </Button>
            </Link>
          </div>
        }
      />

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

      {/* Best-habit + completion-rate summary */}
      {!summaryLoading && heatmapData ? (
        <HeatmapHabitSummary summary={habitSummary} />
      ) : null}

      {/* Plain-language summary for younger students (R22.1) */}
      {!summaryLoading && heatmapData ? (
        <HeatmapPlainSummary
          summary={habitSummary}
          currentStreak={summary?.currentStreak ?? 0}
        />
      ) : null}

      {/* Filters */}
      <HeatmapFilters enabledWellnessHabits={enabledHabits} />

      {/* Heatmap Grid */}
      {isLoading ? (
        <Shimmer className="h-48 rounded-xl" />
      ) : resolvedRange.start && resolvedRange.end ? (
        <div ref={cardRef} className="relative">
          <PCard className="p-4">
            <HeatmapGrid
              data={heatmapData ?? []}
              semesterRange={resolvedRange}
              milestones={milestones}
              onCellClick={handleCellClick}
              onCellHover={handleCellHover}
            />
          </PCard>
          {/* Hover tooltip — positioned above the hovered cell (desktop/pointer
              only; touch uses the bottom sheet). pointer-events-none so it
              never steals the hover it depends on. */}
          {hoveredDay && hoveredDate && tooltipPos && (
            <div
              className="pointer-events-none absolute z-50 hidden md:block"
              style={{
                left: tooltipPos.left,
                top: tooltipPos.top,
                transform: "translate(-50%, calc(-100% - 10px))",
              }}
            >
              <HeatmapTooltip
                date={hoveredDay.date}
                habits={hoveredDay.habits}
                xpEarned={hoveredXp}
                streakActive={hoveredDay.academicCount > 0}
                isPerfectDay={hoveredIsPerfectDay}
                perfectDayXp={PERFECT_DAY_XP}
              />
            </div>
          )}
        </div>
      ) : null}

      {/* Mobile Bottom Sheet */}
      <HabitMobileBottomSheet
        date={selectedDay?.date ?? ""}
        habits={selectedDay?.habits ?? []}
        xpEarned={selectedXp}
        streakActive={selectedDay ? selectedDay.academicCount > 0 : false}
        isPerfectDay={selectedIsPerfectDay}
        perfectDayXp={PERFECT_DAY_XP}
        open={!!selectedDate}
        onClose={() => setSelectedDate(null)}
      />

      {/* Wellness Section */}
      {enabledHabits.length > 0 && (
        <div className="space-y-3">
          {/* Wellness Tips */}
          {studentId &&
            enabledHabits.map((ht) => (
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
        <PCard className="p-4">
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
        </PCard>
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
