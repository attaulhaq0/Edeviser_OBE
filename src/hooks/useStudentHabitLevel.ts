import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import { getLevelMaxHabits } from "@/lib/levelAwareHeatmap";
import type { StudentHabitLevel, LevelProgressionPoint } from "@/types/habits";

export const useStudentHabitLevel = (studentId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.studentHabitLevel.detail(studentId ?? ""),
    enabled: !!studentId,
    queryFn: async (): Promise<StudentHabitLevel> => {
      if (!studentId) {
        return { currentLevel: 4, levelHistory: [], maxHabitsPerDay: 4 };
      }

      // Fetch current level from student_habit_levels
      let currentLevel: 1 | 2 | 3 | 4 = 4;
      try {
        const { data: levelData, error } = await supabase
          .from("student_habit_levels" as never)
          .select("current_level")
          .eq("student_id", studentId)
          .maybeSingle();

        if (error) {
          console.error("Failed to fetch student habit level:", error.message);
        } else if (
          levelData &&
          typeof levelData === "object" &&
          "current_level" in levelData
        ) {
          const raw = (levelData as Record<string, unknown>).current_level;
          if (typeof raw === "number" && raw >= 1 && raw <= 4) {
            currentLevel = raw as 1 | 2 | 3 | 4;
          }
        }
      } catch (e) {
        // Table may not exist yet — default to Level 4
        console.error(
          "student_habit_levels table not available, defaulting to Level 4",
          e
        );
      }

      // Fetch level history from student_habit_level_history
      const levelHistory: LevelProgressionPoint[] = [];
      try {
        const { data: historyData, error } = await supabase
          .from("student_habit_level_history" as never)
          .select("changed_at, new_level")
          .eq("student_id", studentId)
          .order("changed_at", { ascending: true });

        if (error) {
          console.error("Failed to fetch habit level history:", error.message);
        } else if (Array.isArray(historyData)) {
          for (const row of historyData) {
            const r = row as Record<string, unknown>;
            const date =
              typeof r.changed_at === "string" ? r.changed_at.slice(0, 10) : "";
            const level = typeof r.new_level === "number" ? r.new_level : 4;
            if (date && level >= 1 && level <= 4) {
              levelHistory.push({ date, level: level as 1 | 2 | 3 | 4 });
            }
          }
        }
      } catch (e) {
        // Table may not exist yet — empty history
        console.error("student_habit_level_history table not available", e);
      }

      return {
        currentLevel,
        levelHistory,
        maxHabitsPerDay: getLevelMaxHabits(currentLevel),
      };
    },
  });
};
