import type { HabitReportRow, HeatmapSummary, WellnessHabitType } from '@/types/habits';

export const generateHabitCSV = (
  data: HabitReportRow[],
  summary: HeatmapSummary & { totalXP: number; consistencyScore: number },
  enabledWellnessHabits: WellnessHabitType[],
): string => {
  const wellnessColumns = enabledWellnessHabits;
  const headers = [
    'date', 'login', 'submit', 'journal', 'read',
    ...wellnessColumns,
    'total_habits', 'xp_earned', 'streak_active',
  ];

  const rows = data.map(row => {
    const base = [
      row.date,
      row.login ? 'yes' : 'no',
      row.submit ? 'yes' : 'no',
      row.journal ? 'yes' : 'no',
      row.read ? 'yes' : 'no',
    ];
    const wellness = wellnessColumns.map(h => (row[h] ? 'yes' : 'no'));
    return [
      ...base,
      ...wellness,
      String(row.totalHabits),
      String(row.xpEarned),
      row.streakActive ? 'yes' : 'no',
    ].join(',');
  });

  const summaryRow = `# Summary: total_active_days=${summary.totalActiveDays},consistency_score=${summary.consistencyScore}%,longest_streak=${summary.longestStreak},total_xp=${summary.totalXP}`;

  return [summaryRow, headers.join(','), ...rows].join('\n');
};

export const downloadCSV = (csv: string, filename: string): void => {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};
