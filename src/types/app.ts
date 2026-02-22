// =============================================================================
// Edeviser Platform — Shared Type Definitions
// =============================================================================

// -----------------------------------------------------------------------------
// Core Types
// -----------------------------------------------------------------------------

export type UserRole = 'admin' | 'coordinator' | 'teacher' | 'student' | 'parent';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  institution_id: string;
  avatar_url: string | null;
  is_active: boolean;
  onboarding_completed: boolean;
  portfolio_public: boolean;
  theme_preference: ThemePreference;
  language_preference: LanguagePreference;
  email_preferences: Record<string, boolean> | null;
  notification_preferences: NotificationPreferences | null;
  created_at: string;
  updated_at: string;
}

export interface AuthResult {
  success: boolean;
  error?: string;
  redirectTo?: string;
}

export interface Program {
  id: string;
  name: string;
  code: string;
  description: string | null;
  institution_id: string;
  coordinator_id: string | null;
  department_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LearningOutcome {
  id: string;
  type: 'ILO' | 'PLO' | 'CLO';
  title: string;
  description: string | null;
  institution_id: string;
  program_id: string | null;
  course_id: string | null;
  blooms_level: BloomsLevel | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type BloomsLevel =
  | 'Remembering'
  | 'Understanding'
  | 'Applying'
  | 'Analyzing'
  | 'Evaluating'
  | 'Creating';

export type AttainmentLevel = 'Excellent' | 'Satisfactory' | 'Developing' | 'Not_Yet';

export const AttainmentThresholds = {
  Excellent: 85,
  Satisfactory: 70,
  Developing: 50,
} as const;

// -----------------------------------------------------------------------------
// Gamification Types
// -----------------------------------------------------------------------------

export type XPSource =
  | 'login'
  | 'submission'
  | 'grade'
  | 'journal'
  | 'streak_milestone'
  | 'perfect_day'
  | 'first_attempt_bonus'
  | 'perfect_rubric'
  | 'badge_earned'
  | 'level_up'
  | 'streak_freeze_purchase'
  | 'discussion_question'
  | 'discussion_answer'
  | 'survey_completion'
  | 'quiz_completion';

export type XPSchedule = Record<XPSource, number>;

export interface BadgeDefinition {
  id: string;
  name: string;
  emoji: string;
  description: string;
  condition: string;
  is_mystery: boolean;
}

export type BadgeCatalog = BadgeDefinition[];

export interface LevelThreshold {
  level: number;
  xpRequired: number;
  title: string;
}

export type LevelThresholds = LevelThreshold[];

export type HabitType = 'login' | 'submit' | 'journal' | 'read';

export type LearningPathNodeType = 'assignment' | 'quiz' | 'milestone';

export interface BonusXPEventType {
  id: string;
  title: string;
  multiplier: number;
  start_at: string;
  end_at: string;
  is_active: boolean;
}

export type ActivityLogEventType =
  | 'login'
  | 'page_view'
  | 'submission'
  | 'journal'
  | 'streak_break'
  | 'assignment_view'
  | 'grading_start'
  | 'grading_end'
  | 'material_view'
  | 'announcement_view'
  | 'discussion_post'
  | 'quiz_attempt'
  | 'attendance_marked';

// -----------------------------------------------------------------------------
// AI Co-Pilot Types
// -----------------------------------------------------------------------------

export interface ModuleSuggestion {
  id: string;
  student_id: string;
  clo_id: string;
  suggestion_text: string;
  priority: number;
  created_at: string;
}

export interface AtRiskPrediction {
  id: string;
  student_id: string;
  risk_score: number;
  risk_factors: Record<string, unknown>;
  predicted_at: string;
}

export interface FeedbackDraft {
  id: string;
  submission_id: string;
  draft_text: string;
  teacher_id: string;
  created_at: string;
}

export interface AIFeedbackEntry {
  id: string;
  student_id: string;
  feedback_type: string;
  content: string;
  accepted: boolean;
  created_at: string;
}

// -----------------------------------------------------------------------------
// Portfolio & Enhancement Types
// -----------------------------------------------------------------------------

export interface PortfolioEntry {
  type: string;
  title: string;
  description: string;
  evidence_id?: string;
  badge_id?: string;
  created_at: string;
}

export interface StreakFreeze {
  available: number;
  max: number;
  cost_xp: number;
}

export interface OnboardingStep {
  id: string;
  role: UserRole;
  step_number: number;
  title: string;
  description: string;
  completed: boolean;
}

export interface ChecklistItem {
  id: string;
  label: string;
  completed: boolean;
  route?: string;
}

export type ThemePreference = 'light' | 'dark' | 'system';

export interface GradingStats {
  total_graded: number;
  avg_time_seconds: number;
  graded_today: number;
  pending_count: number;
}

// -----------------------------------------------------------------------------
// Utility Types
// -----------------------------------------------------------------------------

export interface DraftManagerEntry {
  key: string;
  content: unknown;
  updated_at: string;
}

export interface OfflineQueueItem {
  id: string;
  type: string;
  payload: unknown;
  created_at: string;
  retries: number;
}

export interface NotificationBatcherConfig {
  window_hours: number;
  daily_limit: number;
}

export interface ExportDataRequest {
  type: string;
  format: 'json' | 'csv';
  filters?: Record<string, unknown>;
}

// -----------------------------------------------------------------------------
// Institutional Management Types
// -----------------------------------------------------------------------------

export interface Semester {
  id: string;
  institution_id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

export interface CourseSection {
  id: string;
  course_id: string;
  section_code: string;
  teacher_id: string;
  semester_id: string;
  max_capacity: number;
}

export interface Survey {
  id: string;
  course_id: string;
  title: string;
  is_anonymous: boolean;
  status: string;
  created_by: string;
}

export interface SurveyQuestion {
  id: string;
  survey_id: string;
  question_text: string;
  question_type: string;
  order_index: number;
}

export interface CQIPlan {
  id: string;
  program_id: string;
  semester_id: string;
  title: string;
  findings: string;
  actions: string;
  status: string;
}

export interface InstitutionSettings {
  id: string;
  institution_id: string;
  grade_scale: Record<string, unknown>;
  kpi_thresholds: Record<string, unknown>;
  accreditation_body: string;
}

export interface Announcement {
  id: string;
  course_id: string;
  title: string;
  content: string;
  priority: string;
  created_by: string;
  created_at: string;
}

export interface CourseModule {
  id: string;
  course_id: string;
  title: string;
  order_index: number;
  is_published: boolean;
}

export interface CourseMaterial {
  id: string;
  module_id: string;
  title: string;
  type: string;
  file_url: string;
  order_index: number;
}

export interface DiscussionThread {
  id: string;
  course_id: string;
  title: string;
  content: string;
  author_id: string;
  is_pinned: boolean;
  created_at: string;
}

export interface DiscussionReply {
  id: string;
  thread_id: string;
  content: string;
  author_id: string;
  created_at: string;
}

export interface ClassSession {
  id: string;
  course_id: string;
  date: string;
  start_time: string;
  end_time: string;
  topic: string;
}

export interface AttendanceRecord {
  id: string;
  session_id: string;
  student_id: string;
  status: string;
  marked_by: string;
}

export interface Quiz {
  id: string;
  course_id: string;
  title: string;
  time_limit_minutes: number;
  max_attempts: number;
  is_published: boolean;
}

export interface QuizQuestion {
  id: string;
  quiz_id: string;
  question_text: string;
  question_type: string;
  points: number;
  options: unknown;
}

export interface QuizAttempt {
  id: string;
  quiz_id: string;
  student_id: string;
  score: number;
  started_at: string;
  completed_at: string;
}

export interface GradeCategory {
  id: string;
  course_id: string;
  name: string;
  weight_percent: number;
}

export interface TimetableSlot {
  id: string;
  course_id: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  room: string;
}

export interface AcademicCalendarEvent {
  id: string;
  institution_id: string;
  title: string;
  start_date: string;
  end_date: string;
  event_type: string;
}

export interface Department {
  id: string;
  institution_id: string;
  name: string;
  head_id: string;
  code: string;
}

export interface Transcript {
  student_id: string;
  courses: unknown[];
  gpa: number;
  generated_at: string;
}

export interface CourseFile {
  id: string;
  course_id: string;
  file_type: string;
  file_url: string;
  generated_at: string;
}

export interface ParentStudentLink {
  id: string;
  parent_id: string;
  student_id: string;
  relationship: string;
  verified: boolean;
}

export interface FeeStructure {
  id: string;
  institution_id: string;
  name: string;
  amount: number;
  currency: string;
  semester_id: string;
}

export interface FeePayment {
  id: string;
  student_id: string;
  fee_structure_id: string;
  amount_paid: number;
  status: PaymentStatus;
  paid_at: string;
}

export type PaymentStatus = 'pending' | 'paid' | 'overdue' | 'waived';

// -----------------------------------------------------------------------------
// Production Types
// -----------------------------------------------------------------------------

export type LanguagePreference = 'en' | 'ur' | 'ar';

export interface CookieConsent {
  analytics: boolean;
  marketing: boolean;
  consented_at: string;
}

export interface ImpersonationSession {
  admin_id: string;
  target_user_id: string;
  started_at: string;
  reason: string;
}

export interface BulkOperation {
  id: string;
  type: string;
  status: string;
  total_rows: number;
  processed_rows: number;
  errors: unknown[];
}

export interface GlobalSearchResult {
  type: string;
  id: string;
  title: string;
  subtitle: string;
  url: string;
}

export interface NotificationPreferences {
  in_app: boolean;
  email: boolean;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
}

export interface SessionInfo {
  id: string;
  device: string;
  ip: string;
  last_active: string;
  is_current: boolean;
}

export interface PWAConfig {
  cache_version: string;
  offline_routes: string[];
}

export interface RateLimiterConfig {
  max_requests: number;
  window_seconds: number;
}
