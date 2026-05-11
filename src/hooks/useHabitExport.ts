import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { generateHabitCSV, downloadCSV } from "@/lib/habitExport";
import { toast } from "sonner";
import type {
  HeatmapDay,
  HeatmapSummary,
  HabitReportRow,
  WellnessHabitType,
  DateRange,
  LevelProgressionPoint,
} from "@/types/habits";

interface UseHabitExportOptions {
  studentId: string | undefined;
  semesterRange: DateRange;
  enabledWellnessHabits: WellnessHabitType[];
  filter?: string;
  levelHistory?: LevelProgressionPoint[];
}

export const useHabitExport = ({
  studentId,
  semesterRange,
  enabledWellnessHabits,
  filter,
  levelHistory,
}: UseHabitExportOptions) => {
  const queryClient = useQueryClient();

  const exportCSV = useCallback(() => {
    if (!studentId) {
      toast.error("Unable to export — no student data");
      return;
    }

    // Read cached heatmap data from TanStack Query
    const heatmapData = queryClient.getQueryData<HeatmapDay[]>(
      queryKeys.heatmap.data(
        studentId,
        semesterRange.start,
        semesterRange.end,
        filter
      )
    );

    const summaryData = queryClient.getQueryData<HeatmapSummary>(
      queryKeys.heatmap.summary(studentId)
    );

    if (!heatmapData || !summaryData) {
      toast.error("No data available to export — please wait for data to load");
      return;
    }

    // Transform HeatmapDay[] into HabitReportRow[]
    const rows: HabitReportRow[] = heatmapData.map((day) => {
      const academicHabits = day.habits.filter(
        (h) => h.category === "academic"
      );
      const wellnessHabits = day.habits.filter(
        (h) => h.category === "wellness"
      );

      const row: HabitReportRow = {
        date: day.date,
        login: academicHabits.some((h) => h.type === "login"),
        submit: academicHabits.some((h) => h.type === "submit"),
        journal: academicHabits.some((h) => h.type === "journal"),
        read: academicHabits.some((h) => h.type === "read"),
        totalHabits: day.totalCount,
        xpEarned: 0, // XP per day not tracked in heatmap data
        streakActive: day.academicCount > 0,
      };

      // Add wellness habit columns
      for (const wh of enabledWellnessHabits) {
        (row as unknown as Record<string, unknown>)[wh] = wellnessHabits.some(
          (h) => h.type === wh
        );
      }

      return row;
    });

    const csv = generateHabitCSV(
      rows,
      {
        ...summaryData,
        totalXP: 0,
        consistencyScore:
          heatmapData.length > 0
            ? Math.round(
                (heatmapData.filter((d) => d.totalCount > 0).length /
                  heatmapData.length) *
                  100
              )
            : 0,
      },
      enabledWellnessHabits,
      levelHistory
    );

    const filename = `habit-report-${semesterRange.start}-to-${semesterRange.end}.csv`;
    downloadCSV(csv, filename);
    toast.success("Habit report exported");
  }, [
    studentId,
    semesterRange,
    enabledWellnessHabits,
    filter,
    levelHistory,
    queryClient,
  ]);

  return { exportCSV };
};
