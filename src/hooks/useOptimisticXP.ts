// =============================================================================
// useOptimisticXP — Fire-and-forget XP award with optimistic cache updates
// Feature: edeviser-platform, Task 54.7
// =============================================================================

import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef } from "react";
import { awardXP, type AwardXPParams } from "@/lib/xpClient";
import { queryKeys } from "@/lib/queryKeys";
import { computeLevelData, type LevelData } from "@/hooks/useLevel";
import type { StudentKPIData } from "@/hooks/useStudentDashboard";

/**
 * Returns an `awardXPOptimistic` function that:
 * 1. Immediately updates the XP/level/streak caches for instant visual feedback
 * 2. Fires the real award-xp Edge Function in the background
 * 3. Rolls back on failure
 */
export const useOptimisticXP = () => {
  const queryClient = useQueryClient();

  const awardXPOptimistic = useCallback(
    async (params: AwardXPParams) => {
      const { studentId, xpAmount } = params;

      // ── Snapshot previous cache values ──────────────────────────────────
      const kpiKey = queryKeys.studentGamification.detail(studentId);
      const levelKey = queryKeys.studentGamification.list({
        scope: "level",
        studentId,
      });

      const previousKPI = queryClient.getQueryData<StudentKPIData>(kpiKey);
      const previousLevel = queryClient.getQueryData<LevelData>(levelKey);

      // ── Optimistically update KPI cache ─────────────────────────────────
      if (previousKPI) {
        queryClient.setQueryData<StudentKPIData>(kpiKey, {
          ...previousKPI,
          totalXP: previousKPI.totalXP + xpAmount,
        });
      }

      // ── Optimistically update Level cache ───────────────────────────────
      if (previousLevel) {
        const newTotal = previousLevel.xpTotal + xpAmount;
        queryClient.setQueryData<LevelData>(
          levelKey,
          computeLevelData(newTotal)
        );
      }

      // ── Fire real request ───────────────────────────────────────────────
      let result;
      try {
        result = await awardXP(params);
      } catch (err) {
        // Rollback on exception
        if (previousKPI) queryClient.setQueryData(kpiKey, previousKPI);
        if (previousLevel) queryClient.setQueryData(levelKey, previousLevel);
        throw err;
      }

      if (!result) {
        // Rollback on failure
        if (previousKPI) queryClient.setQueryData(kpiKey, previousKPI);
        if (previousLevel) queryClient.setQueryData(levelKey, previousLevel);
      } else {
        // Reconcile with server truth
        queryClient.invalidateQueries({
          queryKey: queryKeys.studentGamification.all,
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.xpTransactions.lists(),
        });
      }

      return result;
    },
    [queryClient]
  );

  return { awardXPOptimistic };
};

/**
 * Optimistically increment the streak counter in the KPI cache.
 * Called after a successful login streak increment.
 */
export const useOptimisticStreak = () => {
  const queryClient = useQueryClient();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const RECONCILE_DELAY_MS = 5000;

  const incrementStreakOptimistic = useCallback(
    (studentId: string) => {
      const kpiKey = queryKeys.studentGamification.detail(studentId);
      const previousKPI = queryClient.getQueryData<StudentKPIData>(kpiKey);

      if (previousKPI) {
        queryClient.setQueryData<StudentKPIData>(kpiKey, {
          ...previousKPI,
          currentStreak: previousKPI.currentStreak + 1,
        });
      }

      // Reconcile with server after a short delay
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        queryClient.invalidateQueries({
          queryKey: queryKeys.studentGamification.all,
        });
      }, RECONCILE_DELAY_MS);
    },
    [queryClient]
  );

  return { incrementStreakOptimistic };
};
