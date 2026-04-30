// =============================================================================
// Weekly Planner & Today View — Type Definitions
// =============================================================================

// -----------------------------------------------------------------------------
// Enums / Literal Unions
// -----------------------------------------------------------------------------

export type TimerMode = "pomodoro" | "custom";
export type SessionStatus =
  | "planned"
  | "in_progress"
  | "completed"
  | "cancelled";
export type TaskPriority = "low" | "medium" | "high";
export type TaskStatus = "pending" | "completed";
export type GoalType = "study_hours" | "sessions_completed" | "tasks_completed";
export type TimerState =
  | "idle"
  | "running"
  | "paused"
  | "break"
  | "long_break"
  | "completed";
export type PomodoroIntervalType = "work" | "break" | "long_break";
export type TimeOfDay = "morning" | "afternoon" | "evening";

// -----------------------------------------------------------------------------
// Core Domain Interfaces
// -----------------------------------------------------------------------------

export interface StudySession {
  id: string;
  studentId: string;
  courseId: string | null;
  courseName?: string;
  title: string;
  description: string | null;
  plannedDate: string; // YYYY-MM-DD
  plannedStartTime: string | null; // HH:MM
  plannedDurationMinutes: number;
  actualStartAt: string | null;
  actualEndAt: string | null;
  actualDurationMinutes: number | null;
  timerMode: TimerMode;
  status: SessionStatus;
  satisfactionRating: number | null;
  cloIds: string[] | null;
  createdAt: string;
}

export interface PlannerTask {
  id: string;
  studentId: string;
  title: string;
  description: string | null;
  dueDate: string;
  priority: TaskPriority;
  status: TaskStatus;
  courseId: string | null;
  courseName?: string;
  completedAt: string | null;
  createdAt: string;
}

export interface WeeklyGoal {
  id: string;
  studentId: string;
  weekStartDate: string;
  goalType: GoalType;
  targetValue: number;
}

export interface GoalProgress {
  goal: WeeklyGoal;
  currentValue: number;
  percentage: number;
  isMet: boolean;
}

export interface SessionEvidence {
  id: string;
  sessionId: string;
  studentId: string;
  fileUrl: string;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  notes: string | null;
  createdAt: string;
}

export interface SessionReflection {
  id: string;
  sessionId: string;
  studentId: string;
  content: string;
  wordCount: number;
  createdAt: string;
}

// -----------------------------------------------------------------------------
// Planner View Interfaces
// -----------------------------------------------------------------------------

export interface WeekDay {
  date: string;
  sessions: StudySession[];
  tasks: PlannerTask[];
  deadlines: UpcomingDeadline[];
  isToday: boolean;
}

export interface TimelineItem {
  id: string;
  type: "session" | "task" | "deadline" | "habit";
  time: string | null; // HH:MM or null for unscheduled
  timeOfDay: TimeOfDay | null;
  data: StudySession | PlannerTask | UpcomingDeadline | HabitStatus;
}

export interface DailyProgress {
  studyMinutes: number;
  tasksCompleted: number;
  sessionsCompleted: number;
}

export interface WeeklyProgressData {
  totalStudyMinutes: number;
  sessionsCompleted: number;
  tasksCompleted: number;
  courseBreakdown: CourseStudyTime[];
  cloBreakdown: CLOStudyTime[];
}

export interface CourseStudyTime {
  courseId: string;
  courseName: string;
  totalMinutes: number;
}

export interface CLOStudyTime {
  cloId: string;
  cloTitle: string;
  courseName: string;
  totalMinutes: number;
}

export interface WeeklyStudyData {
  weekStartDate: string;
  totalMinutes: number;
}

// -----------------------------------------------------------------------------
// Timer Persistence
// -----------------------------------------------------------------------------

export interface TimerPersistState {
  sessionId: string;
  mode: TimerMode;
  startedAt: number; // Date.now() timestamp
  totalElapsedMs: number;
  pausedAt: number | null;
  totalPausedMs: number;
  pomodoroInterval: number;
  pomodoroIntervalType: PomodoroIntervalType;
  targetDurationMs: number;
}

