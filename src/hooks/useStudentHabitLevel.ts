import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { getLevelMaxHabits } from "@/lib/levelAwareHeatmap";
import type { StudentHabitLevel, LevelProgressionPoint } from "@/types/habits";

/**
 * Returns the student's current Habit Difficulty Level.
 *
 * The `student_habit_levels` and `student_habit_level_history` tables are
 * defined in migration `20260901000010_create_missing_phantom_tables.sql`
 * but have not been applied to production. To prevent silent 404 errors
 * cluttering the console and to give a sane default, this hook short-circuits
 * with Level 4 (the default for all students) until the tables are deployed.
 */
export const useStudentHabitLevel = (studentId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.studentHabitLevel.detail(studentId ?? ""),
    enabled: !!studentId,
    // Long stale time — this is essentially constant data that rarely changes
    staleTime: 60 * 60 * 1000,
    queryFn: async (): Promise<StudentHabitLevel> => {
      // Tables not yet deployed — return default Level 4 with empty history.
      // This prevents 404 noise in console and lets dependent UI render.
      const currentLevel: 1 | 2 | 3 | 4 = 4;
      const levelHistory: LevelProgressionPoint[] = [];

      return {
        currentLevel,
        levelHistory,
        maxHabitsPerDay: getLevelMaxHabits(currentLevel),
      };
    },
  });
};
