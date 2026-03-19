import { useMemo } from 'react';
import {
  computeCompletionRate,
  computeConsistencyScore,
  computeDayOfWeekAverages,
  getBestDay,
} from '@/lib/heatmapUtils';
import { getLevelForDate } from '@/lib/levelAwareHeatmap';
import type {
  HeatmapDay,
  CompletionRateData,
  DayOfWeekData,
  LevelProgressionPoint,
} from '@/types/habits';

/**
 * Groups heatmap days into ISO weeks and computes completion rate per week.
 */
export const useWeeklyCompletionRates = (
  heatmapData: HeatmapDay[] | undefined,
  possiblePerDay: number,
): CompletionRateData[] => {
  return useMemo(() => {
    if (!heatmapData || heatmapData.length === 0 || possiblePerDay <= 0) return [];

    const weekMap = new Map<string, HeatmapDay[]>();
    for (const day of heatmapData) {
      const d = new Date(day.date + 'T00:00:00');
      // ISO week: get the Thursday of the week to determine the week number
      const thursday = new Date(d);
      thursday.setDate(d.getDate() + (4 - (d.getDay() || 7)));
      const yearStart = new Date(thursday.getFullYear(), 0, 1);
      const weekNum = Math.ceil(
        ((thursday.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
      );
      const key = `Week ${weekNum}`;
      const existing = weekMap.get(key) ?? [];
      existing.push(day);
      weekMap.set(key, existing);
    }

    return Array.from(weekMap.entries()).map(([period, days]) => {
      const totalCompleted = days.reduce((sum, d) => sum + d.totalCount, 0);
      const rate = computeCompletionRate(totalCompleted, possiblePerDay, days.length);
      return { period, rate };
    });
  }, [heatmapData, possiblePerDay]);
};

/**
 * Groups heatmap days into calendar months and computes completion rate per month.
 */
export const useMonthlyCompletionRates = (
  heatmapData: HeatmapDay[] | undefined,
  possiblePerDay: number,
): CompletionRateData[] => {
  return useMemo(() => {
    if (!heatmapData || heatmapData.length === 0 || possiblePerDay <= 0) return [];

    const monthNames = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];
    const monthMap = new Map<string, HeatmapDay[]>();

    for (const day of heatmapData) {
      const d = new Date(day.date + 'T00:00:00');
      const key = monthNames[d.getMonth()] ?? '';
      const existing = monthMap.get(key) ?? [];
      existing.push(day);
      monthMap.set(key, existing);
    }

    return Array.from(monthMap.entries()).map(([period, days]) => {
      const totalCompleted = days.reduce((sum, d) => sum + d.totalCount, 0);
      const rate = computeCompletionRate(totalCompleted, possiblePerDay, days.length);
      return { period, rate };
    });
  }, [heatmapData, possiblePerDay]);
};

/**
 * Computes the consistency score (% of days with at least 1 habit).
 */
export const useConsistencyScore = (
  heatmapData: HeatmapDay[] | undefined,
): number => {
  return useMemo(() => {
    if (!heatmapData || heatmapData.length === 0) return 0;
    return computeConsistencyScore(heatmapData, heatmapData.length);
  }, [heatmapData]);
};

/**
 * Computes day-of-week averages and identifies the best day.
 */
export const useBestDayOfWeek = (
  heatmapData: HeatmapDay[] | undefined,
): { averages: DayOfWeekData[]; bestDay: DayOfWeekData | null } => {
  return useMemo(() => {
    if (!heatmapData || heatmapData.length === 0) {
      return { averages: [], bestDay: null };
    }
    const averages = computeDayOfWeekAverages(heatmapData);
    const bestDay = getBestDay(averages);
    return { averages, bestDay };
  }, [heatmapData]);
};

/**
 * Groups heatmap days into ISO weeks and computes completion rate per week
 * using level-relative denominator via getLevelForDate.
 */
export const useLevelAwareWeeklyCompletionRates = (
  heatmapData: HeatmapDay[] | undefined,
  levelHistory: LevelProgressionPoint[],
  enabledWellnessCount: number,
): CompletionRateData[] => {
  return useMemo(() => {
    if (!heatmapData || heatmapData.length === 0 || levelHistory.length === 0) return [];

    const weekMap = new Map<string, HeatmapDay[]>();
    for (const day of heatmapData) {
      const d = new Date(day.date + 'T00:00:00');
      const thursday = new Date(d);
      thursday.setDate(d.getDate() + (4 - (d.getDay() || 7)));
      const yearStart = new Date(thursday.getFullYear(), 0, 1);
      const weekNum = Math.ceil(
        ((thursday.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
      );
      const key = `Week ${weekNum}`;
      const existing = weekMap.get(key) ?? [];
      existing.push(day);
      weekMap.set(key, existing);
    }

    return Array.from(weekMap.entries()).map(([period, days]) => {
      const totalCompleted = days.reduce((sum, d) => sum + d.totalCount, 0);
      const totalPossible = days.reduce((sum, d) => {
        const levelMax = getLevelForDate(d.date, levelHistory);
        return sum + levelMax + enabledWellnessCount;
      }, 0);
      const rate = totalPossible > 0
        ? Math.round((totalCompleted / totalPossible) * 100)
        : 0;
      return { period, rate };
    });
  }, [heatmapData, levelHistory, enabledWellnessCount]);
};

/**
 * Groups heatmap days into calendar months and computes completion rate per month
 * using level-relative denominator via getLevelForDate.
 */
export const useLevelAwareMonthlyCompletionRates = (
  heatmapData: HeatmapDay[] | undefined,
  levelHistory: LevelProgressionPoint[],
  enabledWellnessCount: number,
): CompletionRateData[] => {
  return useMemo(() => {
    if (!heatmapData || heatmapData.length === 0 || levelHistory.length === 0) return [];

    const monthNames = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];
    const monthMap = new Map<string, HeatmapDay[]>();

    for (const day of heatmapData) {
      const d = new Date(day.date + 'T00:00:00');
      const key = monthNames[d.getMonth()] ?? '';
      const existing = monthMap.get(key) ?? [];
      existing.push(day);
      monthMap.set(key, existing);
    }

    return Array.from(monthMap.entries()).map(([period, days]) => {
      const totalCompleted = days.reduce((sum, d) => sum + d.totalCount, 0);
      const totalPossible = days.reduce((sum, d) => {
        const levelMax = getLevelForDate(d.date, levelHistory);
        return sum + levelMax + enabledWellnessCount;
      }, 0);
      const rate = totalPossible > 0
        ? Math.round((totalCompleted / totalPossible) * 100)
        : 0;
      return { period, rate };
    });
  }, [heatmapData, levelHistory, enabledWellnessCount]);
};

/**
 * Academic-only level-aware weekly completion rates.
 * Uses getLevelForDate as the per-day denominator (no wellness).
 */
export const useLevelAwareAcademicWeeklyRates = (
  heatmapData: HeatmapDay[] | undefined,
  levelHistory: LevelProgressionPoint[],
): CompletionRateData[] => {
  return useMemo(() => {
    if (!heatmapData || heatmapData.length === 0 || levelHistory.length === 0) return [];

    const weekMap = new Map<string, HeatmapDay[]>();
    for (const day of heatmapData) {
      const d = new Date(day.date + 'T00:00:00');
      const thursday = new Date(d);
      thursday.setDate(d.getDate() + (4 - (d.getDay() || 7)));
      const yearStart = new Date(thursday.getFullYear(), 0, 1);
      const weekNum = Math.ceil(
        ((thursday.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
      );
      const key = `Week ${weekNum}`;
      const existing = weekMap.get(key) ?? [];
      existing.push(day);
      weekMap.set(key, existing);
    }

    return Array.from(weekMap.entries()).map(([period, days]) => {
      const totalCompleted = days.reduce((sum, d) => sum + d.academicCount, 0);
      const totalPossible = days.reduce((sum, d) => {
        return sum + getLevelForDate(d.date, levelHistory);
      }, 0);
      const rate = totalPossible > 0
        ? Math.round((totalCompleted / totalPossible) * 100)
        : 0;
      return { period, rate };
    });
  }, [heatmapData, levelHistory]);
};

/**
 * Academic-only level-aware monthly completion rates.
 * Uses getLevelForDate as the per-day denominator (no wellness).
 */
export const useLevelAwareAcademicMonthlyRates = (
  heatmapData: HeatmapDay[] | undefined,
  levelHistory: LevelProgressionPoint[],
): CompletionRateData[] => {
  return useMemo(() => {
    if (!heatmapData || heatmapData.length === 0 || levelHistory.length === 0) return [];

    const monthNames = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];
    const monthMap = new Map<string, HeatmapDay[]>();

    for (const day of heatmapData) {
      const d = new Date(day.date + 'T00:00:00');
      const key = monthNames[d.getMonth()] ?? '';
      const existing = monthMap.get(key) ?? [];
      existing.push(day);
      monthMap.set(key, existing);
    }

    return Array.from(monthMap.entries()).map(([period, days]) => {
      const totalCompleted = days.reduce((sum, d) => sum + d.academicCount, 0);
      const totalPossible = days.reduce((sum, d) => {
        return sum + getLevelForDate(d.date, levelHistory);
      }, 0);
      const rate = totalPossible > 0
        ? Math.round((totalCompleted / totalPossible) * 100)
        : 0;
      return { period, rate };
    });
  }, [heatmapData, levelHistory]);
};