// -----------------------------------------------------------------------------
// Today View
// -----------------------------------------------------------------------------

export interface UpcomingDeadline {
  id: string;
  title: string;
  courseName: string;
  dueDate: string;
  urgency: "red" | "yellow" | "green";
}

export interface HabitStatus {
  login: boolean;
  submit: boolean;
  journal: boolean;
  read: boolean;
}

// -----------------------------------------------------------------------------
// Reflection Types
// -----------------------------------------------------------------------------

export interface SimpleReflectionValues {
  whatWentWell: string;
  whatWasChallenging: string;
  whatWillChange: string;
}

export interface GibbsReflectionValues {
  description: string;
  feelings: string;
  evaluation: string;
  analysis: string;
  conclusion: string;
  actionPlan: string;
}

// -----------------------------------------------------------------------------
// Flow Check-In
// -----------------------------------------------------------------------------

export type FlowResponse = "in_the_zone" | "stuck" | "too_easy";

// -----------------------------------------------------------------------------
// Quality Category
// -----------------------------------------------------------------------------

export type QualityCategory = "thoughtful" | "good_effort" | "needs_detail";

// -----------------------------------------------------------------------------
// Reflection Digest
// -----------------------------------------------------------------------------

export interface ReflectionDigest {
  id: string;
  studentId: string;
  month: string; // YYYY-MM
  themes: Array<{ topic: string; count: number }>;
  growthPatterns: Array<{ area: string; description: string }>;
  emotionalTrends: Array<{ label: string }>;
  suggestedFocus: Array<{ area: string; reason: string }>;
  sharedWith: Array<{
    role: "parent" | "advisor" | "teacher";
    sharedAt: string;
  }>;
  createdAt: string;
}

// -----------------------------------------------------------------------------
// Session Intent
// -----------------------------------------------------------------------------

export interface SuggestedIntent {
  concept: string;
  successCriterion: string;
}

export interface SessionIntent {
  id: string;
  sessionId: string;
  studentId: string;
  concept: string;
  successCriterion: string;
  isAutoSuggested: boolean;
  createdAt: string;
}

// -----------------------------------------------------------------------------
// Flow Check-In Record
// -----------------------------------------------------------------------------

export interface FlowCheckIn {
  id: string;
  sessionId: string;
  studentId: string;
  intervalNumber: number;
  response: FlowResponse;
  createdAt: string;
}

// -----------------------------------------------------------------------------
// Spaced Repetition / Review Schedule
// -----------------------------------------------------------------------------

export type ReviewStatus = "pending" | "completed" | "skipped";

export interface ReviewSchedule {
  id: string;
  studentId: string;
  cloId: string;
  courseId: string | null;
  sourceSessionId: string | null;
  reviewDate: string; // YYYY-MM-DD
  intervalDays: 1 | 3 | 7;
  status: ReviewStatus;
  reviewSessionId: string | null;
  createdAt: string;
  updatedAt: string;
}

// -----------------------------------------------------------------------------
// Reflection Templates / Quality
// -----------------------------------------------------------------------------

export type ReflectionTypeEnum = "session_reflection" | "journal_entry";
export type ReflectionTemplateType = "free_form" | "simple" | "gibbs";

export interface DigestTheme {
  topic: string;
  count: number;
}

export interface DigestPattern {
  area: string;
  description: string;
}

export interface DigestTrend {
  label: string;
}

export interface DigestFocus {
  area: string;
  reason: string;
}

export interface DigestShareEntry {
  role: "parent" | "advisor" | "teacher";
  sharedAt: string;
}

export interface ReflectionQualityScore {
  id: string;
  reflectionId: string;
  reflectionType: ReflectionTypeEnum;
  studentId: string;
  score: number; // 0–100
  originalityScore: number;
  relevanceScore: number;
  depthScore: number;
  flags: string[];
  scoredAt: string;
}
