export type WellnessHabitType = 'meditation' | 'hydration' | 'exercise' | 'sleep';
export type AcademicHabitType = 'login' | 'submit' | 'journal' | 'read';
export type HabitType = AcademicHabitType | WellnessHabitType;

export interface HeatmapDay {
  date: string; // YYYY-MM-DD
  academicCount: number;
  wellnessCount: number;
  totalCount: number;
  habits: CompletedHabit[];
}

export interface CompletedHabit {
  type: HabitType;
  category: 'academic' | 'wellness';
  value?: number;
  completedAt: string;
}

export interface WellnessHabitLog {
  id: string;
  studentId: string;
  date: string;
  wellnessType: WellnessHabitType;
  value: number | null;
  completedAt: string;
}

export interface WellnessPreferences {
  id: string;
  studentId: string;
  enabledHabits: WellnessHabitType[];
  parentVisibility: boolean;
  habitTargets: Record<string, { value: number; unit: string }>;
  reminderTimes: Record<string, string>;
  dismissedOnboardingTips: string[];
}

export interface HeatmapSummary {
  currentStreak: number;
  longestStreak: number;
  totalActiveDays: number;
}

export interface CompletionRateData {
  period: string;
  rate: number;
}

export interface DayOfWeekData {
  day: string;
  avgCompletions: number;
}

export interface CorrelationInsight {
  id: string;
  habitType: HabitType;
  academicMetric: string;
  description: string;
  strength: number;
}

export interface HabitReportRow {
  date: string;
  login: boolean;
  submit: boolean;
  journal: boolean;
  read: boolean;
  meditation?: boolean;
  hydration?: boolean;
  exercise?: boolean;
  sleep?: boolean;
  totalHabits: number;
  xpEarned: number;
  streakActive: boolean;
}

export interface DateRange {
  start: string;
  end: string;
}

// Level Integration Types
export interface LevelProgressionPoint {
  date: string;
  level: 1 | 2 | 3 | 4;
}

export interface StudentHabitLevel {
  currentLevel: 1 | 2 | 3 | 4;
  levelHistory: LevelProgressionPoint[];
  maxHabitsPerDay: number;
}

// Streak Recovery Types
export interface ComebackChallengeStatus {
  active: boolean;
  currentDay: number;
  totalDays: 3;
  startDate: string | null;
}

export interface StreakMilestone {
  days: 30 | 60 | 100;
  achievedDate: string;
}

// Wellness Scaffolding Types
export interface WellnessTip {
  id: string;
  habitType: WellnessHabitType;
  text: string;
  resourceUrl?: string;
  resourceLabel?: string;
  isOnboarding: boolean;
}

export interface WellnessTarget {
  habitType: WellnessHabitType;
  targetValue: number;
  unit: string;
}

export interface WellnessReminderConfig {
  habitType: WellnessHabitType;
  reminderTime: string | null;
  enabled: boolean;
}

// Correlation Confidence Types
export type CorrelationConfidenceLevel = 'early_pattern' | 'emerging_trend' | 'strong_pattern';

export interface CorrelationInsightWithConfidence extends CorrelationInsight {
  confidenceLevel: CorrelationConfidenceLevel;
  dataPointCount: number;
}
