# Design Document — Edeviser Platform (Full Production)

## Overview

This design covers the complete production-ready Edeviser platform across all feature areas: authentication, RBAC, user management, program/course management, the full OBE engine (ILO/PLO/CLO, rubrics, assignments, submissions, grading, evidence, rollup), the gamification engine (XP, streaks, badges, levels, leaderboards, journals), four role-specific dashboards (plus parent portal), notifications (including peer milestone notifications and Perfect Day nudges), realtime, reporting, audit logging, student CLO progress tracking, XP transaction history, the AI Co-Pilot subsystem (personalized module suggestions, at-risk early warnings, and feedback draft generation), platform enhancements (student learning portfolio, streak freeze, role-specific onboarding, achievable read habit, dark mode, offline resilience & draft saving, GDPR data export, notification batching & rate limiting, error state components, and teacher grading stats), institutional management features (semester management, course sections, surveys, CQI loop, configurable KPI thresholds, multi-accreditation body support, course file generation, announcements, course content/materials, discussion forums, attendance tracking, quiz/exam module, gradebook with weighted categories, calendar view, timetable, department management, academic calendar, student transcripts, parent/guardian portal, and fee management), and production readiness improvements (multi-language RTL support for Urdu/Arabic, Progressive Web App with offline shell caching, disaster recovery procedures, Edge Function rate limiting, security headers including CSP/HSTS, cookie consent/privacy banner, Terms of Service & Privacy Policy pages, admin impersonation/support mode, bulk data operations, database connection pooling configuration, image/asset optimization, global search with Cmd+K, plagiarism detection placeholder, granular in-app notification preferences with quiet hours, and session management UI).

The platform is a React 18 SPA (TypeScript, Vite 6, Tailwind CSS v4, Shadcn/ui) backed by Supabase (PostgreSQL with RLS, GoTrue Auth, Edge Functions, Storage, Realtime). All data access is enforced at the database layer via Row Level Security policies.

### Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Auth provider | Supabase GoTrue | Native JWT, bcrypt, token refresh built-in |
| RBAC enforcement | PostgreSQL RLS + JWT claims | Security at data layer |
| State management | TanStack Query v5 | Server-state caching, optimistic updates |
| Form validation | React Hook Form + Zod | Schema-first, shared client/server |
| Data tables | TanStack Table | Sorting, filtering, pagination logic layer |
| URL state | nuqs | Type-safe URL search params for filters |
| Routing | React Router v7 | Role-based guards |
| Animations | Framer Motion + CSS keyframes | Gamification celebrations |
| Charts | Recharts | Attainment heatmaps, Bloom's distribution |
| Drag & drop | dnd-kit | ILO/PLO/CLO reorder |
| Toasts | Sonner | Non-blocking notifications |
| Realtime | Supabase Realtime (Phoenix) | Leaderboards, grades, notifications |
| PDF generation | Edge Function + jspdf/jspdf-autotable | Lightweight, no cold-start issues in Deno |
| File uploads | Supabase Storage | Native RLS on files |
| Audit logging | Immutable `audit_logs` table | Append-only compliance |
| i18n | i18next + react-i18next | English first, Urdu/Arabic ready |
| Celebrations | canvas-confetti | XP/submission confetti effects |

## Architecture

### High-Level Component Flow

```
React SPA (Vercel CDN)
├── AuthProvider (Supabase GoTrue)
├── QueryClientProvider (TanStack Query)
├── AppRouter (React Router v7)
│   ├── /login — LoginPage
│   ├── /portfolio/:student_id — PublicPortfolio (unauthenticated, opt-in only)
│   ├── /admin/* — AdminLayout
│   │   ├── /admin/dashboard — AdminDashboard
│   │   ├── /admin/users — UserListPage, UserForm, BulkImport
│   │   ├── /admin/programs — ProgramListPage, ProgramForm
│   │   ├── /admin/departments — DepartmentListPage, DepartmentForm
│   │   ├── /admin/semesters — SemesterListPage, SemesterForm
│   │   ├── /admin/outcomes — ILOListPage, ILOForm
│   │   ├── /admin/reports — ReportGenerator
│   │   ├── /admin/bonus-events — BonusXPEventManager
│   │   ├── /admin/settings — InstitutionSettings (KPI thresholds, grade scales, accreditation body)
│   │   ├── /admin/surveys — SurveyManager
│   │   ├── /admin/calendar — AcademicCalendarManager
│   │   ├── /admin/fees — FeeStructureManager, FeePaymentTracker
│   │   ├── /admin/parents — ParentInviteManager
│   │   └── /admin/audit — AuditLogViewer
│   ├── /coordinator/* — CoordinatorLayout
│   │   ├── /coordinator/dashboard — CoordinatorDashboard (includes CQI section)
│   │   ├── /coordinator/programs — ProgramDetail (includes accreditation tags)
│   │   ├── /coordinator/courses — CourseListPage (includes section management)
│   │   ├── /coordinator/outcomes — PLOListPage, PLOForm, CurriculumMatrix
│   │   ├── /coordinator/mapping — OutcomeMappingEditor
│   │   ├── /coordinator/cqi — CQIActionPlanManager
│   │   ├── /coordinator/surveys — SurveyManager (course exit surveys)
│   │   └── /coordinator/course-file — CourseFileGenerator
│   ├── /teacher/* — TeacherLayout
│   │   ├── /teacher/dashboard — TeacherDashboard
│   │   ├── /teacher/courses — CourseDetail (includes sections, modules, materials)
│   │   ├── /teacher/outcomes — CLOListPage, CLOForm, BloomsVerbGuide
│   │   ├── /teacher/rubrics — RubricBuilder
│   │   ├── /teacher/assignments — AssignmentListPage, AssignmentForm (with prerequisite gates)
│   │   ├── /teacher/quizzes — QuizBuilder, QuizListPage
│   │   ├── /teacher/grading — GradingQueue, GradingInterface
│   │   ├── /teacher/gradebook — GradebookView, GradeCategoryManager
│   │   ├── /teacher/attendance — AttendanceMarker, AttendanceReport
│   │   ├── /teacher/announcements — AnnouncementEditor
│   │   ├── /teacher/discussions — DiscussionModeration
│   │   ├── /teacher/calendar — CalendarView
│   │   ├── /teacher/timetable — TimetableView
│   │   └── /teacher/students — StudentHeatmap
│   └── /student/* — StudentLayout
│       ├── /student/dashboard — StudentDashboard (CLOProgress, AISuggestionWidget)
│       ├── /student/courses — CourseList (includes materials, modules)
│       ├── /student/assignments — AssignmentDetail, SubmissionForm
│       ├── /student/quizzes — QuizAttemptPage
│       ├── /student/progress — ProgressView, LearningPath (Bloom's-gated nodes), CLOProgressView
│       ├── /student/xp-history — XPTransactionHistory
│       ├── /student/journal — JournalEditor (contextual prompts)
│       ├── /student/leaderboard — LeaderboardView
│       ├── /student/discussions — DiscussionThreadList, ThreadDetail
│       ├── /student/calendar — CalendarView
│       ├── /student/timetable — TimetableView
│       ├── /student/surveys — SurveyResponsePage
│       └── /student/portfolio — StudentPortfolio (CLO mastery, badges, XP timeline, public link)
│   ├── /parent/* — ParentLayout
│   │   └── /parent/dashboard — ParentDashboard (read-only: grades, attendance, CLO progress, habits)
└── Supabase Backend
    ├── PostgreSQL + RLS (all tables)
    ├── GoTrue Auth
    ├── Realtime (Phoenix Channels)
    ├── Storage (assignments, avatars, reports)
    └── Edge Functions
        ├── bulk-import-users
        ├── calculate-attainment-rollup
        ├── award-xp
        ├── process-streak
        ├── check-badges
        ├── generate-accreditation-report (jspdf — no Puppeteer)
        ├── send-email-notification (Resend API)
        ├── streak-risk-cron (pg_cron → 8 PM daily)
        ├── weekly-summary-cron (pg_cron → Monday 8 AM)
        ├── perfect-day-prompt (pg_cron → 6 PM daily)
        ├── perfect-day-nudge-cron (pg_cron → 6 PM daily — nudge students with 3/4 habits)
        ├── compute-at-risk-signals (pg_cron → nightly)
        ├── seed-demo-data (idempotent seed script for 50 students)
        ├── health (health check endpoint)
        ├── ai-module-suggestion (on-demand per student)
        ├── ai-at-risk-prediction (pg_cron → nightly)
        ├── ai-feedback-draft (on-demand per grading session)
        ├── export-student-data (on-demand per student GDPR export)
        ├── notification-digest (pg_cron → 8 PM daily for digest subscribers)
        ├── generate-course-file (on-demand per course per semester)
        ├── generate-transcript (on-demand per student per semester)
        └── auto-grade-quiz (on quiz attempt submission)
```

## Components and Interfaces

### Core Providers

#### AuthProvider (`/src/providers/AuthProvider.tsx`)
```typescript
interface AuthContextValue {
  user: User | null;
  profile: Profile | null;
  role: 'admin' | 'coordinator' | 'teacher' | 'student' | 'parent' | null;
  institutionId: string | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}
```

#### QueryProvider (`/src/providers/QueryProvider.tsx`)
Wraps app in `QueryClientProvider` with devtools in development.

### OBE Engine Components

#### Rubric Builder (`/src/pages/teacher/rubrics/RubricBuilder.tsx`)
```typescript
interface RubricFormData {
  title: string;
  clo_id: string;
  is_template: boolean;
  criteria: Array<{
    criterion_name: string;
    sort_order: number;
    levels: Array<{ label: string; description: string; points: number }>;
    max_points: number;
  }>;
}
```

#### Grading Interface (`/src/pages/teacher/grading/GradingInterface.tsx`)
```typescript
interface GradeFormData {
  submission_id: string;
  rubric_selections: Array<{ criterion_id: string; level_index: number; points: number }>;
  total_score: number;
  score_percent: number;
  overall_feedback: string;
}
```

#### Evidence Generator (Edge Function: `/supabase/functions/calculate-attainment-rollup/`)
Triggered on grade insert. Creates immutable evidence records and cascades rollup through CLO → PLO → ILO.

#### Report Generator (Edge Function: `/supabase/functions/generate-accreditation-report/`)
Uses `jspdf` + `jspdf-autotable` for lightweight PDF generation in Deno Edge Functions. Puppeteer is not used due to cold-start overhead and memory constraints in serverless environments. The report aggregates outcome_attainment data, renders tables and charts into a PDF document, and uploads to Supabase Storage.

### Gamification Components

#### XP Engine (Edge Function: `/supabase/functions/award-xp/`)
```typescript
interface XPAwardPayload {
  student_id: string;
  xp_amount: number;
  source: 'login' | 'submission' | 'badge' | 'admin_adjustment' | 'perfect_day' | 'first_attempt_bonus' | 'perfect_rubric' | 'bonus_event' | 'discussion_question' | 'discussion_answer' | 'survey_completion' | 'quiz_completion';
  reference_id?: string;
  note?: string;
  bonus_multiplier?: number; // Applied during Bonus XP Weekend events
}
```

Note: The architecture doc references this as `process-xp-event`. The canonical name used in implementation is `award-xp`. Both refer to the same Edge Function.

#### Streak Processor (Edge Function: `/supabase/functions/process-streak/`)
Called on daily login. Increments or resets streak, checks milestones.

#### Badge Checker (Edge Function: `/supabase/functions/check-badges/`)
Called after XP award, submission, or streak update. Checks all badge conditions idempotently. Supports mystery badges with hidden conditions (Speed Demon, Night Owl, Perfectionist).

#### Habit Tracker (`/src/components/shared/HabitTracker.tsx`)
```typescript
interface HabitTrackerProps {
  studentId: string;
  days?: number; // default 7
}

type HabitType = 'login' | 'submit' | 'journal' | 'read';

interface HabitLog {
  student_id: string;
  date: string; // ISO date
  habit_type: HabitType;
  completed_at: string | null;
}
```

#### Learning Path (`/src/pages/student/progress/LearningPath.tsx`)
```typescript
interface LearningPathNode {
  assignment_id: string;
  title: string;
  blooms_level: BloomsLevel;
  is_locked: boolean;
  prerequisite?: {
    clo_id: string;
    clo_title: string;
    required_attainment: number; // percentage
    current_attainment: number;
  };
  status: 'locked' | 'available' | 'submitted' | 'graded';
}
```

#### Bloom's Verb Guide (`/src/components/shared/BloomsVerbGuide.tsx`)
```typescript
interface BloomsVerbGuideProps {
  selectedLevel: BloomsLevel | null;
  onVerbClick: (verb: string) => void;
}

const BLOOMS_VERBS: Record<BloomsLevel, string[]> = {
  remembering: ['define', 'list', 'recall', 'identify', 'state', 'name'],
  understanding: ['explain', 'describe', 'classify', 'summarize', 'paraphrase'],
  applying: ['use', 'implement', 'execute', 'solve', 'demonstrate', 'construct'],
  analyzing: ['compare', 'differentiate', 'examine', 'break down', 'infer'],
  evaluating: ['judge', 'critique', 'defend', 'argue', 'assess', 'recommend'],
  creating: ['design', 'develop', 'compose', 'build', 'formulate', 'produce'],
};
```

#### Contextual Journal Prompt Generator (`/src/lib/journalPromptGenerator.ts`)
```typescript
interface JournalPromptContext {
  clo_title: string;
  blooms_level: BloomsLevel;
  attainment_level: AttainmentLevel;
  rubric_feedback_summary: string;
}

interface GeneratedPrompt {
  intro: string;
  questions: string[]; // 3-4 Kolb's Cycle aligned questions
}

function generateJournalPrompt(context: JournalPromptContext): GeneratedPrompt;
```

#### Email Notification Service (Edge Function: `/supabase/functions/send-email-notification/`)
```typescript
interface EmailPayload {
  to: string;
  template: 'streak_risk' | 'weekly_summary' | 'new_assignment' | 'grade_released' | 'bulk_import_invitation' | 'parent_grade_released' | 'parent_attendance_alert' | 'parent_at_risk_warning';
  data: Record<string, unknown>;
}
```

#### Bonus XP Event Manager (`/src/pages/admin/BonusXPEventManager.tsx`)
```typescript
interface BonusXPEvent {
  id: string;
  title: string;
  multiplier: number; // default 2
  starts_at: string;
  ends_at: string;
  is_active: boolean;
  created_by: string;
}
```

#### Activity Logger (`/src/lib/activityLogger.ts`)
```typescript
interface ActivityLogEntry {
  student_id: string;
  event_type: 'login' | 'page_view' | 'submission' | 'journal' | 'streak_break' | 'assignment_view' | 'material_view' | 'announcement_view' | 'discussion_post' | 'quiz_attempt' | 'attendance_marked';
  metadata?: Record<string, unknown>;
}

function logActivity(entry: ActivityLogEntry): Promise<void>;
```

#### Peer Milestone Notification Service (wired into Badge Checker / Level System Edge Functions)
```typescript
// Triggered inside award-xp / check-badges Edge Functions on milestone events
interface PeerMilestonePayload {
  triggering_student_id: string;
  milestone_type: 'level_up' | 'rare_badge' | 'streak_milestone';
  milestone_detail: string; // e.g., "Level 8", "30-Day Legend", "Speed Demon"
  course_ids: string[]; // courses the student is enrolled in
}

// Creates notifications for all peers in shared courses (excluding triggering student)
// Skips if triggering student is in anonymous leaderboard mode
async function notifyPeersOfMilestone(payload: PeerMilestonePayload): Promise<void>;
```

#### Perfect Day Prompt Cron (Edge Function: `/supabase/functions/perfect-day-prompt/`)
```typescript
// pg_cron → 0 18 * * * (6 PM daily)
// Checks each active student's habit completion for the day
// If exactly 3 of 4 habits completed, sends in-app notification

interface PerfectDayCheckResult {
  student_id: string;
  completed_habits: HabitType[];
  missing_habit: HabitType;
}

// Notification text: "You're 1 habit away from a Perfect Day! ✨ Complete your [missing_habit] to earn 50 bonus XP."
```

#### CLO Progress View (`/src/pages/student/progress/CLOProgressView.tsx`)
```typescript
interface CLOProgressEntry {
  clo_id: string;
  clo_title: string;
  blooms_level: BloomsLevel;
  attainment_percent: number | null; // null = not yet assessed
  attainment_level: AttainmentLevel | null;
  sample_count: number;
  course_name: string;
  course_id: string;
}

interface CLOProgressViewProps {
  studentId: string;
  courseId?: string; // optional filter by course
}

// Expandable: clicking a CLO shows contributing evidence records
interface CLOEvidenceDetail {
  assignment_title: string;
  score_percent: number;
  graded_at: string;
}
```

#### XP Transaction History Component (`/src/pages/student/progress/XPHistory.tsx`)
```typescript
interface XPTransactionDisplay {
  id: string;
  source: string;
  source_label: string; // Human-readable: "On-time Submission", "Daily Login", etc.
  xp_amount: number;
  reference_description: string; // e.g., assignment title
  created_at: string;
}

interface XPHistoryProps {
  studentId: string;
}

type XPFilterPeriod = 'today' | 'this_week' | 'this_month' | 'all_time';

// Shows running total and per-source category summary
```

### AI Co-Pilot Components

#### AI Module Suggestion (Edge Function: `/supabase/functions/ai-module-suggestion/`)
```typescript
interface ModuleSuggestion {
  id: string;
  student_id: string;
  weak_clo_id: string;
  weak_clo_title: string;
  weak_clo_attainment: number;
  prerequisite_clo_id: string | null;
  prerequisite_clo_title: string | null;
  suggestion_text: string;
  social_proof_text: string | null; // "Students who improved CLO-3 before CLO-4 scored 34% higher"
  feedback: 'thumbs_up' | 'thumbs_down' | null;
}

interface AISuggestionWidgetProps {
  studentId: string;
}
```

#### AI At-Risk Early Warning (Edge Function: `/supabase/functions/ai-at-risk-prediction/`)
```typescript
interface AtRiskPrediction {
  id: string;
  student_id: string;
  student_name: string;
  at_risk_clo_id: string;
  at_risk_clo_title: string;
  probability_score: number; // 0-100
  contributing_signals: {
    login_frequency: 'low' | 'medium' | 'high';
    submission_pattern: 'early' | 'on_time' | 'late' | 'missed';
    attainment_trend: 'improving' | 'declining' | 'stagnant';
  };
  prediction_date: string;
  validated_outcome: 'correct' | 'incorrect' | null;
}

interface AtRiskWidgetProps {
  courseId: string;
  teacherId: string;
  onSendNudge: (studentId: string, message: string) => Promise<void>;
}
```

#### AI Feedback Draft Generation (Edge Function: `/supabase/functions/ai-feedback-draft/`)
```typescript
interface FeedbackDraftRequest {
  submission_id: string;
  rubric_id: string;
  rubric_selections: Array<{ criterion_id: string; level_index: number }>;
  student_id: string;
  clo_id: string;
}

interface FeedbackDraft {
  criterion_id: string;
  criterion_name: string;
  draft_comment: string;
  status: 'pending' | 'accepted' | 'edited' | 'rejected';
}

interface FeedbackDraftResponse {
  drafts: FeedbackDraft[];
  overall_draft: string;
}
```

#### AI Feedback Thumbs Component (`/src/components/shared/AIFeedbackThumbs.tsx`)
```typescript
interface AIFeedbackThumbsProps {
  feedbackId: string;
  currentFeedback: 'thumbs_up' | 'thumbs_down' | null;
  onFeedback: (feedback: 'thumbs_up' | 'thumbs_down') => Promise<void>;
}
```

### Platform Enhancement Components

#### Student Portfolio Page (`/src/pages/student/portfolio/StudentPortfolio.tsx`)
```typescript
interface StudentPortfolioProps {
  studentId: string;
}

interface PortfolioCLOMastery {
  clo_id: string;
  clo_title: string;
  blooms_level: BloomsLevel;
  attainment_level: AttainmentLevel;
  attainment_percent: number;
  course_name: string;
  course_id: string;
}

interface PortfolioBadge {
  badge_id: string;
  badge_name: string;
  badge_emoji: string;
  earned_at: string;
}

interface PortfolioXPDataPoint {
  date: string; // ISO date
  cumulative_xp: number;
}

interface SemesterAttainment {
  semester: string;
  academic_year: string;
  average_attainment: number;
}

// Route: /student/portfolio (authenticated)
// Route: /portfolio/:student_id (public, opt-in only)
```

#### Streak Freeze Shop (`/src/components/shared/StreakFreezeShop.tsx`)
```typescript
interface StreakFreezeShopProps {
  studentId: string;
  currentXP: number;
  freezesAvailable: number; // 0, 1, or 2
  onPurchase: () => Promise<void>;
}

// Displays current freeze inventory (snowflake icons)
// Purchase button disabled when: XP < 200 OR freezesAvailable >= 2
// Calls award-xp Edge Function with source = 'streak_freeze_purchase', xp_amount = -200
```

#### Onboarding Components
```typescript
// Admin Setup Wizard (`/src/components/shared/OnboardingWizard.tsx`)
interface OnboardingWizardProps {
  role: 'admin';
  steps: OnboardingStep[];
  onComplete: () => Promise<void>;
}

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  isCompleted: boolean;
  route: string; // navigate to this route on click
}

// Welcome Tour (`/src/components/shared/WelcomeTour.tsx`)
interface WelcomeTourProps {
  role: 'coordinator' | 'teacher' | 'student';
  steps: TourStep[];
  onComplete: () => Promise<void>;
}

interface TourStep {
  target: string; // CSS selector for highlight
  title: string;
  content: string;
  placement: 'top' | 'bottom' | 'left' | 'right';
}

// Quick Start Checklist (`/src/components/shared/QuickStartChecklist.tsx`)
interface QuickStartChecklistProps {
  role: UserRole;
  items: ChecklistItem[];
  onDismiss: () => void;
}

interface ChecklistItem {
  id: string;
  label: string;
  isCompleted: boolean;
  route: string;
}
```

#### Read Habit Timer (`/src/hooks/useReadHabitTimer.ts`)
```typescript
interface UseReadHabitTimerOptions {
  studentId: string;
  pageType: 'assignment_detail' | 'clo_progress';
  pageId: string; // assignment_id or course_id
}

interface UseReadHabitTimerReturn {
  elapsedSeconds: number;
  isCompleted: boolean; // true when ≥30 seconds
}

// Starts a timer on mount, logs activity with duration_seconds metadata
// When 30 seconds reached, inserts habit_log record for 'read' habit
// Uses useEffect cleanup to log partial duration on unmount
```

#### Theme Provider (`/src/providers/ThemeProvider.tsx`)
```typescript
type ThemePreference = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  theme: 'light' | 'dark'; // resolved theme (never 'system')
  preference: ThemePreference;
  setPreference: (pref: ThemePreference) => Promise<void>;
}

// Reads preference from profiles.theme_preference
// Applies 'dark' class to <html> element
// Listens to prefers-color-scheme media query when preference = 'system'
```

#### Dark Mode CSS Custom Properties (`/src/index.css`)
```css
/* Light mode (default) */
:root {
  --background: #ffffff;
  --card: #ffffff;
  --card-border: #e2e8f0; /* slate-200 */
  --text-primary: #0f172a; /* slate-900 */
  --text-secondary: #64748b; /* slate-500 */
  --surface-subtle: #f8fafc; /* slate-50 */
}

/* Dark mode */
.dark {
  --background: #020617; /* slate-950 */
  --card: #0f172a; /* slate-900 */
  --card-border: #334155; /* slate-700 */
  --text-primary: #f1f5f9; /* slate-100 */
  --text-secondary: #94a3b8; /* slate-400 */
  --surface-subtle: #1e293b; /* slate-800 */
}
```

#### Draft Manager (`/src/lib/draftManager.ts`)
```typescript
interface DraftManager {
  saveDraft(key: string, content: unknown): void;
  loadDraft<T>(key: string): T | null;
  clearDraft(key: string): void;
  startAutoSave(key: string, getContent: () => unknown, intervalMs?: number): () => void; // returns cleanup fn
}

// Keys: `journal-draft-${courseId}`, `submission-draft-${assignmentId}`
// Auto-save interval: 30 seconds (default)
// Clears draft on successful server save
```

#### Offline Queue (`/src/lib/offlineQueue.ts`)
```typescript
interface QueuedEvent {
  id: string;
  type: 'activity_log' | 'submission_upload';
  payload: unknown;
  timestamp: string; // original event time
  retryCount: number;
}

interface OfflineQueue {
  enqueue(event: Omit<QueuedEvent, 'id' | 'retryCount'>): void;
  flush(): Promise<void>; // process all queued events
  getQueueSize(): number;
}

// Listens to navigator.onLine + online/offline events
// On 'online' event, automatically flushes queue
// Max 3 retries per event; dead-letter after 3 failures
```

#### Student Data Export (Edge Function: `/supabase/functions/export-student-data/`)
```typescript
interface ExportRequest {
  student_id: string;
  format: 'json' | 'csv';
}

interface ExportResponse {
  download_url: string; // signed Supabase Storage URL
  file_size_bytes: number;
  generated_at: string;
}

// Queries: profiles, grades, outcome_attainment, xp_transactions,
//          journal_entries, badges (student_badges join), habit_logs
// Packages as JSON or CSV, uploads to Storage, returns signed URL
// Must complete within 30 seconds
```

#### Export Data Button (`/src/components/shared/ExportDataButton.tsx`)
```typescript
interface ExportDataButtonProps {
  studentId: string;
}

// Format selector (JSON/CSV) + Download button
// Shows loading spinner during generation
// Uses Sonner toast on success/failure
```

#### Notification Batcher (`/src/lib/notificationBatcher.ts`)
```typescript
interface NotificationBatcher {
  shouldBatch(studentId: string, type: string): boolean;
  getBatchedCount(studentId: string, type: string, windowMs: number): number;
  hasReachedDailyLimit(studentId: string): boolean; // max 5 peer milestone per day
  createBatchedNotification(studentId: string, type: string, items: string[]): NotificationPayload;
}

// Batching window: 1 hour for peer milestones
// Daily limit: 5 peer milestone notifications per student
// Grouping threshold: >3 of same type → grouped notification
```

#### Notification Digest (Edge Function: `/supabase/functions/notification-digest/`)
```typescript
// pg_cron → 0 20 * * * (8 PM daily)
// For students with digest preference enabled:
// - Aggregate all undelivered notifications from the day
// - Create single summary notification
// - Mark individual notifications as delivered
```

#### ErrorState Component (`/src/components/shared/ErrorState.tsx`)
```typescript
interface ErrorStateProps {
  title?: string;
  message: string;
  icon?: React.ReactNode; // defaults to AlertCircle from Lucide
  onRetry?: () => void;
  retryLabel?: string; // defaults to "Try Again"
  children?: React.ReactNode; // fallback content
}
```

#### Upload Progress Component (`/src/components/shared/UploadProgress.tsx`)
```typescript
interface UploadProgressProps {
  progress: number; // 0-100
  fileName: string;
  fileSize: number; // bytes
  status: 'uploading' | 'success' | 'error';
  onRetry?: () => void;
  onCancel?: () => void;
}
```

#### Reconnect Banner (`/src/components/shared/ReconnectBanner.tsx`)
```typescript
interface ReconnectBannerProps {
  isDisconnected: boolean;
  retryCount: number;
}

// Displays: "Live updates paused — Reconnecting..." with animated dots
// Auto-hides when connection is restored
```

#### Grading Stats Component (`/src/pages/teacher/dashboard/GradingStats.tsx`)
```typescript
interface GradingStatsData {
  graded_this_week: number;
  avg_grading_time_seconds: number;
  pending_count: number;
  grading_streak_days: number;
  velocity_trend: Array<{ date: string; count: number }>; // last 30 days
}

interface GradingStatsProps {
  teacherId: string;
}

// KPI card layout with Recharts line chart for velocity trend
// Grading time tracked via activity_logger: grading_start / grading_end events
```

### Dashboard Components

Each role dashboard follows the same layout pattern:
1. Welcome Hero Card (gradient background, key metrics)
2. KPI Cards Row (`grid grid-cols-2 md:grid-cols-4 gap-4`)
3. Tab Navigation (pill-style)
4. Tab Content (role-specific widgets)

### Institutional Management Components

#### Semester Manager (`/src/pages/admin/semesters/SemesterManager.tsx`)
```typescript
interface SemesterFormData {
  name: string;
  code: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

interface Semester {
  id: string;
  institution_id: string;
  name: string;
  code: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
}
```

#### Course Section Manager (`/src/pages/coordinator/courses/SectionManager.tsx`)
```typescript
interface CourseSectionFormData {
  course_id: string;
  section_code: string; // A, B, C
  teacher_id: string;
  capacity: number;
  is_active: boolean;
}

interface CourseSection {
  id: string;
  course_id: string;
  section_code: string;
  teacher_id: string;
  capacity: number;
  is_active: boolean;
  created_at: string;
}

interface SectionComparisonProps {
  courseId: string;
  sectionIds: string[];
}
```

#### Survey Module (`/src/pages/admin/surveys/SurveyManager.tsx`)
```typescript
type SurveyType = 'course_exit' | 'graduate_exit' | 'employer';
type QuestionType = 'likert' | 'mcq' | 'text';

interface SurveyFormData {
  title: string;
  type: SurveyType;
  target_outcomes: string[]; // outcome_ids
  is_active: boolean;
  questions: SurveyQuestionFormData[];
}

interface SurveyQuestionFormData {
  question_text: string;
  question_type: QuestionType;
  options: string[] | null; // for mcq
  sort_order: number;
}

interface SurveyResponseFormData {
  survey_id: string;
  responses: Array<{ question_id: string; response_value: string }>;
}
```

#### CQI Action Plan Manager (`/src/pages/coordinator/cqi/CQIManager.tsx`)
```typescript
type CQIStatus = 'planned' | 'in_progress' | 'completed' | 'evaluated';

interface CQIActionPlanFormData {
  program_id: string;
  semester_id: string;
  outcome_id: string;
  outcome_type: 'PLO' | 'CLO';
  baseline_attainment: number;
  target_attainment: number;
  action_description: string;
  responsible_person: string;
  status: CQIStatus;
  result_attainment?: number;
}

interface CQIActionPlan extends CQIActionPlanFormData {
  id: string;
  created_at: string;
  updated_at: string;
}
```

#### Institution Settings (`/src/pages/admin/settings/InstitutionSettings.tsx`)
```typescript
interface InstitutionSettingsFormData {
  attainment_thresholds: {
    excellent: number;
    satisfactory: number;
    developing: number;
  };
  success_threshold: number;
  accreditation_body: 'HEC' | 'QQA' | 'ABET' | 'NCAAA' | 'AACSB' | 'Generic';
  grade_scales: Array<{
    letter: string;
    min_percent: number;
    max_percent: number;
    gpa_points: number;
  }>;
}
```

#### Announcement Editor (`/src/pages/teacher/announcements/AnnouncementEditor.tsx`)
```typescript
interface AnnouncementFormData {
  course_id: string;
  title: string;
  content: string; // markdown
  is_pinned: boolean;
}

interface Announcement {
  id: string;
  course_id: string;
  author_id: string;
  title: string;
  content: string;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}
```

#### Course Module & Materials (`/src/pages/teacher/courses/ModuleManager.tsx`)
```typescript
type MaterialType = 'file' | 'link' | 'video' | 'text';

interface CourseModuleFormData {
  course_id: string;
  title: string;
  description: string;
  sort_order: number;
  is_published: boolean;
}

interface CourseMaterialFormData {
  module_id: string;
  title: string;
  type: MaterialType;
  content_url?: string;
  file_path?: string; // Supabase Storage
  description: string;
  sort_order: number;
  is_published: boolean;
  clo_ids?: string[]; // linked CLOs for traceability
}
```

#### Discussion Forum (`/src/pages/student/discussions/DiscussionForum.tsx`)
```typescript
interface DiscussionThreadFormData {
  course_id: string;
  title: string;
  content: string;
}

interface DiscussionThread {
  id: string;
  course_id: string;
  author_id: string;
  author_name: string;
  title: string;
  content: string;
  is_pinned: boolean;
  is_resolved: boolean;
  reply_count: number;
  created_at: string;
}

interface DiscussionReplyFormData {
  thread_id: string;
  content: string;
}

interface DiscussionReply {
  id: string;
  thread_id: string;
  author_id: string;
  author_name: string;
  content: string;
  is_answer: boolean;
  created_at: string;
}
```

#### Attendance Tracker (`/src/pages/teacher/attendance/AttendanceMarker.tsx`)
```typescript
type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';
type SessionType = 'lecture' | 'lab' | 'tutorial';

interface ClassSessionFormData {
  section_id: string;
  session_date: string;
  session_type: SessionType;
  topic: string;
}

interface AttendanceRecordFormData {
  session_id: string;
  records: Array<{ student_id: string; status: AttendanceStatus }>;
}

interface AttendanceReportProps {
  sectionId: string;
  studentId?: string; // optional filter
}
```

#### Quiz Builder (`/src/pages/teacher/quizzes/QuizBuilder.tsx`)
```typescript
type QuizQuestionType = 'mcq_single' | 'mcq_multi' | 'true_false' | 'short_answer' | 'fill_blank';

interface QuizFormData {
  course_id: string;
  title: string;
  description: string;
  clo_ids: string[];
  time_limit_minutes: number | null;
  max_attempts: number;
  is_published: boolean;
  due_date: string;
  questions: QuizQuestionFormData[];
}

interface QuizQuestionFormData {
  question_text: string;
  question_type: QuizQuestionType;
  options: string[] | null; // for MCQ/TF
  correct_answer: string | string[]; // string for single, array for multi
  points: number;
  sort_order: number;
}

interface QuizAttemptFormData {
  quiz_id: string;
  answers: Record<string, string | string[]>; // question_id → answer
}

interface QuizAttempt {
  id: string;
  quiz_id: string;
  student_id: string;
  answers: Record<string, string | string[]>;
  score: number;
  started_at: string;
  submitted_at: string;
  attempt_number: number;
}
```

#### Gradebook (`/src/pages/teacher/gradebook/GradebookView.tsx`)
```typescript
interface GradeCategoryFormData {
  course_id: string;
  name: string;
  weight_percent: number;
  sort_order: number;
}

interface GradebookEntry {
  student_id: string;
  student_name: string;
  categories: Array<{
    category_id: string;
    category_name: string;
    weight_percent: number;
    assessments: Array<{
      id: string;
      title: string;
      score: number | null;
      max_score: number;
    }>;
    subtotal_percent: number;
  }>;
  final_weighted_grade: number;
  letter_grade: string;
}

interface GradebookViewProps {
  courseId: string;
  sectionId?: string;
}
```

#### Calendar View (`/src/pages/shared/CalendarView.tsx`)
```typescript
type CalendarEventSource = 'assignment' | 'quiz' | 'class_session' | 'academic_calendar' | 'announcement';

interface CalendarEvent {
  id: string;
  title: string;
  start_date: string;
  end_date?: string;
  source: CalendarEventSource;
  course_id?: string;
  course_name?: string;
  color: string; // course-specific color
}

interface CalendarViewProps {
  role: 'student' | 'teacher';
  userId: string;
}
```

#### Timetable View (`/src/pages/shared/TimetableView.tsx`)
```typescript
type SlotType = 'lecture' | 'lab' | 'tutorial';

interface TimetableSlot {
  id: string;
  section_id: string;
  course_name: string;
  section_code: string;
  day_of_week: number; // 0-6
  start_time: string; // HH:MM
  end_time: string;
  room: string;
  slot_type: SlotType;
}

interface TimetableViewProps {
  role: 'student' | 'teacher';
  userId: string;
}
```

#### Department Manager (`/src/pages/admin/departments/DepartmentManager.tsx`)
```typescript
interface DepartmentFormData {
  name: string;
  code: string;
  head_of_department_id: string;
}

interface Department {
  id: string;
  institution_id: string;
  name: string;
  code: string;
  head_of_department_id: string;
  created_at: string;
}
```

#### Academic Calendar Manager (`/src/pages/admin/calendar/AcademicCalendarManager.tsx`)
```typescript
type AcademicEventType = 'semester_start' | 'semester_end' | 'exam_period' | 'holiday' | 'registration' | 'custom';

interface AcademicCalendarEventFormData {
  semester_id: string;
  title: string;
  event_type: AcademicEventType;
  start_date: string;
  end_date: string;
  is_recurring: boolean;
}
```

#### Transcript Generator (Edge Function: `/supabase/functions/generate-transcript/`)
```typescript
interface TranscriptRequest {
  student_id: string;
  semester_id?: string; // optional — if omitted, generates cumulative transcript
}

interface TranscriptData {
  student_info: { name: string; email: string; program: string; department: string };
  semesters: Array<{
    semester_name: string;
    courses: Array<{
      code: string;
      name: string;
      grade_categories: Array<{ name: string; weight: number; score: number }>;
      final_grade: number;
      letter_grade: string;
      clo_attainment_summary: Array<{ clo_title: string; attainment_percent: number }>;
    }>;
    semester_gpa: number;
  }>;
  cumulative_gpa: number;
}

interface TranscriptResponse {
  download_url: string;
  generated_at: string;
}
```

#### Course File Generator (Edge Function: `/supabase/functions/generate-course-file/`)
```typescript
interface CourseFileRequest {
  course_id: string;
  semester_id: string;
}

interface CourseFileResponse {
  download_url: string;
  file_type: 'pdf' | 'zip';
  generated_at: string;
}

// Contents: syllabus, CLO-PLO mapping, assessment instruments, sample work,
// CLO attainment charts, teacher reflection, CQI recommendations
```

#### Parent Dashboard (`/src/pages/parent/ParentDashboard.tsx`)
```typescript
interface ParentDashboardProps {
  parentId: string;
}

interface LinkedStudent {
  student_id: string;
  student_name: string;
  relationship: 'parent' | 'guardian';
  program_name: string;
}

interface ParentStudentView {
  grades: Array<{ course_name: string; final_grade: number; letter_grade: string }>;
  attendance: Array<{ course_name: string; attendance_percent: number }>;
  clo_progress: Array<{ clo_title: string; attainment_percent: number; course_name: string }>;
  habits: Array<{ date: string; habit_type: string; completed: boolean }>;
  xp_total: number;
  level: number;
  streak_current: number;
}
```

#### Fee Manager (`/src/pages/admin/fees/FeeManager.tsx`)
```typescript
type FeeType = 'tuition' | 'lab' | 'library' | 'exam';
type PaymentStatus = 'pending' | 'paid' | 'overdue' | 'waived';

interface FeeStructureFormData {
  program_id: string;
  semester_id: string;
  fee_type: FeeType;
  amount: number;
  currency: string;
  due_date: string;
}

interface FeePaymentFormData {
  student_id: string;
  fee_structure_id: string;
  amount_paid: number;
  payment_date: string;
  payment_method: string;
  receipt_number: string;
  status: PaymentStatus;
}

interface FeeCollectionSummary {
  total_expected: number;
  total_collected: number;
  total_outstanding: number;
  overdue_count: number;
}
```

### Shared Components (`/src/components/shared/`)

```typescript
// Reusable across all dashboards
AttainmentBar        // Color-coded progress bar
BloomsPill           // Bloom's taxonomy level badge
OutcomeTypeBadge     // ILO/PLO/CLO colored badge
XPDisplay            // Amber XP chip
StreakDisplay         // Flame animation streak counter
BadgeCard            // Badge with emoji and label
LevelProgress        // XP progress bar with level info
LeaderboardRow       // Ranked student row
KPICard              // Metric card with icon and hover effect
GradientCardHeader   // Brand gradient header for section cards
HabitGrid            // 7-day × 4-habit color-coded grid
LockedNode           // Locked assignment node with prerequisite tooltip
BloomsVerbGuide      // Verb suggestion panel for CLO builder
MysteryBadge         // Hidden badge with reveal animation
BonusEventBanner     // Active bonus XP event banner
AIFeedbackThumbs     // Thumbs up/down for AI suggestions
AISuggestionCard     // AI module suggestion card with feedback
AtRiskStudentRow     // AI at-risk prediction row with nudge button
CLOProgressBar       // Per-CLO attainment bar with Bloom's color
XPTransactionRow     // Single XP transaction display row
Shimmer              // Loading skeleton
EmptyState           // Empty state with icon and CTA
DataTable            // TanStack Table wrapper with sorting/filtering
ConfirmDialog        // Destructive action confirmation
ErrorState           // Reusable error display with retry button
UploadProgress       // File upload progress bar with percentage
ReconnectBanner      // "Live updates paused — Reconnecting..." banner
StreakFreezeShop     // Streak Freeze purchase UI with inventory display
ExportDataButton     // GDPR data export trigger with format selector
QuickStartChecklist  // Persistent onboarding checklist per role
SurveyForm           // Reusable survey response form (Likert/MCQ/text)
AttendanceGrid       // Session × student attendance marking grid
QuizQuestionCard     // Single quiz question display with answer input
GradebookMatrix      // Students × assessments weighted grade matrix
TimetableGrid        // Weekly day × time slot grid
AnnouncementCard     // Course announcement display card with markdown
MaterialItem         // Course material list item (file/link/video/text)
DiscussionThreadCard // Discussion thread preview card
CalendarEventCard    // Calendar event display with course color coding
CQIStatusBadge       // CQI action plan status pill (planned/in_progress/completed/evaluated)
SectionComparisonChart // Side-by-side section attainment comparison
FeeStatusBadge       // Fee payment status pill (pending/paid/overdue/waived)
ParentStudentCard    // Parent view of linked student summary
LanguageSelector     // Language dropdown (English/Urdu/Arabic) with RTL toggle
PWAInstallPrompt     // Mobile install prompt for PWA
CookieConsentBanner  // GDPR cookie consent with Accept/Reject/Manage options
ToSAcceptanceDialog  // Terms of Service acceptance gate on first login
ImpersonationBanner  // "Viewing as [user]" banner during admin impersonation
SearchCommand        // Global search (Cmd+K) with category-grouped results
PlagiarismPlaceholder // Plagiarism check placeholder in grading interface
ImageCompressor      // Client-side avatar compression utility display
```

## Data Models

### Complete Database Schema

All tables from the architecture document (Section 5) are implemented:
- `institutions`, `profiles`, `programs`, `courses`, `student_courses`
- `learning_outcomes`, `outcome_mappings`
- `rubrics`, `rubric_criteria`
- `assignments` (with `prerequisites` jsonb column for Bloom's-gated nodes), `submissions`, `grades`
- `evidence`, `outcome_attainment`
- `student_gamification`, `badges`, `xp_transactions`
- `journal_entries`
- `habit_logs` (student_id, date, habit_type, completed_at)
- `bonus_xp_events` (title, multiplier, starts_at, ends_at, is_active, created_by)
- `student_activity_log` (student_id, event_type, metadata jsonb, created_at — append-only)
- `ai_feedback` (student_id, suggestion_type, suggestion_text, feedback, created_at — Phase 2 schema)
- `audit_logs`, `notifications`

Note: The `profiles` table includes an `email_preferences` jsonb column (default: all notifications enabled) for per-user email opt-out settings (see Requirement 39). It also includes `onboarding_completed` boolean (default false, Requirement 60), `portfolio_public` boolean (default false, Requirement 58), and `theme_preference` text (default 'system', Requirement 62).

New tables for institutional management and LMS features:
- `semesters` (Requirement 68)
- `departments` (Requirement 83)
- `course_sections` (Requirement 69)
- `surveys`, `survey_questions`, `survey_responses` (Requirement 70)
- `cqi_action_plans` (Requirement 71)
- `institution_settings` (Requirement 72)
- `program_accreditations` (Requirement 73)
- `announcements` (Requirement 75)
- `course_modules`, `course_materials` (Requirement 76)
- `discussion_threads`, `discussion_replies` (Requirement 77)
- `class_sessions`, `attendance_records` (Requirement 78)
- `quizzes`, `quiz_questions`, `quiz_attempts` (Requirement 79)
- `grade_categories` (Requirement 80)
- `timetable_slots` (Requirement 82)
- `academic_calendar_events` (Requirement 84)
- `parent_student_links` (Requirement 86)
- `fee_structures`, `fee_payments` (Requirement 87)

Column additions: `courses.semester_id`, `programs.department_id`, `student_courses.section_id`.

Note: `outcome_attainment` requires a unique index for UPSERT rollup logic:
```sql
CREATE UNIQUE INDEX idx_attainment_unique ON outcome_attainment(
  outcome_id,
  COALESCE(student_id, '00000000-0000-0000-0000-000000000000'),
  COALESCE(course_id, '00000000-0000-0000-0000-000000000000'),
  scope
);
```

### App Types (`/src/types/`)

AI Co-Pilot types exported from `src/types/ai.ts`:

```typescript
export type AISuggestionType = 'module_suggestion' | 'at_risk_prediction' | 'feedback_draft';
export type AIFeedbackValue = 'thumbs_up' | 'thumbs_down';
export type AtRiskSignalLevel = 'low' | 'medium' | 'high';
export type SubmissionPattern = 'early' | 'on_time' | 'late' | 'missed';
export type AttainmentTrend = 'improving' | 'declining' | 'stagnant';
export type FeedbackDraftStatus = 'pending' | 'accepted' | 'edited' | 'rejected';
```

### New Table Schemas

#### `habit_logs`
```sql
CREATE TABLE habit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES profiles(id) NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  habit_type text NOT NULL CHECK (habit_type IN ('login', 'submit', 'journal', 'read')),
  completed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, date, habit_type)
);
ALTER TABLE habit_logs ENABLE ROW LEVEL SECURITY;
```

Note: The architecture doc uses a single-row-per-day model with boolean columns. The normalized model above (one row per habit type per day) is the chosen implementation because it's more flexible for querying individual habit completion and avoids schema changes when adding new habit types. The `is_perfect_day` check is computed at query time: `COUNT(DISTINCT habit_type) = 4 WHERE date = CURRENT_DATE`.

#### `bonus_xp_events`
```sql
CREATE TABLE bonus_xp_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid REFERENCES institutions(id) NOT NULL,
  title text NOT NULL,
  multiplier numeric NOT NULL DEFAULT 2 CHECK (multiplier > 0),
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL CHECK (ends_at > starts_at),
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES profiles(id) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE bonus_xp_events ENABLE ROW LEVEL SECURITY;
```

#### `student_activity_log`
```sql
CREATE TABLE student_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES profiles(id) NOT NULL,
  event_type text NOT NULL CHECK (event_type IN ('login', 'page_view', 'submission', 'journal', 'streak_break', 'assignment_view')),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE student_activity_log ENABLE ROW LEVEL SECURITY;
-- Append-only: no UPDATE or DELETE policies
```

#### `ai_feedback` (Phase 2 — schema only)
```sql
CREATE TABLE ai_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES profiles(id) NOT NULL,
  suggestion_type text NOT NULL CHECK (suggestion_type IN ('module_suggestion', 'at_risk_prediction', 'feedback_draft')),
  suggestion_text text NOT NULL,
  suggestion_data jsonb DEFAULT '{}',
  feedback text CHECK (feedback IN ('thumbs_up', 'thumbs_down')),
  validated_outcome text CHECK (validated_outcome IN ('correct', 'incorrect')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE ai_feedback ENABLE ROW LEVEL SECURITY;
```

#### Column Additions for Platform Enhancements

```sql
-- Streak Freeze inventory (Requirement 59)
ALTER TABLE student_gamification ADD COLUMN streak_freezes_available integer NOT NULL DEFAULT 0
  CHECK (streak_freezes_available >= 0 AND streak_freezes_available <= 2);

-- Onboarding completion tracking (Requirement 60)
ALTER TABLE profiles ADD COLUMN onboarding_completed boolean NOT NULL DEFAULT false;

-- Public portfolio opt-in (Requirement 58)
ALTER TABLE profiles ADD COLUMN portfolio_public boolean NOT NULL DEFAULT false;

-- Dark mode theme preference (Requirement 62)
ALTER TABLE profiles ADD COLUMN theme_preference text NOT NULL DEFAULT 'system'
  CHECK (theme_preference IN ('light', 'dark', 'system'));
```

#### New Tables for Institutional Management & LMS Features

#### `semesters`
```sql
CREATE TABLE semesters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid REFERENCES institutions(id) NOT NULL,
  name text NOT NULL,
  code text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL CHECK (end_date > start_date),
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (institution_id, code)
);
ALTER TABLE semesters ENABLE ROW LEVEL SECURITY;
-- Only one active semester per institution enforced via trigger
```

#### `departments`
```sql
CREATE TABLE departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid REFERENCES institutions(id) NOT NULL,
  name text NOT NULL,
  code text NOT NULL,
  head_of_department_id uuid REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (institution_id, code)
);
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
```

#### `course_sections`
```sql
CREATE TABLE course_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES courses(id) NOT NULL,
  section_code text NOT NULL,
  teacher_id uuid REFERENCES profiles(id) NOT NULL,
  capacity integer NOT NULL DEFAULT 50,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (course_id, section_code)
);
ALTER TABLE course_sections ENABLE ROW LEVEL SECURITY;
```

#### `surveys`
```sql
CREATE TABLE surveys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid REFERENCES institutions(id) NOT NULL,
  title text NOT NULL,
  type text NOT NULL CHECK (type IN ('course_exit', 'graduate_exit', 'employer')),
  target_outcomes jsonb NOT NULL DEFAULT '[]',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;
```

#### `survey_questions`
```sql
CREATE TABLE survey_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id uuid REFERENCES surveys(id) ON DELETE CASCADE NOT NULL,
  question_text text NOT NULL,
  question_type text NOT NULL CHECK (question_type IN ('likert', 'mcq', 'text')),
  options jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  UNIQUE (survey_id, sort_order)
);
ALTER TABLE survey_questions ENABLE ROW LEVEL SECURITY;
```

#### `survey_responses`
```sql
CREATE TABLE survey_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id uuid REFERENCES surveys(id) NOT NULL,
  question_id uuid REFERENCES survey_questions(id) NOT NULL,
  respondent_id uuid REFERENCES profiles(id) NOT NULL,
  response_value text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (survey_id, question_id, respondent_id)
);
ALTER TABLE survey_responses ENABLE ROW LEVEL SECURITY;
```

#### `cqi_action_plans`
```sql
CREATE TABLE cqi_action_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid REFERENCES programs(id) NOT NULL,
  semester_id uuid REFERENCES semesters(id) NOT NULL,
  outcome_id uuid REFERENCES learning_outcomes(id) NOT NULL,
  outcome_type text NOT NULL CHECK (outcome_type IN ('PLO', 'CLO')),
  baseline_attainment numeric NOT NULL CHECK (baseline_attainment >= 0 AND baseline_attainment <= 100),
  target_attainment numeric NOT NULL CHECK (target_attainment >= 0 AND target_attainment <= 100),
  action_description text NOT NULL,
  responsible_person text NOT NULL,
  status text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed', 'evaluated')),
  result_attainment numeric CHECK (result_attainment >= 0 AND result_attainment <= 100),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE cqi_action_plans ENABLE ROW LEVEL SECURITY;
```

#### `institution_settings`
```sql
CREATE TABLE institution_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid REFERENCES institutions(id) NOT NULL UNIQUE,
  attainment_thresholds jsonb NOT NULL DEFAULT '{"excellent": 85, "satisfactory": 70, "developing": 50}',
  success_threshold integer NOT NULL DEFAULT 70,
  accreditation_body text NOT NULL DEFAULT 'Generic' CHECK (accreditation_body IN ('HEC', 'QQA', 'ABET', 'NCAAA', 'AACSB', 'Generic')),
  grade_scales jsonb NOT NULL DEFAULT '[{"letter":"A","min_percent":85,"max_percent":100,"gpa_points":4.0},{"letter":"B","min_percent":70,"max_percent":84,"gpa_points":3.0},{"letter":"C","min_percent":55,"max_percent":69,"gpa_points":2.0},{"letter":"D","min_percent":50,"max_percent":54,"gpa_points":1.0},{"letter":"F","min_percent":0,"max_percent":49,"gpa_points":0.0}]',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE institution_settings ENABLE ROW LEVEL SECURITY;
```

#### `program_accreditations`
```sql
CREATE TABLE program_accreditations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid REFERENCES programs(id) NOT NULL,
  accreditation_body text NOT NULL,
  framework_version text,
  accreditation_date date,
  next_review_date date,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'expired', 'pending')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE program_accreditations ENABLE ROW LEVEL SECURITY;
```

#### `announcements`
```sql
CREATE TABLE announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES courses(id) NOT NULL,
  author_id uuid REFERENCES profiles(id) NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  is_pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_announcements_course ON announcements(course_id, is_pinned DESC, created_at DESC);
```

#### `course_modules`
```sql
CREATE TABLE course_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES courses(id) NOT NULL,
  title text NOT NULL,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE course_modules ENABLE ROW LEVEL SECURITY;
```

#### `course_materials`
```sql
CREATE TABLE course_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid REFERENCES course_modules(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  type text NOT NULL CHECK (type IN ('file', 'link', 'video', 'text')),
  content_url text,
  file_path text,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT false,
  clo_ids jsonb DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE course_materials ENABLE ROW LEVEL SECURITY;
```

#### `discussion_threads`
```sql
CREATE TABLE discussion_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES courses(id) NOT NULL,
  author_id uuid REFERENCES profiles(id) NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  is_pinned boolean NOT NULL DEFAULT false,
  is_resolved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE discussion_threads ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_discussion_threads_course ON discussion_threads(course_id, is_pinned DESC, created_at DESC);
```

#### `discussion_replies`
```sql
CREATE TABLE discussion_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid REFERENCES discussion_threads(id) ON DELETE CASCADE NOT NULL,
  author_id uuid REFERENCES profiles(id) NOT NULL,
  content text NOT NULL,
  is_answer boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE discussion_replies ENABLE ROW LEVEL SECURITY;
```

#### `class_sessions`
```sql
CREATE TABLE class_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id uuid REFERENCES course_sections(id) NOT NULL,
  session_date date NOT NULL,
  session_type text NOT NULL CHECK (session_type IN ('lecture', 'lab', 'tutorial')),
  topic text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (section_id, session_date, session_type)
);
ALTER TABLE class_sessions ENABLE ROW LEVEL SECURITY;
```

#### `attendance_records`
```sql
CREATE TABLE attendance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES class_sessions(id) NOT NULL,
  student_id uuid REFERENCES profiles(id) NOT NULL,
  status text NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused')),
  marked_by uuid REFERENCES profiles(id) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, student_id)
);
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_attendance_student ON attendance_records(student_id, session_id);
```

#### `quizzes`
```sql
CREATE TABLE quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES courses(id) NOT NULL,
  title text NOT NULL,
  description text,
  clo_ids jsonb NOT NULL DEFAULT '[]',
  time_limit_minutes integer,
  max_attempts integer NOT NULL DEFAULT 1,
  is_published boolean NOT NULL DEFAULT false,
  due_date timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
```

#### `quiz_questions`
```sql
CREATE TABLE quiz_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid REFERENCES quizzes(id) ON DELETE CASCADE NOT NULL,
  question_text text NOT NULL,
  question_type text NOT NULL CHECK (question_type IN ('mcq_single', 'mcq_multi', 'true_false', 'short_answer', 'fill_blank')),
  options jsonb,
  correct_answer jsonb NOT NULL,
  points numeric NOT NULL DEFAULT 1,
  sort_order integer NOT NULL DEFAULT 0
);
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
```

#### `quiz_attempts`
```sql
CREATE TABLE quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid REFERENCES quizzes(id) NOT NULL,
  student_id uuid REFERENCES profiles(id) NOT NULL,
  answers jsonb NOT NULL DEFAULT '{}',
  score numeric,
  started_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  attempt_number integer NOT NULL DEFAULT 1,
  UNIQUE (quiz_id, student_id, attempt_number)
);
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_quiz_attempts_student ON quiz_attempts(student_id, quiz_id);
```

#### `grade_categories`
```sql
CREATE TABLE grade_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES courses(id) NOT NULL,
  name text NOT NULL,
  weight_percent numeric NOT NULL CHECK (weight_percent > 0 AND weight_percent <= 100),
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE grade_categories ENABLE ROW LEVEL SECURITY;
```

#### `timetable_slots`
```sql
CREATE TABLE timetable_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id uuid REFERENCES course_sections(id) NOT NULL,
  day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time time NOT NULL,
  end_time time NOT NULL CHECK (end_time > start_time),
  room text,
  slot_type text NOT NULL CHECK (slot_type IN ('lecture', 'lab', 'tutorial')),
  UNIQUE (section_id, day_of_week, start_time)
);
ALTER TABLE timetable_slots ENABLE ROW LEVEL SECURITY;
```

#### `academic_calendar_events`
```sql
CREATE TABLE academic_calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid REFERENCES institutions(id) NOT NULL,
  semester_id uuid REFERENCES semesters(id),
  title text NOT NULL,
  event_type text NOT NULL CHECK (event_type IN ('semester_start', 'semester_end', 'exam_period', 'holiday', 'registration', 'custom')),
  start_date date NOT NULL,
  end_date date NOT NULL CHECK (end_date >= start_date),
  is_recurring boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE academic_calendar_events ENABLE ROW LEVEL SECURITY;
```

#### `parent_student_links`
```sql
CREATE TABLE parent_student_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid REFERENCES profiles(id) NOT NULL,
  student_id uuid REFERENCES profiles(id) NOT NULL,
  relationship text NOT NULL CHECK (relationship IN ('parent', 'guardian')),
  verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (parent_id, student_id)
);
ALTER TABLE parent_student_links ENABLE ROW LEVEL SECURITY;
```

#### `fee_structures`
```sql
CREATE TABLE fee_structures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid REFERENCES programs(id) NOT NULL,
  semester_id uuid REFERENCES semesters(id) NOT NULL,
  fee_type text NOT NULL CHECK (fee_type IN ('tuition', 'lab', 'library', 'exam')),
  amount numeric NOT NULL CHECK (amount >= 0),
  currency text NOT NULL DEFAULT 'PKR',
  due_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE fee_structures ENABLE ROW LEVEL SECURITY;
```

#### `fee_payments`
```sql
CREATE TABLE fee_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES profiles(id) NOT NULL,
  fee_structure_id uuid REFERENCES fee_structures(id) NOT NULL,
  amount_paid numeric NOT NULL CHECK (amount_paid >= 0),
  payment_date date NOT NULL,
  payment_method text,
  receipt_number text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'waived')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE fee_payments ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_fee_payments_student ON fee_payments(student_id, status);
```

#### Column Additions for Institutional Management

```sql
-- Semester FK on courses (Requirement 68)
ALTER TABLE courses ADD COLUMN semester_id uuid REFERENCES semesters(id);
-- Department FK on programs (Requirement 83)
ALTER TABLE programs ADD COLUMN department_id uuid REFERENCES departments(id);
-- Section FK on student_courses (Requirement 69)
ALTER TABLE student_courses ADD COLUMN section_id uuid REFERENCES course_sections(id);
```

Note: The `xp_transactions.source` CHECK constraint should be updated to include `'streak_freeze_purchase'`, `'discussion_question'`, `'discussion_answer'`, `'survey_completion'`, and `'quiz_completion'` as valid source values. The `student_activity_log.event_type` CHECK constraint should be updated to include `'grading_start'`, `'grading_end'`, `'material_view'`, `'announcement_view'`, `'discussion_post'`, `'quiz_attempt'`, and `'attendance_marked'` event types.

#### Leaderboard Materialized View
```sql
CREATE MATERIALIZED VIEW leaderboard_weekly AS
SELECT
  sg.student_id,
  p.full_name,
  p.institution_id,
  sg.xp_total,
  sg.level,
  sg.streak_current,
  RANK() OVER (ORDER BY sg.xp_total DESC) AS global_rank
FROM student_gamification sg
JOIN profiles p ON p.id = sg.student_id
WHERE p.is_active = true
ORDER BY sg.xp_total DESC;

CREATE UNIQUE INDEX idx_leaderboard_weekly_student ON leaderboard_weekly(student_id);
```
Refreshed every 5 minutes via pg_cron: `SELECT cron.schedule('leaderboard-refresh', '*/5 * * * *', 'REFRESH MATERIALIZED VIEW CONCURRENTLY leaderboard_weekly');`

#### Assignment prerequisites (column addition)
```sql
ALTER TABLE assignments ADD COLUMN prerequisites jsonb DEFAULT '[]';
-- Format: [{ "clo_id": "uuid", "min_attainment_percent": 70 }]
```

### Infrastructure Extensions

```sql
-- Enable pg_cron for scheduled jobs (streak risk emails, weekly summaries, at-risk computation)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net for HTTP calls from database (Edge Function invocation)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Cron jobs
SELECT cron.schedule('streak-risk-email', '0 20 * * *', $$SELECT net.http_post(...)$$);
SELECT cron.schedule('weekly-summary-email', '0 8 * * 1', $$SELECT net.http_post(...)$$);
SELECT cron.schedule('compute-at-risk-signals', '0 2 * * *', $$SELECT net.http_post(...)$$);

-- Leaderboard refresh (every 5 minutes)
SELECT cron.schedule('leaderboard-refresh', '*/5 * * * *', 'REFRESH MATERIALIZED VIEW CONCURRENTLY leaderboard_weekly');

-- Streak midnight reset (daily at midnight UTC+5)
SELECT cron.schedule('streak-midnight-reset', '0 0 * * *', $$SELECT net.http_post(...)$$);
```

RLS is enabled on ALL tables with policies as defined in architecture document Section 6.

### Zod Validation Schemas (`/src/lib/schemas/`)

```
auth.ts          — loginSchema, resetPasswordSchema
user.ts          — createUserSchema, updateUserSchema
bulkImport.ts    — csvRowSchema
program.ts       — createProgramSchema, updateProgramSchema
course.ts        — createCourseSchema, updateCourseSchema
ilo.ts           — createILOSchema, reorderSchema
plo.ts           — createPLOSchema, mappingSchema
clo.ts           — createCLOSchema, bloomsLevelSchema
rubric.ts        — rubricSchema, criterionSchema
assignment.ts    — createAssignmentSchema, cloWeightSchema
submission.ts    — submissionSchema
grade.ts         — gradeSchema, rubricSelectionSchema
journal.ts       — journalEntrySchema
habitLog.ts      — habitLogSchema
bonusXPEvent.ts  — bonusXPEventSchema, createBonusEventSchema
emailPrefs.ts    — emailPreferencesSchema
aiSuggestion.ts  — moduleSuggestionSchema, atRiskPredictionSchema, feedbackDraftSchema, aiFeedbackSchema
streakFreeze.ts  — streakFreezePurchaseSchema
exportData.ts    — exportRequestSchema
themePrefs.ts    — themePreferenceSchema
onboarding.ts    — onboardingStepSchema, checklistItemSchema
semester.ts      — createSemesterSchema, updateSemesterSchema
department.ts    — createDepartmentSchema, updateDepartmentSchema
courseSection.ts  — createSectionSchema, updateSectionSchema
survey.ts        — createSurveySchema, surveyQuestionSchema, surveyResponseSchema
cqiPlan.ts       — createCQIPlanSchema, updateCQIPlanSchema
institutionSettings.ts — institutionSettingsSchema, gradeScaleSchema
programAccreditation.ts — programAccreditationSchema
announcement.ts  — createAnnouncementSchema
courseModule.ts   — createModuleSchema, createMaterialSchema
discussion.ts    — createThreadSchema, createReplySchema
attendance.ts    — createSessionSchema, attendanceRecordSchema
quiz.ts          — createQuizSchema, quizQuestionSchema, quizAttemptSchema
gradeCategory.ts — gradeCategorySchema
timetable.ts     — timetableSlotSchema
academicCalendar.ts — academicCalendarEventSchema
parentLink.ts    — parentStudentLinkSchema
feeStructure.ts  — feeStructureSchema, feePaymentSchema
transcript.ts    — transcriptRequestSchema
courseFile.ts     — courseFileRequestSchema
```

### Bloom's Verb Constants (`/src/lib/bloomsVerbs.ts`)

```typescript
export const BLOOMS_VERBS = {
  remembering: ['define', 'list', 'recall', 'identify', 'state', 'name'],
  understanding: ['explain', 'describe', 'classify', 'summarize', 'paraphrase'],
  applying: ['use', 'implement', 'execute', 'solve', 'demonstrate', 'construct'],
  analyzing: ['compare', 'differentiate', 'examine', 'break down', 'infer'],
  evaluating: ['judge', 'critique', 'defend', 'argue', 'assess', 'recommend'],
  creating: ['design', 'develop', 'compose', 'build', 'formulate', 'produce'],
} as const;
```

### TanStack Query Key Factory (`/src/lib/queryKeys.ts`)

Hierarchical keys for all entities: users, programs, courses, enrollments, ilos, plos, clos, rubrics, assignments, submissions, grades, evidence, attainment, gamification, badges, xpTransactions, journal, leaderboard, notifications, auditLogs, habitLogs, bonusXPEvents, activityLog, cloProgress, aiModuleSuggestions, aiAtRiskPredictions, aiFeedbackDrafts, aiFeedback, aiPerformanceSummary, portfolio, streakFreezes, onboardingStatus, gradingStats, exportData, semesters, departments, courseSections, surveys, surveyResponses, cqiPlans, institutionSettings, programAccreditations, announcements, courseModules, courseMaterials, discussionThreads, discussionReplies, classSessions, attendanceRecords, quizzes, quizAttempts, gradeCategories, gradebook, timetableSlots, academicCalendarEvents, parentStudentLinks, feeStructures, feePayments, calendarEvents, transcripts, courseFiles.

## Correctness Properties

### Properties 1–18 (from MVP — retained)
Properties 1–18 covering auth, RBAC, routing, user management, bulk import, and ILO management remain unchanged.

### Property 19: PLO-ILO mapping weight validation
For any PLO with ILO mappings, the system should warn if total weight < 0.5.

### Property 20: CLO requires PLO mapping before assignment linking
For any CLO without a PLO mapping, attempting to link it to an assignment should fail.

### Property 21: Rubric minimum structure
For any rubric, it must have ≥2 criteria and ≥2 performance levels.

### Property 22: Grade triggers evidence creation
For any grade insert, an evidence record should be created within 500ms with correct CLO/PLO/ILO chain.

### Property 23: Evidence immutability
For any evidence record, UPDATE and DELETE operations should be denied.

### Property 24: Attainment rollup accuracy
For any set of evidence records, CLO attainment should equal the average score_percent, and PLO/ILO attainment should equal the weighted average of child attainments.

### Property 25: XP ledger consistency
For any student, `student_gamification.xp_total` should equal the sum of all `xp_transactions.xp_amount` for that student.

### Property 26: Badge idempotency
For any badge trigger that fires multiple times, the badge should only be awarded once.

### Property 27: Streak calculation correctness
For any sequence of login dates, streak_current should reflect the longest consecutive run ending at the most recent login.

### Property 28: Leaderboard ordering
For any leaderboard query, results should be ordered by xp_total descending with correct rank assignment.

### Property 29: Habit tracker Perfect Day detection
For any student with all 4 habit types (login, submit, journal, read) completed on the same calendar day, the system should award exactly 50 bonus XP once.

### Property 30: Bonus XP event multiplier application
For any active bonus_xp_event with multiplier M, all XP awards during the event window should be multiplied by M. XP awards outside the window should be unaffected.

### Property 31: Assignment prerequisite gating
For any assignment with prerequisites `[{clo_id, min_attainment_percent}]`, a student whose attainment for that CLO is below the threshold should be denied submission. A student at or above the threshold should be allowed.

### Property 32: First-Attempt Bonus idempotency
For any assignment where a student's first submission scores ≥50%, the 25 XP First-Attempt Bonus should be awarded exactly once. Subsequent submissions for the same assignment should not re-trigger the bonus.

### Property 33: Mystery badge hidden condition
For any mystery badge, the badge condition should not be visible to students before earning. After earning, the badge and its description should be visible on the student's profile.

### Property 34: Activity log append-only integrity
For any record in `student_activity_log`, UPDATE and DELETE operations should be denied (same immutability pattern as evidence).

### Property 35: Journal prompt Kolb's Cycle alignment
For any generated journal prompt, the prompt should contain exactly 3–4 reflection questions, and each question should map to one stage of Kolb's Experiential Learning Cycle (Concrete Experience, Reflective Observation, Abstract Conceptualization, Active Experimentation).

### Property 36: Peer milestone notification scoping
For any student level-up event, peer notifications should be created only for students sharing at least one active course enrollment with the leveled-up student. Students in anonymous leaderboard mode should not trigger peer notifications.

### Property 37: Perfect Day prompt notification accuracy
For any student with exactly 3 of 4 habits completed at 6 PM check time, the notification should identify the correct missing habit. Students with 0–2 or 4 completed habits should not receive the notification.

### Property 38: AI module suggestion CLO gap detection
For any student with CLO attainment below 70%, the AI module suggestion should identify that CLO as a gap. For any student with all CLOs at or above 70%, no gap suggestions should be generated.

### Property 39: AI at-risk prediction timeliness
For any at-risk prediction, the prediction date should be ≥7 days before the next assignment due date for the at-risk CLO. Predictions generated <7 days before due date should be flagged as late warnings.

### Property 40: AI feedback flywheel data integrity
For any AI suggestion stored in `ai_feedback`, the `suggestion_type` should be one of: `module_suggestion`, `at_risk_prediction`, `feedback_draft`. Every record should have a non-null `suggestion_text` and valid `student_id`.

### Property 41: Streak Freeze consumption correctness
For any student with `streak_freezes_available > 0` who misses a day, the streak should NOT reset and the freeze count should decrement by 1. For any student with `streak_freezes_available = 0` who misses a day, the streak should reset to 0.

### Property 42: Streak Freeze purchase constraints
For any Streak Freeze purchase, the student must have ≥200 XP balance and `streak_freezes_available < 2`. A purchase should decrement XP by 200 and increment `streak_freezes_available` by 1. Purchases when balance < 200 or freezes ≥ 2 should be rejected.

### Property 43: Notification rate limiting
For any student, the number of peer milestone notifications received in a 24-hour period should not exceed 5. Excess notifications within the window should be batched or dropped.

### Property 44: Notification batching correctness
For any set of peer milestone events occurring within a 1-hour window for the same recipient student, the system should produce at most 1 grouped notification summarizing all milestones, not individual notifications per event.

### Property 45: Offline queue flush integrity
For any set of activity log events queued in localStorage while offline, flushing the queue when online should result in all events being inserted into `student_activity_log` with their original timestamps preserved. The queue should be empty after a successful flush.

### Property 46: Journal draft auto-save round-trip
For any journal entry draft saved to localStorage, restoring the draft should produce content identical to what was saved. Drafts should be cleared from localStorage only after successful server-side save.

### Property 47: Student data export completeness
For any student data export, the exported data should contain records from all student-scoped tables (grades, attainment, xp_transactions, journal_entries, badges, habit_logs). The count of exported records per table should match the count of records in the database for that student.

### Property 48: Dark mode token consistency
For any CSS custom property defined in the light theme, a corresponding dark theme value must exist. Switching themes should not produce any unstyled or invisible elements (all text must have sufficient contrast against its background in both modes).

### Property 49: Read habit timer accuracy
For any student viewing a qualifying page (assignment detail or CLO progress), the "Read" habit should be marked complete if and only if the cumulative view duration on qualifying pages reaches ≥30 seconds within the same calendar day. Durations below 30 seconds should not trigger completion.

### Property 50: Grading time calculation correctness
For any graded submission where both `grading_start` and `grading_end` activity log events exist, the calculated grading time should equal the difference between the two timestamps. Submissions without a `grading_start` event should be excluded from average grading time calculations.

### Property 51: Semester active uniqueness
For any institution, at most one semester should have `is_active = true` at any time. Activating a new semester should deactivate the previously active semester.

### Property 52: Course section CLO sharing
For any course with multiple sections, all sections should share the same CLOs, rubrics, and assignments. Section-specific data (enrollments, submissions, grades) should be isolated per section.

### Property 53: Survey response uniqueness
For any survey, each respondent should have at most one response per question. Duplicate submissions for the same survey by the same respondent should be rejected.

### Property 54: CQI action plan lifecycle
For any CQI action plan transitioning to `evaluated` status, a `result_attainment` value must be present. Plans without `result_attainment` should not be allowed to reach `evaluated` status.

### Property 55: Configurable threshold consistency
For any institution_settings record, the attainment thresholds must satisfy: `developing < satisfactory < excellent` and all values must be between 0 and 100. All attainment level calculations across the platform should use these configured values instead of hardcoded defaults.

### Property 56: Grade category weight sum
For any course, the sum of all `grade_categories.weight_percent` should equal exactly 100. Adding a category that would cause the sum to exceed 100 should be rejected.

### Property 57: Quiz auto-grading correctness
For any quiz attempt with MCQ/true-false/fill-in-blank questions, the auto-graded score should equal the sum of points for questions where the student's answer matches the correct_answer. Short answer questions should remain unscored until manually graded.

### Property 58: Quiz attempt limit enforcement
For any quiz with `max_attempts = N`, a student should have at most N `quiz_attempts` records. Attempts beyond the limit should be rejected.

### Property 59: Attendance percentage calculation
For any student in a course section, attendance percentage should equal `(present_count + late_count) / total_sessions * 100`. Students below 75% should be flagged.

### Property 60: Discussion XP award correctness
For any discussion thread created by a student, exactly 10 XP should be awarded once. For any reply marked as correct answer, exactly 15 XP should be awarded to the reply author once. Unmarking an answer should not revoke XP.

### Property 61: Calendar event aggregation completeness
For any student's calendar view, the displayed events should include all assignments, quizzes, class sessions, and academic calendar events from all enrolled courses. No events should be missing or duplicated.

### Property 62: Parent portal data isolation
For any parent user, data access should be restricted to students linked via verified `parent_student_links` records. Unverified links should not grant data access. Parents should have read-only access with no mutation capabilities.

### Property 63: Fee payment status consistency
For any fee payment, if `payment_date > fee_structure.due_date` and `status = 'pending'`, the status should be automatically updated to `overdue`. Payments with `status = 'paid'` should have `amount_paid > 0`.

### Property 64: Course file content completeness
For any generated course file, the output should contain all required sections: syllabus, CLO-PLO mapping, assessment instruments, sample student work (best/average/worst), CLO attainment analysis, and teacher reflection. Missing sections should be flagged in the output.

### Property 65: Semester scoping integrity
For any report, analytics query, or attainment rollup, results should be scoped to the specified semester_id. Data from other semesters should not leak into the results. Deactivated semester data should be read-only.

## Seed Data Strategy

The platform requires a seed data script to populate 50 realistic student profiles with 3–4 months of simulated activity. This data is critical for AI Co-Pilot development and testing.

### Seed Script Approach

Implemented as a Supabase Edge Function (`seed-demo-data`) or a standalone SQL seed script (`supabase/seed.sql`). The script is idempotent — it checks for existing seed data before inserting.

### Data Distribution

| Category | Count | Characteristics |
|----------|-------|-----------------|
| At-risk students | 10 | Low login frequency (1–2×/week), declining CLO attainment, late/missed submissions, short/no streaks |
| High performers | 15 | Daily logins, high scores (80–100%), long streaks (30–100 days), all badges, frequent journal entries |
| Average students | 25 | Mixed login patterns (3–5×/week), moderate scores (50–80%), intermittent streaks, some badges |

### Generated Data Per Student

- Profile with realistic name, email, institution_id
- Enrollments across 2–4 courses
- 10–30 submissions with varying scores and timing patterns
- Corresponding grade records with rubric selections
- Evidence records and outcome_attainment at CLO/PLO/ILO levels
- XP transactions (50–200 per student) from various sources
- Streak history (student_gamification records)
- 0–15 badge awards based on performance tier
- 0–20 journal entries with varying word counts
- habit_logs spanning 90–120 days with tier-appropriate completion rates
- student_activity_log entries (logins, page_views, submissions, journal, assignment_view) with realistic timestamps
- xp_transactions with sources matching the activity patterns

### Timestamp Distribution

Activity timestamps are distributed across a 3–4 month window ending at the current date. Login times follow realistic patterns (8 AM–11 PM with peaks at 9 AM and 8 PM). Submission times cluster near due dates for average students and are spread evenly for high performers.

---

## Scalability Notes

### pg_cron Requires Supabase Pro Plan

pg_cron is only available on Supabase Pro plan or self-hosted instances. For free-tier compatibility, the platform supports a fallback approach:

**Primary (Pro plan):** pg_cron + pg_net schedules invoke Edge Functions directly from the database.

**Fallback (Free tier):** Vercel Cron Jobs configured in `vercel.json` call Edge Functions via HTTP:

```json
{
  "crons": [
    { "path": "/api/cron/streak-risk", "schedule": "0 20 * * *" },
    { "path": "/api/cron/weekly-summary", "schedule": "0 8 * * 1" },
    { "path": "/api/cron/compute-at-risk", "schedule": "0 2 * * *" },
    { "path": "/api/cron/perfect-day-prompt", "schedule": "0 18 * * *" },
    { "path": "/api/cron/streak-reset", "schedule": "0 0 * * *" },
    { "path": "/api/cron/leaderboard-refresh", "schedule": "*/5 * * * *" },
    { "path": "/api/cron/ai-at-risk-prediction", "schedule": "0 3 * * *" },
    { "path": "/api/cron/notification-digest", "schedule": "0 20 * * *" }
  ]
}
```

Additional cron job for fee overdue check:
```json
{ "path": "/api/cron/fee-overdue-check", "schedule": "0 6 * * *" }
```
```

Each Vercel Cron route is a thin API route that authenticates with a `CRON_SECRET` and calls the corresponding Supabase Edge Function.

### Supabase Realtime Connection Limits

Supabase Realtime supports ~5,000 concurrent connections on Pro plan (~200 on free tier). To stay within limits:

**Connection pooling pattern:** One Realtime subscription per table is shared across all components via a centralized `useRealtime` hook. Components do NOT create individual subscriptions — they register callbacks with the shared subscription manager.

**Graceful degradation:** When Realtime is unavailable or connection limit is reached, the platform falls back to polling (30-second interval) using TanStack Query's `refetchInterval`. A "Live updates paused" banner is shown to the user.

### PDF Generation (No Puppeteer)

Puppeteer is not viable in Supabase Edge Functions (Deno runtime) due to:
- ~500MB binary size causing extreme cold starts
- Memory limits in serverless environments
- No headless Chrome available in Deno Deploy

**Chosen approach:** `jspdf` + `jspdf-autotable` for table-heavy accreditation reports. These are pure JavaScript libraries that work natively in Deno with no binary dependencies. For chart rendering in PDFs, pre-render chart data as SVG on the client and pass as base64 to the Edge Function.

### Leaderboard at Scale (Redis Upgrade Path)

The current materialized view approach (`leaderboard_weekly`) works well up to ~10,000 students with the 5-minute refresh interval. Beyond that scale:

**Upgrade path:** Replace materialized view with Redis sorted sets (`ZADD`, `ZRANK`, `ZRANGE`). This provides O(log N) rank lookups and real-time updates without periodic refresh. Upstash Redis (serverless) integrates well with Supabase Edge Functions.

**Current optimizations:**
- `UNIQUE INDEX` on `leaderboard_weekly(student_id)` for `REFRESH MATERIALIZED VIEW CONCURRENTLY`
- Composite index on `student_gamification(xp_total DESC, student_id)` for direct queries
- Institution-scoped queries use the `profiles.institution_id` join

---

## CI/CD Pipeline

### GitHub Actions Workflow (`.github/workflows/ci.yml`)

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npx eslint . --max-warnings 0
      - run: npx tsc --noEmit
      - run: npx vitest --run
      - run: npx vite build
```

Vercel handles deployment automatically via GitHub integration:
- Push to `main` → production deployment
- Pull request → preview deployment with unique URL

---

## Production Monitoring

### Health Check Endpoint

Edge Function at `/functions/v1/health` that returns:

```json
{
  "status": "ok",
  "database": "connected",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

The health check verifies database connectivity with a lightweight `SELECT 1` query. Returns HTTP 503 if the database is unreachable.

### Uptime Monitoring

Integrate with BetterUptime or Checkly:
- Monitor the health check endpoint every 60 seconds
- Alert via Slack/email on 2 consecutive failures
- Track uptime against the 99.9% SLA target (Requirement 53.1)

### Load Testing (k6)

k6 scripts in `/load-tests/` directory covering:
- `login.js` — Authentication flow under load
- `submission.js` — Assignment submission with file upload
- `grading-pipeline.js` — Grade submission → evidence → rollup chain
- `leaderboard.js` — Leaderboard queries with concurrent reads

Target: 5,000 virtual users, p95 response time ≤300ms.

---

## Error Handling

All error handling from the MVP design is retained. Additional error scenarios:

| Scenario | Handling |
|----------|----------|
| Rubric with <2 criteria | "Rubric must have at least 2 criteria" (Zod) |
| Assignment due date in past | "Due date must be at least 24 hours in the future" |
| Submission after late window | "Submission deadline has passed" (403) |
| Evidence creation failure | Retry once; if failed, log to error table and alert admin |
| XP award failure | Retry once; log to dead letter queue |
| PDF generation timeout | Return partial result with "Report generation timed out" (jspdf) |
| Realtime connection lost | Auto-reconnect with exponential backoff; show "Reconnecting..." banner |
| Prerequisite not met | "Assignment locked: requires CLO-X attainment ≥ Y%" (visual locked node) |
| Bonus XP event overlap | "A bonus event is already active for this time window" (Zod) |
| Resend email delivery failure | Retry 3× with exponential backoff; log to dead letter queue |
| Habit log duplicate | UNIQUE constraint on (student_id, date, habit_type) — upsert silently |
| Activity log write failure | Fire-and-forget with console.error; never block user flow |
| AI suggestion generation failure | Show "Suggestions unavailable" placeholder; retry on next dashboard load |
| AI at-risk prediction timeout | Skip student; log to error table; process remaining students |
| AI feedback draft generation failure | Show "AI draft unavailable" with manual feedback fallback |
| Peer notification for anonymous student | Silently skip; do not create notification |
| Perfect Day prompt cron failure | Log error; students miss nudge but no data loss |
| Streak Freeze purchase — insufficient XP | "Insufficient XP balance. You need 200 XP to purchase a Streak Freeze." |
| Streak Freeze purchase — max reached | "You already have 2 Streak Freezes. Use one before purchasing another." |
| Data export timeout | "Export is taking longer than expected. Please try again." (30s limit) |
| Draft auto-save failure | Silent — retry on next interval; never block editing |
| Offline queue flush failure | Retry up to 3 times; dead-letter remaining events with console.error |
| Onboarding tour dismissed early | Mark current step as last seen; resume from that step on next login |
| Theme toggle failure | Apply theme locally; retry profile update silently |
| Grading time tracking gap | Exclude from average if grading_start event missing |
| Semester overlap | "A semester with overlapping dates already exists for this institution" |
| Semester deactivation with active courses | Preserve data as read-only, block new submissions |
| Section capacity exceeded | "Section is full. Maximum capacity of N students reached." |
| Survey duplicate response | "You have already completed this survey" (UNIQUE constraint) |
| CQI evaluated without result | "Result attainment is required when marking a CQI plan as evaluated" |
| Grade category weight overflow | "Total category weights exceed 100%. Current total: N%" |
| Quiz attempt limit exceeded | "Maximum attempts (N) reached for this quiz" |
| Quiz time limit expired | Auto-submit with current answers when time runs out |
| Attendance duplicate marking | UNIQUE constraint on (session_id, student_id) — upsert |
| Assignment due date on holiday | "Due date falls on a holiday. Suggested next available date: [date]" |
| Parent accessing unlinked student | RLS denies access — HTTP 403 |
| Fee payment overdue auto-flag | pg_cron daily check updates pending → overdue when past due_date |
| Course file generation timeout | "Course file generation timed out. Please try again." (30s limit) |
| Transcript generation failure | "Transcript generation failed. Please contact support." |
| Discussion thread in inactive course | "Discussions are closed for this course" |

## Testing Strategy

### Expanded Property-Based Tests (65 properties total)
All 18 MVP properties retained + 10 OBE/gamification properties + 7 habit/reward/path/activity/journal properties + 5 AI Co-Pilot properties + 10 platform enhancement properties (streak freeze, notification batching, offline queue, draft saving, data export, dark mode, read habit timer, grading time) + 15 institutional management & LMS properties (semester scoping, section CLO sharing, survey uniqueness, CQI lifecycle, threshold consistency, grade category weights, quiz auto-grading, quiz attempt limits, attendance calculation, discussion XP, calendar aggregation, parent data isolation, fee status, course file completeness, semester integrity).

### Integration Tests
- End-to-end grading → evidence → rollup pipeline
- XP award → level check → badge check pipeline
- Submission → XP → streak → leaderboard update pipeline
- Realtime subscription delivery tests
- AI suggestion → feedback collection pipeline
- Level-up → peer milestone notification pipeline
- Quiz attempt → auto-grade → evidence → CLO attainment pipeline
- Attendance marking → at-risk signal → AI prediction pipeline
- Discussion post → XP award → badge check pipeline
- Survey response → indirect evidence → accreditation report pipeline
- Semester activation → course scoping → report filtering pipeline
- Parent link verification → data access → notification pipeline

### Test Organization
```
src/__tests__/
├── properties/
│   ├── auth.property.test.ts          # Properties 1-3
│   ├── rbac.property.test.ts          # Properties 4-5
│   ├── routing.property.test.ts       # Properties 6-8
│   ├── users.property.test.ts         # Properties 9-12
│   ├── bulk-import.property.test.ts   # Properties 13-14
│   ├── ilo.property.test.ts           # Properties 15-17
│   ├── audit.property.test.ts         # Property 18
│   ├── obe.property.test.ts           # Properties 19-24
│   ├── gamification.property.test.ts  # Properties 25-28
│   ├── habits.property.test.ts        # Property 29
│   ├── bonus-xp.property.test.ts      # Properties 30, 32
│   ├── learning-path.property.test.ts # Property 31
│   ├── mystery-badges.property.test.ts# Property 33
│   ├── activity-log.property.test.ts  # Property 34
│   ├── journal-prompts.property.test.ts # Property 35
│   ├── peer-notifications.property.test.ts # Property 36
│   ├── perfect-day-prompt.property.test.ts # Property 37
│   ├── ai-copilot.property.test.ts    # Properties 38-40
│   ├── streak-freeze.property.test.ts # Properties 41-42
│   ├── notification-batching.property.test.ts # Properties 43-44
│   ├── offline-queue.property.test.ts # Properties 45-46
│   ├── data-export.property.test.ts   # Property 47
│   ├── dark-mode.property.test.ts     # Property 48
│   ├── read-habit.property.test.ts    # Property 49
│   ├── grading-stats.property.test.ts # Property 50
│   ├── semesters.property.test.ts     # Properties 51, 65
│   ├── course-sections.property.test.ts # Property 52
│   ├── surveys.property.test.ts       # Property 53
│   ├── cqi.property.test.ts           # Property 54
│   ├── thresholds.property.test.ts    # Property 55
│   ├── gradebook.property.test.ts     # Property 56
│   ├── quiz.property.test.ts          # Properties 57, 58
│   ├── attendance.property.test.ts    # Property 59
│   ├── discussion.property.test.ts    # Property 60
│   ├── calendar.property.test.ts      # Property 61
│   ├── parent-portal.property.test.ts # Property 62
│   ├── fees.property.test.ts          # Property 63
│   └── course-file.property.test.ts   # Property 64
├── unit/
│   ├── auth.test.ts
│   ├── users.test.ts
│   ├── programs.test.ts
│   ├── courses.test.ts
│   ├── outcomes.test.ts
│   ├── rubrics.test.ts
│   ├── assignments.test.ts
│   ├── grading.test.ts
│   ├── evidence.test.ts
│   ├── xp.test.ts
│   ├── streaks.test.ts
│   ├── badges.test.ts
│   ├── leaderboard.test.ts
│   ├── journal.test.ts
│   ├── notifications.test.ts
│   ├── reports.test.ts
│   ├── habits.test.ts
│   ├── bonus-xp-events.test.ts
│   ├── learning-path.test.ts
│   ├── blooms-verbs.test.ts
│   ├── journal-prompts.test.ts
│   ├── email-notifications.test.ts
│   ├── activity-logger.test.ts
│   ├── clo-progress.test.ts
│   ├── xp-history.test.ts
│   ├── peer-notifications.test.ts
│   ├── perfect-day-prompt.test.ts
│   ├── ai-module-suggestion.test.ts
│   ├── ai-at-risk-prediction.test.ts
│   ├── ai-feedback-draft.test.ts
│   ├── ai-feedback-flywheel.test.ts
│   ├── student-portfolio.test.ts
│   ├── streak-freeze.test.ts
│   ├── onboarding.test.ts
│   ├── read-habit-timer.test.ts
│   ├── dark-mode.test.ts
│   ├── draft-manager.test.ts
│   ├── offline-queue.test.ts
│   ├── data-export.test.ts
│   ├── notification-batcher.test.ts
│   ├── error-state.test.ts
│   ├── grading-stats.test.ts
│   ├── semesters.test.ts
│   ├── departments.test.ts
│   ├── course-sections.test.ts
│   ├── surveys.test.ts
│   ├── cqi-plans.test.ts
│   ├── institution-settings.test.ts
│   ├── program-accreditations.test.ts
│   ├── announcements.test.ts
│   ├── course-modules.test.ts
│   ├── discussion-forum.test.ts
│   ├── attendance.test.ts
│   ├── quizzes.test.ts
│   ├── gradebook.test.ts
│   ├── calendar-view.test.ts
│   ├── timetable.test.ts
│   ├── academic-calendar.test.ts
│   ├── transcripts.test.ts
│   ├── course-file.test.ts
│   ├── parent-portal.test.ts
│   └── fee-management.test.ts
└── integration/
    ├── grading-pipeline.test.ts
    ├── gamification-pipeline.test.ts
    ├── habit-perfect-day.test.ts
    ├── prerequisite-gating.test.ts
    ├── peer-milestone-pipeline.test.ts
    ├── ai-suggestion-feedback.test.ts
    ├── realtime.test.ts
    ├── streak-freeze-consumption.test.ts
    ├── offline-queue-flush.test.ts
    ├── quiz-grading-evidence.test.ts
    ├── attendance-at-risk.test.ts
    ├── discussion-xp-pipeline.test.ts
    ├── survey-evidence-report.test.ts
    ├── semester-scoping.test.ts
    └── parent-data-access.test.ts
```


---

## Production Readiness & Infrastructure (Requirements 88–102)

### New Components

#### RTL / Language Provider (`/src/providers/LanguageProvider.tsx`)
```typescript
type LanguageCode = 'en' | 'ur' | 'ar';

interface LanguageContextValue {
  language: LanguageCode;
  direction: 'ltr' | 'rtl';
  setLanguage: (lang: LanguageCode) => Promise<void>;
}

const RTL_LANGUAGES: LanguageCode[] = ['ur', 'ar'];

// Sets dir="rtl" on <html> when language is Urdu or Arabic
// Loads corresponding translation file via i18next
// Stores preference in profiles.language_preference
```

#### Language Selector (`/src/components/shared/LanguageSelector.tsx`)
```typescript
interface LanguageSelectorProps {
  currentLanguage: LanguageCode;
  onLanguageChange: (lang: LanguageCode) => Promise<void>;
}

// Dropdown with: English, اردو (Urdu), العربية (Arabic)
// Placed in Profile Settings page
```

#### RTL CSS Utilities (`/src/styles/rtl.css`)
```css
/* RTL-aware utilities — applied when html[dir="rtl"] */
[dir="rtl"] .rtl\:space-x-reverse > :not([hidden]) ~ :not([hidden]) {
  --tw-space-x-reverse: 1;
}
[dir="rtl"] .rtl\:flex-row-reverse { flex-direction: row-reverse; }
[dir="rtl"] .rtl\:text-right { text-align: right; }
[dir="rtl"] .sidebar { right: 0; left: auto; }
```

#### PWA Install Prompt (`/src/components/shared/PWAInstallPrompt.tsx`)
```typescript
interface PWAInstallPromptProps {
  onDismiss: () => void;
}

// Listens for `beforeinstallprompt` event
// Shows install banner on mobile devices
// Stores dismissal in localStorage to avoid repeated prompts
```

#### Service Worker (`/public/sw.js`)
```typescript
// Cache-first strategy for app shell (HTML, CSS, JS bundles)
// Network-first for API calls (never caches Supabase responses)
// Offline fallback: shows cached app shell with "You are offline" message
// Cache name versioned: `edeviser-shell-v1`
```

#### Cookie Consent Banner (`/src/components/shared/CookieConsentBanner.tsx`)
```typescript
type ConsentStatus = 'accepted_all' | 'rejected_non_essential' | 'custom';

interface CookieConsent {
  status: ConsentStatus;
  essential: true; // always true
  analytics: boolean;
  performance: boolean;
  timestamp: string;
}

interface CookieConsentBannerProps {
  onConsent: (consent: CookieConsent) => void;
}

// Stored in localStorage key: `edeviser_cookie_consent`
// Blocks analytics scripts until consent given
// "Cookie Settings" link in footer for updating preferences
```

#### Terms of Service / Privacy Policy Pages
```typescript
// Route: /terms — TermsOfServicePage (`/src/pages/public/TermsPage.tsx`)
// Route: /privacy — PrivacyPolicyPage (`/src/pages/public/PrivacyPage.tsx`)
// Both render markdown content, no auth required

// ToS Acceptance Dialog (`/src/components/shared/ToSAcceptanceDialog.tsx`)
interface ToSAcceptanceDialogProps {
  onAccept: () => Promise<void>;
}
// Shown on first login when profiles.tos_accepted_at is null
// Blocks navigation until accepted
// Stores timestamp in profiles.tos_accepted_at
```

#### Admin Impersonation (`/src/components/shared/ImpersonationBanner.tsx`)
```typescript
interface ImpersonationContextValue {
  isImpersonating: boolean;
  impersonatedUser: Profile | null;
  startImpersonation: (userId: string) => Promise<void>;
  stopImpersonation: () => Promise<void>;
  timeRemaining: number; // seconds until auto-expire (30 min)
}

// ImpersonationProvider wraps App
// Banner: "You are viewing as [name] — [role]. Click to exit."
// Read-only mode: all mutations blocked during impersonation
// Auto-expires after 30 minutes
// Logged to audit_logs: impersonation_start, impersonation_end
```

#### Bulk Data Operations
```typescript
// Grade Export (`/src/pages/teacher/gradebook/GradeExport.tsx`)
interface GradeExportProps {
  courseId: string;
  sectionId?: string;
}
// Exports CSV: student_name, assessment scores, category subtotals, final_grade, letter_grade

// Enrollment Import/Export (`/src/pages/coordinator/courses/EnrollmentBulk.tsx`)
interface EnrollmentImportRow {
  student_email: string;
  course_code: string;
  section_code: string;
}

// Semester Transition Tool (`/src/pages/coordinator/courses/SemesterTransition.tsx`)
interface SemesterTransitionProps {
  sourceSemesterId: string;
  targetSemesterId: string;
  programId: string;
}
// Bulk copies: courses, CLOs, rubrics, grade_categories to new semester
```

#### Edge Function Rate Limiter (`/supabase/functions/_shared/rateLimiter.ts`)
```typescript
interface RateLimitConfig {
  readLimit: number;   // 100 per minute
  writeLimit: number;  // 30 per minute
  windowMs: number;    // 60000 (1 minute)
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfter?: number; // seconds
}

// Uses in-memory Map keyed by user_id + function_name
// Returns 429 with Retry-After header when exceeded
// Logs violations to audit_logs
```

#### Security Headers Configuration (`vercel.json` headers section)
```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "Content-Security-Policy", "value": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https://*.supabase.co; connect-src 'self' https://*.supabase.co wss://*.supabase.co" },
        { "key": "Strict-Transport-Security", "value": "max-age=31536000; includeSubDomains" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" }
      ]
    }
  ]
}
```

#### Global Search (`/src/components/shared/SearchCommand.tsx`)
```typescript
type SearchCategory = 'courses' | 'assignments' | 'students' | 'announcements' | 'materials';

interface SearchResult {
  id: string;
  title: string;
  category: SearchCategory;
  subtitle?: string;
  route: string;
}

interface SearchCommandProps {
  role: UserRole;
  institutionId: string;
}

// Cmd+K / Ctrl+K shortcut
// Debounced input (300ms)
// Results grouped by category with keyboard navigation
// Uses Supabase full-text search (tsvector + GIN indexes)
// Scoped by role: students see only enrolled content
```

#### Image Compressor (`/src/lib/imageCompressor.ts`)
```typescript
interface CompressOptions {
  maxWidth: number;   // 256
  maxHeight: number;  // 256
  maxSizeKB: number;  // 500
  quality: number;    // 0.8
}

async function compressImage(file: File, options: CompressOptions): Promise<File>;

// Uses canvas API for client-side compression
// Returns compressed File object ready for upload
```

#### Notification Preferences Page (`/src/pages/shared/NotificationPreferences.tsx`)
```typescript
interface NotificationPreferences {
  muted_courses: string[];  // course_ids
  quiet_hours: {
    enabled: boolean;
    start: string; // "22:00"
    end: string;   // "07:00"
  };
}

// Per-course mute toggles
// Quiet hours time picker
// Stored in profiles.notification_preferences jsonb
```

#### Session Management Page (`/src/pages/shared/SessionManagement.tsx`)
```typescript
interface ActiveSession {
  id: string;
  device_type: 'desktop' | 'mobile' | 'tablet';
  browser: string;
  ip_address: string; // masked: "192.168.x.x"
  last_active: string;
  is_current: boolean;
}

interface SessionManagementProps {
  userId: string;
}

// "Sign out other sessions" — terminates all except current
// "Sign out all sessions" — terminates all, redirects to login
// Uses Supabase Auth admin API
// Logs to audit_logs
```

#### Plagiarism Placeholder UI (`/src/components/shared/PlagiarismPlaceholder.tsx`)
```typescript
interface PlagiarismPlaceholderProps {
  plagiarismScore: number | null;
}

// Shows "Plagiarism check: Not configured" when score is null
// Shows score badge when configured (future integration)
// Displayed in Grading Interface
```

### New Database Schema Changes

#### Column Additions for Production Readiness

```sql
-- Language preference (Requirement 88)
ALTER TABLE profiles ADD COLUMN language_preference text NOT NULL DEFAULT 'en'
  CHECK (language_preference IN ('en', 'ur', 'ar'));

-- ToS acceptance (Requirement 94)
ALTER TABLE profiles ADD COLUMN tos_accepted_at timestamptz;

-- Plagiarism score placeholder (Requirement 100)
ALTER TABLE submissions ADD COLUMN plagiarism_score numeric
  CHECK (plagiarism_score IS NULL OR (plagiarism_score >= 0 AND plagiarism_score <= 100));

-- Notification preferences (Requirement 101)
ALTER TABLE profiles ADD COLUMN notification_preferences jsonb NOT NULL DEFAULT '{"muted_courses": [], "quiet_hours": {"enabled": false, "start": "22:00", "end": "07:00"}}';
```

#### Full-Text Search Indexes (Requirement 99)

```sql
-- GIN indexes for global search
ALTER TABLE courses ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (to_tsvector('english', coalesce(name, '') || ' ' || coalesce(code, ''))) STORED;
CREATE INDEX idx_courses_search ON courses USING GIN(search_vector);

ALTER TABLE assignments ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, ''))) STORED;
CREATE INDEX idx_assignments_search ON assignments USING GIN(search_vector);

ALTER TABLE announcements ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content, ''))) STORED;
CREATE INDEX idx_announcements_search ON announcements USING GIN(search_vector);

ALTER TABLE course_materials ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, ''))) STORED;
CREATE INDEX idx_materials_search ON course_materials USING GIN(search_vector);

ALTER TABLE profiles ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (to_tsvector('english', coalesce(full_name, '') || ' ' || coalesce(email, ''))) STORED;
CREATE INDEX idx_profiles_search ON profiles USING GIN(search_vector);
```

### New Zod Schemas

```
languagePrefs.ts     — languagePreferenceSchema
cookieConsent.ts     — cookieConsentSchema
impersonation.ts     — impersonationSchema
bulkGradeExport.ts   — gradeExportSchema
enrollmentImport.ts  — enrollmentImportRowSchema
semesterTransition.ts — semesterTransitionSchema
globalSearch.ts      — searchQuerySchema, searchResultSchema
notificationPrefs.ts — notificationPreferencesSchema
sessionManagement.ts — sessionActionSchema
```

### New TanStack Query Keys

Add to `/src/lib/queryKeys.ts`: `globalSearch`, `activeSessions`, `impersonation`, `bulkExport`, `enrollmentBulk`, `semesterTransition`, `notificationPreferences`.

### Updated Architecture — New Routes

```
├── /terms — TermsOfServicePage (public, no auth)
├── /privacy — PrivacyPolicyPage (public, no auth)
├── /admin/*
│   └── /admin/users/:id — UserDetail (includes "View as User" impersonation button)
├── /teacher/*
│   └── /teacher/gradebook/export — GradeExport
├── /coordinator/*
│   └── /coordinator/courses/enrollment-bulk — EnrollmentBulk
│   └── /coordinator/courses/semester-transition — SemesterTransition
└── Profile Settings (all roles)
    ├── Language Selector
    ├── Notification Preferences (per-course mute, quiet hours)
    └── Active Sessions
```

### Updated Architecture — New Edge Functions

```
└── Edge Functions
    ├── ... (existing)
    ├── rate-limiter (_shared module, not standalone)
    ├── bulk-grade-export (on-demand per course/section)
    ├── bulk-enrollment-import (on-demand per CSV upload)
    └── semester-transition (on-demand per program)
```

### Updated Error Handling

| Scenario | Handling |
|----------|----------|
| RTL language selected | Apply `dir="rtl"` immediately; fallback to English if translation file fails to load |
| PWA install prompt dismissed | Store dismissal in localStorage; do not re-prompt for 30 days |
| Service worker cache miss | Fall back to network; show "You are offline" if both fail |
| Rate limit exceeded | Return HTTP 429 with `Retry-After` header; show "Too many requests" toast |
| CSP violation | Log to Sentry via `report-uri` directive |
| Cookie consent not given | Block analytics scripts; core functionality unaffected |
| ToS not accepted | Block all protected routes; redirect to ToS dialog |
| Impersonation expired | Auto-exit to admin dashboard; show "Impersonation session expired" toast |
| Impersonation mutation attempt | Block with "Read-only mode during impersonation" error |
| Bulk import invalid rows | Show error list with row numbers; process valid rows only |
| Semester transition duplicate | "Course already exists in target semester" — skip duplicates |
| Global search no results | Show "No results found" empty state |
| Image compression failure | Upload original file with warning "Image could not be optimized" |
| Plagiarism API not configured | Show "Plagiarism check: Not configured" placeholder |
| Quiet hours notification held | Queue notification; deliver after quiet hours end |
| Session termination failure | "Could not sign out session. Please try again." |

### Correctness Properties (66–80)

### Property 66: RTL layout direction correctness
For any user with `language_preference` set to 'ur' or 'ar', the `<html>` element should have `dir="rtl"`. For any user with `language_preference` set to 'en', the `<html>` element should have `dir="ltr"`. Switching language should update the direction without page refresh.

### Property 67: PWA manifest validity
The web app manifest (`public/manifest.json`) should contain all required fields: `name`, `short_name`, `icons` (at least 192×192 and 512×512), `start_url`, `display: standalone`, `theme_color`, and `background_color`. The manifest should be valid JSON parseable without errors.

### Property 68: Rate limiting enforcement
For any user making more than 100 read requests or 30 write requests within a 60-second window to any Edge Function, the system should return HTTP 429 for all subsequent requests until the window resets. The `Retry-After` header value should be a positive integer ≤60.

### Property 69: Security headers presence
For any HTTP response served by the platform, the response headers should include: `Content-Security-Policy`, `Strict-Transport-Security`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, and `Referrer-Policy: strict-origin-when-cross-origin`. No security header should be missing from any response.

### Property 70: Cookie consent blocking
While a user has not given analytics consent (no `edeviser_cookie_consent` in localStorage or analytics=false), no analytics tracking scripts should be loaded or executed. After consent is given with analytics=true, analytics scripts should load.

### Property 71: ToS acceptance gate
For any user with `tos_accepted_at = null`, navigation to any protected route should be blocked and redirected to the ToS acceptance dialog. After acceptance, `tos_accepted_at` should be a non-null timestamp and all protected routes should be accessible.

### Property 72: Impersonation read-only enforcement
While an admin is impersonating another user, all mutation operations (create, update, delete) should be blocked and return an error. Read operations should return data scoped to the impersonated user. Impersonation should auto-expire after 30 minutes.

### Property 73: Bulk grade export completeness
For any grade export of a course/section, the exported CSV should contain one row per enrolled student with all assessment scores, category subtotals, final grade, and letter grade. The count of rows should equal the count of enrolled students.

### Property 74: Global search result scoping
For any search query by a student, results should only include content from courses the student is enrolled in. For any search query by a teacher, results should only include content from courses the teacher is assigned to. Admin searches should be scoped to the admin's institution.

### Property 75: Image compression constraints
For any avatar image processed by the compressor, the output file size should be ≤500KB and dimensions should be ≤256×256 pixels. The output should be a valid image file (JPEG or PNG).

### Property 76: Notification quiet hours enforcement
For any non-critical notification generated during a user's quiet hours, the notification should not be delivered until quiet hours end. Critical notifications (grade released, at-risk alert) should be delivered immediately regardless of quiet hours.

### Property 77: Session management correctness
For any "sign out other sessions" action, all sessions except the current one should be terminated. The current session should remain active. For any "sign out all sessions" action, all sessions including the current one should be terminated.

### Property 78: Plagiarism score column integrity
For any submission record, `plagiarism_score` should be either null (not configured) or a numeric value between 0 and 100 inclusive. No other values should be accepted.

### Property 79: Semester transition data integrity
For any semester transition operation, the target semester should contain copies of all courses, CLOs, rubrics, and grade categories from the source semester. The source semester data should remain unchanged. No student-specific data (enrollments, submissions, grades) should be copied.

### Property 80: Per-course notification muting
For any user with a course in their `muted_courses` list, no in-app notifications from that course should be delivered. Notifications from non-muted courses should be delivered normally. Muting/unmuting should take effect immediately.

### Updated Test Organization

Add to `src/__tests__/properties/`:
```
├── rtl-language.property.test.ts      # Property 66
├── pwa-manifest.property.test.ts      # Property 67
├── rate-limiting.property.test.ts     # Property 68
├── security-headers.property.test.ts  # Property 69
├── cookie-consent.property.test.ts    # Property 70
├── tos-acceptance.property.test.ts    # Property 71
├── impersonation.property.test.ts     # Property 72
├── bulk-export.property.test.ts       # Property 73
├── global-search.property.test.ts     # Property 74
├── image-compression.property.test.ts # Property 75
├── quiet-hours.property.test.ts       # Property 76
├── session-management.property.test.ts# Property 77
├── plagiarism.property.test.ts        # Property 78
├── semester-transition.property.test.ts # Property 79
└── notification-muting.property.test.ts # Property 80
```

Add to `src/__tests__/unit/`:
```
├── rtl-language.test.ts
├── pwa.test.ts
├── rate-limiter.test.ts
├── security-headers.test.ts
├── cookie-consent.test.ts
├── tos-acceptance.test.ts
├── impersonation.test.ts
├── bulk-operations.test.ts
├── global-search.test.ts
├── image-compressor.test.ts
├── notification-preferences.test.ts
├── session-management.test.ts
└── semester-transition.test.ts
```

Add to `src/__tests__/integration/`:
```
├── impersonation-audit.test.ts
├── bulk-export-pipeline.test.ts
└── semester-transition-pipeline.test.ts
```

### Updated Testing Strategy

All 18 MVP properties retained + 10 OBE/gamification properties + 7 habit/reward/path/activity/journal properties + 5 AI Co-Pilot properties + 10 platform enhancement properties + 15 institutional management & LMS properties + 15 production readiness properties (RTL layout, PWA manifest, rate limiting, security headers, cookie consent, ToS gate, impersonation read-only, bulk export completeness, global search scoping, image compression, quiet hours, session management, plagiarism column, semester transition, notification muting) = 80 total correctness properties.


---

## SECTION U: OBE Engine Enhancements (Requirements 103–111)

### Overview

This section extends the OBE Core with deeper outcome granularity (Sub-CLOs, Graduate Attributes, Competency Frameworks) and advanced analytics visualizations (Sankey diagrams, gap analysis, coverage heatmaps, semester trends, cohort comparisons, and historical evidence analysis). These features target Coordinator and Admin roles primarily, strengthening accreditation readiness and curriculum quality assurance.

### Architecture

#### Updated High-Level Component Flow

```
├── /admin/*
│   ├── /admin/graduate-attributes — GraduateAttributeManager
│   ├── /admin/competency-frameworks — CompetencyFrameworkManager
│   ├── /admin/historical-evidence — HistoricalEvidenceDashboard
│   └── /admin/dashboard — AdminDashboard (+ Graduate Attribute attainment card)
├── /coordinator/*
│   ├── /coordinator/sankey — SankeyDiagramView
│   ├── /coordinator/gap-analysis — GapAnalysisView
│   ├── /coordinator/coverage-heatmap — CoverageHeatmapView
│   ├── /coordinator/trends — SemesterTrendView
│   └── /coordinator/cohort-comparison — CohortComparisonView
├── /teacher/*
│   └── /teacher/outcomes — CLOListPage (+ Sub-CLO expansion)
```

#### Updated Edge Functions

```
└── Edge Functions
    ├── ... (existing)
    ├── calculate-attainment-rollup (updated: Sub-CLO weighted rollup, Graduate Attribute rollup)
    ├── generate-accreditation-report (updated: Graduate Attribute section, competency alignment matrix)
    ├── semester-close-snapshot (pg_cron → triggered at semester close)
    └── competency-framework-import (on-demand CSV import)
```

#### Materialized Views for Analytics Performance

```sql
-- Semester attainment snapshots (Requirement 109)
CREATE MATERIALIZED VIEW mv_semester_attainment AS
SELECT
  oa.outcome_id,
  lo.type AS outcome_type,
  c.semester_id,
  s.name AS semester_name,
  AVG(oa.attainment_percent) AS avg_attainment,
  COUNT(DISTINCT oa.student_id) AS student_count,
  COUNT(oa.id) AS evidence_count,
  STDDEV(oa.attainment_percent) AS std_deviation
FROM outcome_attainment oa
JOIN learning_outcomes lo ON lo.id = oa.outcome_id
JOIN courses c ON c.id = oa.course_id
JOIN semesters s ON s.id = c.semester_id
WHERE oa.scope = 'student'
GROUP BY oa.outcome_id, lo.type, c.semester_id, s.name;

CREATE UNIQUE INDEX idx_mv_semester_attainment ON mv_semester_attainment(outcome_id, semester_id);

-- Historical evidence aggregation (Requirement 111)
CREATE MATERIALIZED VIEW mv_historical_evidence AS
SELECT
  c.semester_id,
  s.name AS semester_name,
  s.start_date,
  lo.type AS outcome_type,
  lo.blooms_level,
  COUNT(e.id) AS evidence_count,
  AVG(e.score_percent) AS avg_score,
  SUM(CASE WHEN e.score_percent >= 85 THEN 1 ELSE 0 END) AS excellent_count,
  SUM(CASE WHEN e.score_percent >= 70 AND e.score_percent < 85 THEN 1 ELSE 0 END) AS satisfactory_count,
  SUM(CASE WHEN e.score_percent >= 50 AND e.score_percent < 70 THEN 1 ELSE 0 END) AS developing_count,
  SUM(CASE WHEN e.score_percent < 50 THEN 1 ELSE 0 END) AS not_yet_count
FROM evidence e
JOIN learning_outcomes lo ON lo.id = e.outcome_id
JOIN courses c ON c.id = e.course_id
JOIN semesters s ON s.id = c.semester_id
GROUP BY c.semester_id, s.name, s.start_date, lo.type, lo.blooms_level;

CREATE UNIQUE INDEX idx_mv_historical_evidence ON mv_historical_evidence(semester_id, outcome_type, blooms_level);
```

### Components and Interfaces

#### Sub-CLO Manager (`/src/pages/teacher/outcomes/SubCLOManager.tsx`)
```typescript
interface SubCLOFormData {
  parent_outcome_id: string; // parent CLO id
  title: string;
  description: string;
  code: string;
  weight: number; // 0.0–1.0
}

interface SubCLO {
  id: string;
  parent_outcome_id: string;
  title: string;
  description: string;
  code: string;
  weight: number;
  type: 'SUB_CLO';
  created_at: string;
}

interface SubCLOListProps {
  cloId: string;
  courseId: string;
}

// Expandable children beneath parent CLO in outcome list views
// Weight sum validation: sum of all Sub-CLO weights under a CLO must equal 1.0
// Deletion blocked when Sub-CLO has linked evidence records
```

#### Graduate Attribute Manager (`/src/pages/admin/graduate-attributes/GraduateAttributeManager.tsx`)
```typescript
interface GraduateAttributeFormData {
  title: string;
  description: string;
  code: string;
}

interface GraduateAttribute {
  id: string;
  institution_id: string;
  title: string;
  description: string;
  code: string;
  created_at: string;
  updated_at: string;
}

interface GraduateAttributeMappingFormData {
  graduate_attribute_id: string;
  ilo_id: string;
  weight: number; // 0.0–1.0
}

interface GraduateAttributeAttainmentCard {
  attribute_id: string;
  attribute_title: string;
  attribute_code: string;
  attainment_percent: number;
  mapped_ilo_count: number;
}
```

#### Competency Framework Manager (`/src/pages/admin/competency-frameworks/CompetencyFrameworkManager.tsx`)
```typescript
interface CompetencyFrameworkFormData {
  name: string;
  version: string;
  source: string; // e.g., "ABET EAC 2024"
}

interface CompetencyFramework {
  id: string;
  institution_id: string;
  name: string;
  version: string;
  source: string;
  created_at: string;
}

type CompetencyItemLevel = 'domain' | 'competency' | 'indicator';

interface CompetencyItemFormData {
  framework_id: string;
  parent_id: string | null;
  level: CompetencyItemLevel;
  code: string;
  title: string;
}

interface CompetencyItem {
  id: string;
  framework_id: string;
  parent_id: string | null;
  level: CompetencyItemLevel;
  code: string;
  title: string;
  children?: CompetencyItem[];
}

interface CompetencyOutcomeMappingFormData {
  competency_item_id: string;
  outcome_id: string;
  outcome_type: 'ILO' | 'PLO' | 'CLO';
}

interface CompetencyCSVRow {
  domain_code: string;
  domain_title: string;
  competency_code: string;
  competency_title: string;
  indicator_code: string;
  indicator_title: string;
}
```

#### Sankey Diagram View (`/src/pages/coordinator/sankey/SankeyDiagramView.tsx`)
```typescript
interface SankeyNode {
  id: string;
  label: string;
  type: 'ILO' | 'PLO' | 'CLO';
  attainment_percent: number | null;
  attainment_level: AttainmentLevel | 'unmapped' | null;
}

interface SankeyLink {
  source: string; // node id
  target: string; // node id
  weight: number;
  attainment_percent: number | null;
}

interface SankeyDiagramProps {
  programId?: string;
  courseId?: string;
  semesterId?: string;
}

// Renders using Recharts Sankey or a custom D3-based Sankey component
// Node colors: green (Excellent), blue (Satisfactory), yellow (Developing), red (Not Yet), gray (Unmapped)
// Hover tooltip: source outcome, target outcome, weight, attainment %
// Click node: opens detail panel with full outcome info
// Filter by program, course, semester
// Performance target: render within 2 seconds for 30 ILOs, 100 PLOs, 500 CLOs
```

#### Gap Analysis View (`/src/pages/coordinator/gap-analysis/GapAnalysisView.tsx`)
```typescript
type GapStatus = 'fully_mapped' | 'partially_mapped' | 'unmapped' | 'no_evidence';

interface GapAnalysisNode {
  outcome_id: string;
  outcome_title: string;
  outcome_code: string;
  outcome_type: 'ILO' | 'PLO' | 'CLO';
  status: GapStatus;
  mapped_children_count: number;
  total_children_count: number;
  evidence_count: number;
  attainment_percent: number | null;
  children?: GapAnalysisNode[];
}

interface GapAnalysisSummary {
  total_outcomes: number;
  fully_mapped_percent: number;
  with_evidence_percent: number;
  meeting_target_percent: number;
}

interface GapAnalysisRecommendation {
  outcome_id: string;
  action: string; // e.g., "Add CLO mapping to PLO-3"
}

interface GapAnalysisViewProps {
  programId: string;
  semesterId: string;
}

// Hierarchical tree with status indicators
// PLO flagged as "Under-Mapped" when < 2 mapped CLOs
// CLO flagged as "Unassessed" when 0 linked assessments in current semester
// Summary statistics bar at top
// Click flagged outcome → recommended actions panel
// Exportable as PDF
```

#### Coverage Heatmap View (`/src/pages/coordinator/coverage-heatmap/CoverageHeatmapView.tsx`)
```typescript
type HeatmapColorMode = 'evidence_count' | 'attainment_percent';

interface HeatmapCell {
  clo_id: string;
  course_id: string;
  evidence_count: number;
  attainment_percent: number | null;
  student_count: number;
}

interface CoverageHeatmapProps {
  programId: string;
  semesterId?: string;
  attainmentThreshold?: number;
}

// Matrix: CLOs (rows) × Courses (columns)
// Color scale: white (0) → light blue (1–5) → dark blue (6+) for evidence count
// Toggle to attainment percentage coloring
// Click cell → drill-down to individual student attainment records
// Filter by semester, program, attainment level threshold
// Empty cells highlighted with distinct border pattern
// Performance target: render within 3 seconds for 200 CLOs × 50 courses
```

#### Semester Trend View (`/src/pages/coordinator/trends/SemesterTrendView.tsx`)
```typescript
interface SemesterTrendDataPoint {
  semester_id: string;
  semester_name: string;
  attainment_percent: number;
  student_count: number;
  evidence_count: number;
}

interface SemesterTrendViewProps {
  outcomeId?: string;
  outcomeType?: 'CLO' | 'PLO' | 'ILO';
}

// Line chart: attainment % over semesters (up to 8 semesters)
// Declining trend warning: ≥10 percentage point drop between consecutive semesters
// Side-by-side comparison of up to 4 outcomes
// Tabular view alongside chart
// Data from mv_semester_attainment materialized view
```

#### Cohort Comparison View (`/src/pages/coordinator/cohort-comparison/CohortComparisonView.tsx`)
```typescript
type CohortDefinition = {
  type: 'semester' | 'section' | 'enrollment_year';
  value: string;
  label: string;
};

interface CohortComparisonData {
  outcome_code: string;
  outcome_title: string;
  cohorts: Array<{
    label: string;
    avg_attainment: number;
    student_count: number;
    std_deviation: number;
  }>;
  effect_size?: number; // Cohen's d (only for 2-cohort comparison with n≥20)
  has_significant_gap: boolean; // ≥15 percentage point difference
}

interface CohortComparisonViewProps {
  programId: string;
}

// Grouped bar chart: average attainment per CLO/PLO across cohorts
// Cohen's d effect size for 2-cohort comparisons with n≥20
// CSV export: outcome_code, outcome_title, cohort_label, average_attainment, student_count, standard_deviation
// Red highlight + "Significant Gap" label when ≥15 pp difference
// Accessible from Coordinator and Admin dashboards
```

#### Historical Evidence Dashboard (`/src/pages/admin/historical-evidence/HistoricalEvidenceDashboard.tsx`)
```typescript
interface HistoricalEvidenceStats {
  total_evidence_records: number;
  avg_attainment_by_level: Record<'CLO' | 'PLO' | 'ILO', number>;
  attainment_distribution: Record<AttainmentLevel, number>;
}

interface HistoricalEvidenceSemesterData {
  semester_name: string;
  excellent_count: number;
  satisfactory_count: number;
  developing_count: number;
  not_yet_count: number;
}

interface HistoricalEvidenceDashboardProps {
  programId?: string;
  courseId?: string;
  outcomeId?: string;
  bloomsLevel?: BloomsLevel;
}

// Stacked area chart: proportion of attainment levels per semester over time
// Filter by program, course, outcome, Bloom's level
// "Continuous Improvement Report" PDF generation
// Data from mv_historical_evidence materialized view
// Performance target: load within 4 seconds for 500,000 evidence records
```

### New TanStack Query Hooks

```typescript
// Sub-CLOs
useSubCLOs(cloId: string)
useCreateSubCLO()
useUpdateSubCLO()
useDeleteSubCLO()

// Graduate Attributes
useGraduateAttributes(institutionId: string)
useCreateGraduateAttribute()
useUpdateGraduateAttribute()
useDeleteGraduateAttribute()
useGraduateAttributeMappings(attributeId: string)
useGraduateAttributeAttainment(institutionId: string)

// Competency Frameworks
useCompetencyFrameworks(institutionId: string)
useCompetencyItems(frameworkId: string)
useCreateCompetencyFramework()
useImportCompetencyCSV()
useCompetencyOutcomeMappings(frameworkId: string)

// Visualizations
useSankeyData(programId?: string, courseId?: string, semesterId?: string)
useGapAnalysis(programId: string, semesterId: string)
useCoverageHeatmap(programId: string, semesterId?: string)
useSemesterTrends(outcomeId: string, outcomeType: string)
useCohortComparison(programId: string, cohorts: CohortDefinition[])
useHistoricalEvidence(filters: HistoricalEvidenceFilters)
```

### New Zod Schemas

```
subCLO.ts                — subCLOSchema, subCLOWeightSumSchema
graduateAttribute.ts     — graduateAttributeSchema, graduateAttributeMappingSchema
competencyFramework.ts   — competencyFrameworkSchema, competencyItemSchema, competencyCSVRowSchema
sankeyFilter.ts          — sankeyFilterSchema
gapAnalysis.ts           — gapAnalysisFilterSchema
coverageHeatmap.ts       — coverageHeatmapFilterSchema
semesterTrend.ts         — semesterTrendFilterSchema
cohortComparison.ts      — cohortDefinitionSchema, cohortComparisonExportSchema
historicalEvidence.ts    — historicalEvidenceFilterSchema
```

### Data Models

#### `graduate_attributes` (Requirement 104)
```sql
CREATE TABLE graduate_attributes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid REFERENCES institutions(id) NOT NULL,
  title text NOT NULL,
  description text,
  code text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (institution_id, code)
);
ALTER TABLE graduate_attributes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin manages graduate attributes" ON graduate_attributes
  FOR ALL USING (institution_id = auth_institution_id() AND auth_user_role() = 'admin');
CREATE POLICY "All roles read graduate attributes" ON graduate_attributes
  FOR SELECT USING (institution_id = auth_institution_id());
```

#### `graduate_attribute_mappings` (Requirement 104)
```sql
CREATE TABLE graduate_attribute_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  graduate_attribute_id uuid REFERENCES graduate_attributes(id) ON DELETE CASCADE NOT NULL,
  ilo_id uuid REFERENCES learning_outcomes(id) ON DELETE CASCADE NOT NULL,
  weight numeric NOT NULL DEFAULT 1.0 CHECK (weight > 0 AND weight <= 1.0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (graduate_attribute_id, ilo_id)
);
ALTER TABLE graduate_attribute_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin manages GA mappings" ON graduate_attribute_mappings
  FOR ALL USING (
    EXISTS (SELECT 1 FROM graduate_attributes ga WHERE ga.id = graduate_attribute_id AND ga.institution_id = auth_institution_id())
    AND auth_user_role() = 'admin'
  );
CREATE POLICY "All roles read GA mappings" ON graduate_attribute_mappings
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM graduate_attributes ga WHERE ga.id = graduate_attribute_id AND ga.institution_id = auth_institution_id())
  );
```

#### `competency_frameworks` (Requirement 105)
```sql
CREATE TABLE competency_frameworks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid REFERENCES institutions(id) NOT NULL,
  name text NOT NULL,
  version text NOT NULL,
  source text NOT NULL, -- e.g., "ABET EAC 2024"
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (institution_id, name, version)
);
ALTER TABLE competency_frameworks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin manages competency frameworks" ON competency_frameworks
  FOR ALL USING (institution_id = auth_institution_id() AND auth_user_role() = 'admin');
CREATE POLICY "All roles read competency frameworks" ON competency_frameworks
  FOR SELECT USING (institution_id = auth_institution_id());
```

#### `competency_items` (Requirement 105)
```sql
CREATE TABLE competency_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  framework_id uuid REFERENCES competency_frameworks(id) ON DELETE CASCADE NOT NULL,
  parent_id uuid REFERENCES competency_items(id) ON DELETE CASCADE,
  level text NOT NULL CHECK (level IN ('domain', 'competency', 'indicator')),
  code text NOT NULL,
  title text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (framework_id, code)
);
ALTER TABLE competency_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin manages competency items" ON competency_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM competency_frameworks cf WHERE cf.id = framework_id AND cf.institution_id = auth_institution_id())
    AND auth_user_role() = 'admin'
  );
CREATE POLICY "All roles read competency items" ON competency_items
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM competency_frameworks cf WHERE cf.id = framework_id AND cf.institution_id = auth_institution_id())
  );
```

#### `competency_outcome_mappings` (Requirement 105)
```sql
CREATE TABLE competency_outcome_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competency_item_id uuid REFERENCES competency_items(id) ON DELETE CASCADE NOT NULL,
  outcome_id uuid REFERENCES learning_outcomes(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (competency_item_id, outcome_id)
);
ALTER TABLE competency_outcome_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin manages competency-outcome mappings" ON competency_outcome_mappings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM competency_items ci
      JOIN competency_frameworks cf ON cf.id = ci.framework_id
      WHERE ci.id = competency_item_id AND cf.institution_id = auth_institution_id()
    )
    AND auth_user_role() = 'admin'
  );
CREATE POLICY "All roles read competency-outcome mappings" ON competency_outcome_mappings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM competency_items ci
      JOIN competency_frameworks cf ON cf.id = ci.framework_id
      WHERE ci.id = competency_item_id AND cf.institution_id = auth_institution_id()
    )
  );
```

#### `semester_attainment_snapshots` (Requirement 109)
```sql
CREATE TABLE semester_attainment_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  outcome_id uuid REFERENCES learning_outcomes(id) ON DELETE CASCADE NOT NULL,
  semester_id uuid REFERENCES semesters(id) ON DELETE CASCADE NOT NULL,
  avg_attainment numeric NOT NULL CHECK (avg_attainment >= 0 AND avg_attainment <= 100),
  student_count integer NOT NULL DEFAULT 0,
  evidence_count integer NOT NULL DEFAULT 0,
  std_deviation numeric,
  snapshot_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (outcome_id, semester_id)
);
ALTER TABLE semester_attainment_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coordinator/Admin read snapshots" ON semester_attainment_snapshots
  FOR SELECT USING (
    auth_user_role() IN ('admin', 'coordinator')
    AND EXISTS (
      SELECT 1 FROM learning_outcomes lo
      JOIN programs p ON p.id = lo.program_id OR p.institution_id = auth_institution_id()
      WHERE lo.id = outcome_id
    )
  );
```

#### Column Additions for Sub-CLOs (Requirement 103)

The existing `learning_outcomes` table already supports hierarchical outcomes. Sub-CLOs use:
```sql
-- learning_outcomes already has: id, type, parent_outcome_id, course_id, program_id, institution_id
-- Add weight column for Sub-CLO contribution to parent CLO
ALTER TABLE learning_outcomes ADD COLUMN weight numeric DEFAULT 1.0
  CHECK (weight > 0 AND weight <= 1.0);

-- Add type value 'SUB_CLO' to the type check constraint
ALTER TABLE learning_outcomes DROP CONSTRAINT IF EXISTS learning_outcomes_type_check;
ALTER TABLE learning_outcomes ADD CONSTRAINT learning_outcomes_type_check
  CHECK (type IN ('ILO', 'PLO', 'CLO', 'SUB_CLO'));

-- Trigger: validate Sub-CLO weight sum = 1.0 before assignment linkage
CREATE OR REPLACE FUNCTION validate_sub_clo_weights()
RETURNS trigger AS $$
BEGIN
  IF NEW.type = 'SUB_CLO' THEN
    -- Check that parent is a CLO
    IF NOT EXISTS (SELECT 1 FROM learning_outcomes WHERE id = NEW.parent_outcome_id AND type = 'CLO') THEN
      RAISE EXCEPTION 'Sub-CLO parent must be a CLO';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_sub_clo
  BEFORE INSERT OR UPDATE ON learning_outcomes
  FOR EACH ROW EXECUTE FUNCTION validate_sub_clo_weights();
```

### New Shared Components

```typescript
SubCLORow             // Expandable Sub-CLO row beneath parent CLO
GraduateAttributeCard // GA attainment card for Admin dashboard
CompetencyTree        // Hierarchical Domain → Competency → Indicator tree view
SankeyChart           // Reusable Sankey diagram component (Recharts or D3)
GapStatusBadge        // Color-coded gap status indicator (green/yellow/red/gray)
HeatmapGrid           // Reusable heatmap matrix with drill-down
TrendLineChart        // Multi-series line chart for semester trends
CohortBarChart        // Grouped bar chart for cohort comparison
StackedAreaChart      // Stacked area chart for historical evidence distribution
DecliningTrendBadge   // Warning badge for ≥10pp attainment decline
SignificantGapLabel   // Red "Significant Gap" label for cohort comparison
CompetencyAlignmentMatrix // Competency × Outcome alignment matrix with coverage indicators
```


---

## SECTION V: Habit Engine Enhancements (Requirements 112–123)

### Overview

This section extends the Habit Core with 4 new habit types (Collaborate, Practice, Review, Mentor), a full social challenges system (team-based and course-wide), team management with shared XP pools, team leaderboards/badges/streaks, and an adaptive XP scaling engine with level-based, difficulty-based, diminishing returns, and improvement bonus mechanics. These features target Student and Teacher roles, deepening engagement through collaboration and fair reward scaling.

### Architecture

#### Updated High-Level Component Flow

```
├── /teacher/*
│   ├── /teacher/teams — TeamManager
│   ├── /teacher/challenges — ChallengeManager
│   └── /teacher/courses — CourseDetail (+ team assignment)
├── /student/*
│   ├── /student/dashboard — StudentDashboard (+ 8-habit grid, team card, challenges tab, XP multiplier)
│   ├── /student/team — TeamDashboard
│   ├── /student/challenges — ChallengeListView
│   └── /student/leaderboard — LeaderboardView (+ team leaderboard tab)
```

#### Updated Edge Functions

```
└── Edge Functions
    ├── award-xp (updated: adaptive XP calculation with level/difficulty/diminishing returns multipliers, team XP contribution)
    ├── check-badges (updated: team badges, Comeback Kid badge)
    ├── process-streak (updated: team streak calculation)
    ├── perfect-day-nudge-cron (updated: 6/8 habits threshold)
    ├── challenge-progress-update (triggered on qualifying actions during active challenges)
    ├── challenge-completion (pg_cron → checks challenge end dates daily)
    ├── team-streak-risk-cron (pg_cron → 8 PM daily — notify teams at risk)
    └── improvement-bonus-check (triggered after evidence creation)
```

#### Realtime Subscriptions

```typescript
// Team leaderboard: subscribe to team_gamification changes
supabase.channel('team-leaderboard')
  .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'team_gamification' }, handleTeamXPUpdate)
  .subscribe();

// Challenge progress: subscribe to social_challenge_progress changes
supabase.channel('challenge-progress')
  .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'social_challenges', filter: `status=eq.active` }, handleChallengeUpdate)
  .subscribe();
```

### Components and Interfaces

#### Extended Habit Tracker (`/src/components/shared/HabitTracker.tsx` — updated)
```typescript
type HabitType = 'login' | 'submit' | 'journal' | 'read' | 'collaborate' | 'practice' | 'review' | 'mentor';

// Updated: 8 habits in 7-day grid
// Perfect Day threshold updated: 6 of 8 habits
// New habit icons: Collaborate (MessageSquare), Practice (Brain), Review (Eye), Mentor (HandHelping)
// XP: 15 XP per extended habit completion per day
```

#### Team Manager (`/src/pages/teacher/teams/TeamManager.tsx`)
```typescript
interface TeamFormData {
  name: string;
  course_id: string;
}

interface Team {
  id: string;
  name: string;
  course_id: string;
  created_by: string;
  avatar_letter: string; // auto-generated from first letter of name
  created_at: string;
}

interface TeamMember {
  team_id: string;
  student_id: string;
  student_name: string;
  joined_at: string;
}

interface TeamManagerProps {
  courseId: string;
}

interface AutoGenerateTeamsFormData {
  course_id: string;
  team_size: number; // 2–6
}

// Create teams manually or auto-generate balanced teams
// Enforce: min 2, max 6 members per team
// Enforce: student can only be in 1 team per course
// Retain historical contribution on member removal
```

#### Challenge Manager (`/src/pages/teacher/challenges/ChallengeManager.tsx`)
```typescript
type ChallengeType = 'team' | 'course_wide';
type ChallengeGoalMetric = 'total_xp' | 'habits_completed' | 'assignments_submitted' | 'quiz_score_avg';
type ChallengeStatus = 'draft' | 'active' | 'completed' | 'cancelled';

interface ChallengeFormData {
  title: string;
  description: string;
  challenge_type: ChallengeType;
  course_id: string;
  start_date: string;
  end_date: string;
  goal_metric: ChallengeGoalMetric;
  goal_target: number;
  reward_type: 'xp_bonus' | 'badge';
  reward_value: number; // XP amount or badge_id reference
  team_ids?: string[]; // for team challenges, min 2, max 20
}

interface SocialChallenge extends ChallengeFormData {
  id: string;
  status: ChallengeStatus;
  created_by: string;
  created_at: string;
}

interface ChallengeProgress {
  challenge_id: string;
  participant_id: string; // team_id or student_id
  participant_type: 'team' | 'student';
  current_progress: number;
  goal_target: number;
  progress_percent: number;
}

interface ChallengeManagerProps {
  courseId: string;
}
```

#### Challenge List View (`/src/pages/student/challenges/ChallengeListView.tsx`)
```typescript
interface ChallengeListViewProps {
  studentId: string;
  courseId?: string;
}

// Active and completed challenges
// Live progress bars for active challenges
// Contribution leaderboard for course-wide challenges
// Team progress for team-based challenges
```

#### Team Dashboard Card (`/src/components/shared/TeamDashboardCard.tsx`)
```typescript
interface TeamDashboardCardProps {
  teamId: string;
  studentId: string;
}

// Displays: team name, avatar, member avatars, team XP pool, team streak (flame icon)
// Team badges section
// Link to full team leaderboard
```

#### Team Leaderboard (`/src/pages/student/leaderboard/TeamLeaderboard.tsx`)
```typescript
interface TeamLeaderboardEntry {
  rank: number;
  team_id: string;
  team_name: string;
  avatar_letter: string;
  member_count: number;
  xp_total: number;
  xp_this_week: number;
  is_current_team: boolean;
}

interface TeamLeaderboardProps {
  courseId: string;
  studentId: string;
  view: 'weekly' | 'all_time';
}

// Real-time updates via Supabase Realtime
// Top 3: Gold, Silver, Bronze styling
// Current team highlighted
// Accessible from Student Dashboard and course detail
```

#### Team Badge Display (`/src/components/shared/TeamBadgeDisplay.tsx`)
```typescript
interface TeamBadge {
  badge_id: string;
  badge_name: string;
  badge_emoji: string;
  badge_description: string;
  earned_at: string;
}

// Team Spirit: team earns 500 XP
// Unstoppable: team wins 3 challenges
// Dream Team: all members complete Perfect Day on same day
// Study Squad: team maintains 7-day team streak
```

#### Adaptive XP Display (`/src/components/shared/AdaptiveXPDisplay.tsx`)
```typescript
interface AdaptiveXPDisplayProps {
  studentId: string;
  currentLevel: number;
  levelMultiplier: number;
}

// Shows current XP multiplier on Student Dashboard gamification card
// Displays "Diminishing Returns" indicator when next action would receive reduced XP
// Shows difficulty bonus on assignment detail page
```

#### Improvement Bonus Celebration (`/src/components/shared/ImprovementBonusCelebration.tsx`)
```typescript
interface ImprovementBonusCelebrationProps {
  cloTitle: string;
  bonusXP: number;
  previousPercent: number;
  currentPercent: number;
}

// Celebratory animation: "Great improvement on [CLO title]!"
// Shows +50 XP bonus amount
// Uses Framer Motion + canvas-confetti
```

### New TanStack Query Hooks

```typescript
// Teams
useTeams(courseId: string)
useTeamMembers(teamId: string)
useCreateTeam()
useAutoGenerateTeams()
useAddTeamMember()
useRemoveTeamMember()
useTeamGamification(teamId: string)

// Challenges
useChallenges(courseId: string, status?: ChallengeStatus)
useCreateChallenge()
useChallengeProgress(challengeId: string)
useStudentChallenges(studentId: string)

// Team Leaderboard
useTeamLeaderboard(courseId: string, view: 'weekly' | 'all_time')

// Team Badges
useTeamBadges(teamId: string)

// Adaptive XP
useStudentXPMultiplier(studentId: string)
useDiminishingReturnsStatus(studentId: string, actionType: string)
useImprovementBonusHistory(studentId: string)
```

### New Zod Schemas

```
team.ts              — teamSchema, teamMemberSchema, autoGenerateTeamsSchema
challenge.ts         — challengeSchema, challengeProgressSchema
teamLeaderboard.ts   — teamLeaderboardFilterSchema
teamBadge.ts         — teamBadgeSchema
adaptiveXP.ts        — xpMultiplierSchema, diminishingReturnsSchema
improvementBonus.ts  — improvementBonusSchema
```

### Data Models

#### Updated `habit_logs` type constraint (Requirement 112)
```sql
ALTER TABLE habit_logs DROP CONSTRAINT IF EXISTS habit_logs_habit_type_check;
ALTER TABLE habit_logs ADD CONSTRAINT habit_logs_habit_type_check
  CHECK (habit_type IN ('login', 'submit', 'journal', 'read', 'collaborate', 'practice', 'review', 'mentor'));
```

#### `teams` (Requirement 115)
```sql
CREATE TABLE teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  course_id uuid REFERENCES courses(id) ON DELETE CASCADE NOT NULL,
  created_by uuid REFERENCES profiles(id) NOT NULL,
  avatar_letter char(1) NOT NULL, -- auto-generated from first letter of name
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (course_id, name)
);
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teacher manages teams in own courses" ON teams
  FOR ALL USING (
    EXISTS (SELECT 1 FROM courses c WHERE c.id = course_id AND c.teacher_id = auth.uid())
    OR EXISTS (SELECT 1 FROM course_sections cs WHERE cs.course_id = course_id AND cs.teacher_id = auth.uid())
  );
CREATE POLICY "Students read teams in enrolled courses" ON teams
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM student_courses sc WHERE sc.course_id = course_id AND sc.student_id = auth.uid())
  );
```

#### `team_members` (Requirement 115)
```sql
CREATE TABLE team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  student_id uuid REFERENCES profiles(id) NOT NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (team_id, student_id)
);
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- Enforce: max 6 members per team
CREATE OR REPLACE FUNCTION enforce_team_size_limit()
RETURNS trigger AS $$
BEGIN
  IF (SELECT COUNT(*) FROM team_members WHERE team_id = NEW.team_id) >= 6 THEN
    RAISE EXCEPTION 'Team cannot have more than 6 members';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_team_size_limit
  BEFORE INSERT ON team_members
  FOR EACH ROW EXECUTE FUNCTION enforce_team_size_limit();

-- Enforce: student can only be in 1 team per course
CREATE OR REPLACE FUNCTION enforce_one_team_per_course()
RETURNS trigger AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM team_members tm
    JOIN teams t ON t.id = tm.team_id
    JOIN teams new_t ON new_t.id = NEW.team_id
    WHERE tm.student_id = NEW.student_id
    AND t.course_id = new_t.course_id
    AND tm.team_id != NEW.team_id
  ) THEN
    RAISE EXCEPTION 'Student is already a member of another team in this course';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_one_team_per_course
  BEFORE INSERT ON team_members
  FOR EACH ROW EXECUTE FUNCTION enforce_one_team_per_course();

CREATE POLICY "Teacher manages team members" ON team_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM teams t
      JOIN courses c ON c.id = t.course_id
      WHERE t.id = team_id AND (c.teacher_id = auth.uid()
        OR EXISTS (SELECT 1 FROM course_sections cs WHERE cs.course_id = c.id AND cs.teacher_id = auth.uid()))
    )
  );
CREATE POLICY "Students read team members in own course" ON team_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM teams t
      JOIN student_courses sc ON sc.course_id = t.course_id
      WHERE t.id = team_id AND sc.student_id = auth.uid()
    )
  );
```

#### `team_gamification` (Requirements 116, 119)
```sql
CREATE TABLE team_gamification (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid REFERENCES teams(id) ON DELETE CASCADE NOT NULL UNIQUE,
  xp_total integer NOT NULL DEFAULT 0 CHECK (xp_total >= 0),
  xp_this_week integer NOT NULL DEFAULT 0 CHECK (xp_this_week >= 0),
  streak_current integer NOT NULL DEFAULT 0 CHECK (streak_current >= 0),
  streak_longest integer NOT NULL DEFAULT 0 CHECK (streak_longest >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE team_gamification ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read team gamification in enrolled courses" ON team_gamification
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM teams t
      JOIN student_courses sc ON sc.course_id = t.course_id
      WHERE t.id = team_id AND sc.student_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM teams t
      JOIN courses c ON c.id = t.course_id
      WHERE t.id = team_id AND (c.teacher_id = auth.uid()
        OR EXISTS (SELECT 1 FROM course_sections cs WHERE cs.course_id = c.id AND cs.teacher_id = auth.uid()))
    )
  );
```

#### `social_challenges` (Requirements 113, 114)
```sql
CREATE TABLE social_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES courses(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  challenge_type text NOT NULL CHECK (challenge_type IN ('team', 'course_wide')),
  start_date timestamptz NOT NULL,
  end_date timestamptz NOT NULL CHECK (end_date > start_date),
  goal_metric text NOT NULL CHECK (goal_metric IN ('total_xp', 'habits_completed', 'assignments_submitted', 'quiz_score_avg')),
  goal_target numeric NOT NULL CHECK (goal_target > 0),
  reward_type text NOT NULL CHECK (reward_type IN ('xp_bonus', 'badge')),
  reward_value numeric NOT NULL CHECK (reward_value > 0),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),
  created_by uuid REFERENCES profiles(id) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE social_challenges ENABLE ROW LEVEL SECURITY;

-- Enforce max 3 active course-wide challenges per course
CREATE OR REPLACE FUNCTION enforce_course_wide_challenge_limit()
RETURNS trigger AS $$
BEGIN
  IF NEW.challenge_type = 'course_wide' AND NEW.status = 'active' THEN
    IF (SELECT COUNT(*) FROM social_challenges
        WHERE course_id = NEW.course_id AND challenge_type = 'course_wide' AND status = 'active'
        AND id != NEW.id) >= 3 THEN
      RAISE EXCEPTION 'Maximum 3 active course-wide challenges per course';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_course_wide_challenge_limit
  BEFORE INSERT OR UPDATE ON social_challenges
  FOR EACH ROW EXECUTE FUNCTION enforce_course_wide_challenge_limit();

CREATE POLICY "Teacher manages challenges in own courses" ON social_challenges
  FOR ALL USING (
    EXISTS (SELECT 1 FROM courses c WHERE c.id = course_id AND c.teacher_id = auth.uid())
    OR EXISTS (SELECT 1 FROM course_sections cs WHERE cs.course_id = course_id AND cs.teacher_id = auth.uid())
  );
CREATE POLICY "Students read challenges in enrolled courses" ON social_challenges
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM student_courses sc WHERE sc.course_id = course_id AND sc.student_id = auth.uid())
  );
```

#### `challenge_participants` (Requirements 113, 114)
```sql
CREATE TABLE challenge_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid REFERENCES social_challenges(id) ON DELETE CASCADE NOT NULL,
  participant_id uuid NOT NULL, -- team_id for team challenges, student_id for course-wide
  participant_type text NOT NULL CHECK (participant_type IN ('team', 'student')),
  current_progress numeric NOT NULL DEFAULT 0 CHECK (current_progress >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (challenge_id, participant_id)
);
ALTER TABLE challenge_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read challenge participants in enrolled courses" ON challenge_participants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM social_challenges sc
      JOIN student_courses stc ON stc.course_id = sc.course_id
      WHERE sc.id = challenge_id AND stc.student_id = auth.uid()
    )
  );
```

#### Updated `xp_transactions` columns (Requirements 116, 120, 121, 122, 123)
```sql
-- Add team XP tracking
ALTER TABLE xp_transactions ADD COLUMN scope text NOT NULL DEFAULT 'individual'
  CHECK (scope IN ('individual', 'team'));
ALTER TABLE xp_transactions ADD COLUMN team_id uuid REFERENCES teams(id);

-- Add adaptive XP fields
ALTER TABLE xp_transactions ADD COLUMN base_xp integer;
ALTER TABLE xp_transactions ADD COLUMN final_xp integer;
ALTER TABLE xp_transactions ADD COLUMN level_multiplier numeric DEFAULT 1.0;
ALTER TABLE xp_transactions ADD COLUMN difficulty_multiplier numeric DEFAULT 1.0;
ALTER TABLE xp_transactions ADD COLUMN diminishing_multiplier numeric DEFAULT 1.0;

-- Add improvement bonus fields
ALTER TABLE xp_transactions ADD COLUMN action_type text;
-- action_type values: 'submission', 'login', 'habit', 'badge', 'challenge', 'improvement_bonus', etc.
ALTER TABLE xp_transactions ADD COLUMN previous_score numeric;
ALTER TABLE xp_transactions ADD COLUMN current_score numeric;
ALTER TABLE xp_transactions ADD COLUMN clo_id uuid REFERENCES learning_outcomes(id);
```

#### Updated `badges` table for team scope (Requirement 118)
```sql
ALTER TABLE badges ADD COLUMN scope text NOT NULL DEFAULT 'individual'
  CHECK (scope IN ('individual', 'team'));
ALTER TABLE badges ADD COLUMN team_id uuid REFERENCES teams(id);

-- Team badge definitions (seeded)
-- Team Spirit: team earns 500 XP
-- Unstoppable: team wins 3 challenges
-- Dream Team: all members complete Perfect Day on same day
-- Study Squad: team maintains 7-day team streak
```

### Adaptive XP Engine Logic (Requirements 120–123)

```typescript
// Level-based multiplier table (Requirement 120)
const LEVEL_MULTIPLIERS: Record<string, number> = {
  '1-5': 1.2,    // encouragement bonus
  '6-10': 1.0,   // baseline
  '11-15': 0.9,  // slight reduction
  '16-20': 0.8,  // experienced reduction
};

function getLevelMultiplier(level: number): number {
  if (level <= 5) return 1.2;
  if (level <= 10) return 1.0;
  if (level <= 15) return 0.9;
  return 0.8;
}

// Difficulty-based multiplier (Requirement 121)
const BLOOMS_MULTIPLIERS: Record<BloomsLevel, number> = {
  remembering: 1.0,
  understanding: 1.1,
  applying: 1.2,
  analyzing: 1.3,
  evaluating: 1.4,
  creating: 1.5,
};

// For assignments linked to multiple CLOs, use highest Bloom's level
function getDifficultyMultiplier(cloBloomsLevels: BloomsLevel[]): number {
  const highest = cloBloomsLevels.reduce((max, level) =>
    BLOOMS_MULTIPLIERS[level] > BLOOMS_MULTIPLIERS[max] ? level : max
  );
  return BLOOMS_MULTIPLIERS[highest];
}

// Diminishing returns (Requirement 122)
function getDiminishingMultiplier(repeatCount: number): number {
  // 1st action: 1.0, 2nd: 0.8, 3rd: 0.6, 4th: 0.4, 5th+: 0.2
  const multiplier = Math.max(0.2, 1.0 - (repeatCount - 1) * 0.2);
  return multiplier;
}

// Does NOT apply to: streak milestones, badge awards, level-up bonuses

// Final XP calculation
function calculateFinalXP(
  baseXP: number,
  level: number,
  bloomsLevels: BloomsLevel[],
  repeatCount: number,
  isMilestone: boolean
): number {
  const levelMult = getLevelMultiplier(level);
  const diffMult = getDifficultyMultiplier(bloomsLevels);
  const dimMult = isMilestone ? 1.0 : getDiminishingMultiplier(repeatCount);
  return Math.floor(baseXP * levelMult * diffMult * dimMult);
}

// Improvement bonus check (Requirement 123)
function checkImprovementBonus(
  currentScore: number,
  previousScore: number
): { eligible: boolean; bonusXP: number } {
  const improvement = currentScore - previousScore;
  return {
    eligible: improvement >= 15,
    bonusXP: improvement >= 15 ? 50 : 0,
  };
}
```

### New Shared Components

```typescript
TeamCard              // Team summary card with avatar, members, XP pool
TeamMemberAvatar      // Small avatar with tooltip for team member
ChallengeCard         // Challenge card with progress bar and countdown
ChallengeProgressBar  // Animated progress bar toward goal target
ContributionLeaderboard // Individual contribution ranking within course-wide challenge
TeamStreakDisplay      // Team streak flame icon with count
TeamBadgeCard         // Team badge display card
XPMultiplierBadge     // Current XP multiplier indicator
DiminishingReturnsBadge // "Reduced XP" warning indicator
DifficultyBonusBadge  // Bloom's level difficulty bonus indicator on assignment detail
ImprovementBonusCelebration // Celebratory animation for improvement bonus
AutoGenerateTeamsDialog // Dialog for auto-generating balanced teams
ChallengeCountdown    // Countdown timer for active challenges
```


---

### Error Handling (Sections U & V)

| Scenario | Handling |
|----------|----------|
| Sub-CLO weight sum ≠ 1.0 | Block assignment linkage; show "Sub-CLO weights must sum to 1.0 (current: X.XX)" |
| Sub-CLO deletion with evidence | Block deletion; show "Cannot delete: X evidence records depend on this Sub-CLO" |
| Sub-CLO parent is not a CLO | Reject with "Sub-CLO parent must be a CLO" |
| Graduate Attribute code duplicate | "A Graduate Attribute with this code already exists" |
| Competency CSV malformed | Show row-level errors; process valid rows only |
| Competency indicator unmapped | Display "Unmapped" warning in alignment matrix |
| Sankey diagram data too large | Paginate or aggregate; show "Showing top N outcomes" |
| Gap analysis no outcomes | Show empty state: "No outcomes defined for this program" |
| Heatmap cell zero coverage | Highlight with dashed border pattern |
| Semester trend no data | Show "No trend data available — at least 2 semesters required" |
| Cohort comparison insufficient sample | Hide Cohen's d; show "Sample size too small for statistical comparison" |
| Historical evidence query timeout | Show partial results with "Loading more data..." indicator |
| Team name duplicate in course | "A team with this name already exists in this course" |
| Team size limit exceeded | "Team cannot have more than 6 members" |
| Student already in team | "Student is already a member of another team in this course" |
| Team size below minimum | "Team must have at least 2 members" |
| Challenge < 2 teams at start | Auto-cancel; notify teacher "Challenge cancelled: fewer than 2 teams" |
| Course-wide challenge limit | "Maximum 3 active course-wide challenges per course" |
| Challenge end date in past | "End date must be in the future" |
| Team XP direct transfer attempt | "Direct XP transfers between individual and team pools are not allowed" |
| Diminishing returns active | Show "Reduced XP" indicator with current multiplier |
| Improvement bonus no previous score | Skip bonus check; no previous assessment to compare |
| Adaptive XP calculation overflow | Cap final_xp at 9999 per transaction |

### Correctness Properties (81–100)

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 81: Sub-CLO weight sum constraint
*For any* CLO with one or more Sub-CLOs, the sum of all Sub-CLO weights must equal 1.0 (within floating-point tolerance of ±0.001). Assignment linkage to the parent CLO should be blocked when the weight sum deviates from 1.0.

**Validates: Requirements 103.1, 103.2**

### Property 82: Sub-CLO weighted rollup accuracy
*For any* CLO with Sub-CLOs, the parent CLO attainment should equal the weighted average of its Sub-CLO attainments: `sum(sub_clo_attainment × sub_clo_weight)`. When no Sub-CLOs exist, the CLO attainment should be calculated directly from evidence as before.

**Validates: Requirements 103.4**

### Property 83: Sub-CLO deletion protection
*For any* Sub-CLO with one or more linked evidence records, deletion should be rejected. The error response should include the count of dependent evidence records.

**Validates: Requirements 103.5**

### Property 84: Graduate Attribute weighted rollup accuracy
*For any* Graduate Attribute with one or more ILO mappings, the GA attainment should equal the weighted average of mapped ILO attainments: `sum(ilo_attainment × mapping_weight)`.

**Validates: Requirements 104.2, 104.3**

### Property 85: Graduate Attribute audit logging
*For any* create, update, or delete operation on a Graduate Attribute, an audit log record should be created with the correct action type and before/after snapshots. The audit log count for GA operations should equal the count of GA mutations performed.

**Validates: Requirements 104.6**

### Property 86: Competency hierarchy level consistency
*For any* competency item in a framework, the hierarchy levels must follow: Domain (no parent or parent is null) → Competency (parent is Domain) → Indicator (parent is Competency). An Indicator cannot be a parent of another item. A Domain cannot have a Domain parent.

**Validates: Requirements 105.1**

### Property 87: Competency CSV import round-trip
*For any* valid competency CSV with Domain/Competency/Indicator rows, importing the CSV and then querying the resulting competency_items should produce a hierarchy that matches the original CSV structure: same codes, titles, and parent-child relationships.

**Validates: Requirements 105.4**

### Property 88: Unmapped competency indicator flagging
*For any* competency indicator with zero entries in competency_outcome_mappings, the indicator should be flagged as "Unmapped" in the alignment matrix. Indicators with at least one mapping should not be flagged.

**Validates: Requirements 105.6**

### Property 89: Sankey data transformation correctness
*For any* set of ILO → PLO → CLO outcome mappings with weights, the Sankey data transformation should produce: (a) one node per outcome with the correct attainment-based color (green/blue/yellow/red/gray), and (b) one link per mapping with width proportional to the mapping weight. The total number of links should equal the total number of outcome_mappings records in scope.

**Validates: Requirements 106.1, 106.4**

### Property 90: Gap status classification correctness
*For any* outcome (ILO, PLO, or CLO), the gap status should be classified as: "Fully Mapped" when all expected child mappings exist and evidence is present; "Partially Mapped" when some but not all child mappings exist; "Unmapped" when zero child mappings exist; "No Evidence" when mappings exist but zero evidence records exist in the current semester. Additionally, any PLO with fewer than 2 mapped CLOs should be flagged as "Under-Mapped", and any CLO with zero linked assessments in the current semester should be flagged as "Unassessed".

**Validates: Requirements 107.1, 107.2, 107.3**

### Property 91: Coverage heatmap data integrity
*For any* CLO × Course intersection in the heatmap matrix, the evidence count should equal the actual count of evidence records for that CLO in that course. The color assignment should follow the sequential scale: white (0) → light blue (1–5) → dark blue (6+) for evidence count mode, and the attainment-level color scale for attainment mode.

**Validates: Requirements 108.1, 108.2**

### Property 92: Semester attainment snapshot completeness
*For any* semester close operation, a snapshot record should be created for every CLO, PLO, and ILO that has evidence in that semester. The snapshot's avg_attainment should equal the average of all student attainment records for that outcome in that semester.

**Validates: Requirements 109.1**

### Property 93: Declining trend detection
*For any* pair of consecutive semester attainment snapshots for the same outcome, if the attainment drops by 10 percentage points or more, the outcome should be flagged with a "Declining Trend" warning. Drops of less than 10 percentage points should not trigger the warning.

**Validates: Requirements 109.3**

### Property 94: Cohort comparison average attainment and gap detection
*For any* cohort comparison between two or more cohorts, the average attainment per outcome per cohort should equal the mean of all student attainment records in that cohort for that outcome. When any cohort's average is 15 or more percentage points below another cohort for the same outcome, it should be flagged as "Significant Gap".

**Validates: Requirements 110.2, 110.5**

### Property 95: Cohen's d effect size calculation
*For any* two-cohort comparison where both cohorts have sample sizes of 20 or more students, Cohen's d should be calculated as `(mean1 - mean2) / pooled_std_dev`. The pooled standard deviation should use the standard formula: `sqrt(((n1-1)*s1² + (n2-1)*s2²) / (n1+n2-2))`. Cohen's d should not be calculated when either cohort has fewer than 20 students.

**Validates: Requirements 110.3**

### Property 96: Historical evidence attainment distribution
*For any* semester in the historical evidence view, the sum of Excellent + Satisfactory + Developing + Not_Yet counts should equal the total evidence count for that semester. The proportion of each level should be correctly calculated as `level_count / total_count`.

**Validates: Requirements 111.1, 111.2**

### Property 97: Extended habit type validation
*For any* habit log record, the habit_type must be one of the 8 valid types: login, submit, journal, read, collaborate, practice, review, mentor. Records with any other habit_type should be rejected.

**Validates: Requirements 112.1**

### Property 98: Extended habit completion triggers
*For any* student who posts a discussion question or answer, the Collaborate habit should be marked complete for that day. *For any* student who completes a quiz attempt, the Practice habit should be marked complete. *For any* student who submits a peer review, the Review habit should be marked complete. *For any* student whose discussion answer is marked correct by a teacher, the Mentor habit should be marked complete. Each extended habit completion should award exactly 15 XP.

**Validates: Requirements 112.2, 112.3, 112.4, 112.5, 112.6**

### Property 99: Updated Perfect Day threshold
*For any* student on a given day, a Perfect Day is achieved if and only if the count of distinct completed habit types is ≥ 6 (out of 8). The Perfect Day bonus XP (50 XP) should be awarded exactly once per qualifying day.

**Validates: Requirements 112.8**

### Property 100: Team membership constraints
*For any* team, the member count must be between 2 and 6 inclusive. *For any* student within a single course, they should be a member of at most one team. Adding a 7th member should be rejected. Adding a student who is already on another team in the same course should be rejected.

**Validates: Requirements 115.2, 115.3**

### Property 101: Auto-generated team balance
*For any* auto-generation of teams from N students with target team size S, the resulting teams should have sizes that differ by at most 1 (balanced distribution). Every enrolled student should be assigned to exactly one team.

**Validates: Requirements 115.4**

### Property 102: Team XP split correctness
*For any* XP award to a student who is a team member, the student's individual XP balance should increase by the full award amount, and the team's XP pool should increase by `floor(award_amount / 2)`. A separate xp_transactions record with `scope = 'team'` should be created for the team contribution.

**Validates: Requirements 116.1, 116.4**

### Property 103: Team leaderboard ordering and completeness
*For any* team leaderboard query within a course, all teams in that course should be present, ordered by team XP descending (weekly or all-time). Each entry should include: rank, team name, avatar letter, member count, total XP, and weekly XP.

**Validates: Requirements 117.1, 117.2**

### Property 104: Team badge idempotency
*For any* team badge trigger (Team Spirit at 500 XP, Unstoppable at 3 challenge wins, Dream Team on shared Perfect Day, Study Squad at 7-day streak) that fires multiple times for the same team, the badge should be awarded exactly once. The badge record should have `scope = 'team'`.

**Validates: Requirements 118.2, 118.5**

### Property 105: Team streak calculation
*For any* team, the team streak should increment by 1 when ALL team members log in on the same calendar day. When any team member misses a day (no login record), the team streak should reset to 0. The `streak_longest` should always be ≥ `streak_current`.

**Validates: Requirements 119.1, 119.2**

### Property 106: Team streak milestone rewards
*For any* team reaching streak milestones of 7, 14, or 30 days, the corresponding team badge should be awarded and the team XP pool should receive the correct bonus (100, 250, or 500 XP respectively). Each milestone reward should be awarded exactly once.

**Validates: Requirements 119.5**

### Property 107: Adaptive XP formula correctness
*For any* XP award, the final XP should equal `floor(base_xp × level_multiplier × difficulty_multiplier × diminishing_multiplier)` where: level_multiplier is 1.2 for levels 1–5, 1.0 for 6–10, 0.9 for 11–15, 0.8 for 16–20; difficulty_multiplier follows Bloom's taxonomy (Remembering 1.0 through Creating 1.5); and diminishing_multiplier decreases by 0.2 per repetition (min 0.2) for non-milestone actions. For assignments linked to multiple CLOs, the highest Bloom's level determines the difficulty multiplier.

**Validates: Requirements 120.1, 120.2, 121.1, 121.2**

### Property 108: XP transaction auditability
*For any* xp_transactions record created by the Adaptive XP Engine, the record should contain: base_xp, final_xp, level_multiplier, difficulty_multiplier, and diminishing_multiplier. The relationship `final_xp = floor(base_xp × level_multiplier × difficulty_multiplier × diminishing_multiplier)` should hold for every record.

**Validates: Requirements 120.3, 121.4**

### Property 109: Diminishing returns mechanics
*For any* student performing repeated actions of the same type within a rolling 24-hour window, the diminishing multiplier should be: 1.0 (1st), 0.8 (2nd), 0.6 (3rd), 0.4 (4th), 0.2 (5th+). After 24 hours from the first action in the window, the multiplier should reset to 1.0 for that action type. Milestone rewards (streak milestones, badge awards, level-up bonuses) should always receive a 1.0 diminishing multiplier regardless of repetition count.

**Validates: Requirements 122.1, 122.4, 122.5**

### Property 110: Improvement bonus correctness
*For any* student whose CLO attainment improves by 15 or more percentage points compared to their previous evidence score on the same CLO, an Improvement Bonus of exactly 50 XP should be awarded with `action_type = 'improvement_bonus'`. Improvements of less than 15 percentage points should not trigger the bonus. The xp_transactions record should reference the CLO and include previous and current scores.

**Validates: Requirements 123.1, 123.2, 123.5**

### Property 111: Comeback Kid badge threshold
*For any* student who earns 3 or more Improvement Bonuses within a single semester, the "Comeback Kid" badge should be awarded exactly once. Students with fewer than 3 Improvement Bonuses in a semester should not receive the badge.

**Validates: Requirements 123.4**

### Property 112: Challenge creation constraints
*For any* social challenge, all required fields (title, description, challenge_type, start/end date, goal_metric, goal_target, reward) must be present. For team-based challenges, the assigned team count must be between 2 and 20 inclusive. Challenges with fewer than 2 teams at the start date should be auto-cancelled.

**Validates: Requirements 113.1, 113.2, 113.6**

### Property 113: Course-wide challenge participation and reward distribution
*For any* course-wide challenge, all enrolled students in the course should be participants. The aggregate progress should equal the sum of individual contributions. When the goal is achieved, the reward should be distributed only to students who contributed at least one qualifying action. Active course-wide challenges per course should not exceed 3.

**Validates: Requirements 114.1, 114.2, 114.3, 114.5**

### Property 114: Challenge 90% notification trigger
*For any* course-wide challenge that reaches 90% of the goal target, a notification should be sent to all enrolled students. The notification should not be sent again if progress fluctuates around the 90% mark (send once per challenge).

**Validates: Requirements 114.6**

### Property 115: Team challenge reward atomicity
*For any* completed team-based challenge, the winning team(s) should be determined by highest progress toward the goal. The reward should be distributed to all members of the winning team(s) atomically — either all members receive the reward or none do.

**Validates: Requirements 113.4**

### Updated Testing Strategy (Sections U & V)

All 80 existing properties retained + 35 new properties (81–115) covering OBE Engine Enhancements and Habit Engine Enhancements = 115 total correctness properties.

### New Test Organization

Add to `src/__tests__/properties/`:
```
├── sub-clo.property.test.ts           # Properties 81, 82, 83
├── graduate-attributes.property.test.ts # Properties 84, 85
├── competency-frameworks.property.test.ts # Properties 86, 87, 88
├── sankey-diagram.property.test.ts    # Property 89
├── gap-analysis.property.test.ts      # Property 90
├── coverage-heatmap.property.test.ts  # Property 91
├── semester-trends.property.test.ts   # Properties 92, 93
├── cohort-comparison.property.test.ts # Properties 94, 95
├── historical-evidence.property.test.ts # Property 96
├── extended-habits.property.test.ts   # Properties 97, 98, 99
├── teams.property.test.ts            # Properties 100, 101
├── team-xp.property.test.ts          # Property 102
├── team-leaderboard.property.test.ts  # Property 103
├── team-badges.property.test.ts       # Property 104
├── team-streaks.property.test.ts      # Properties 105, 106
├── adaptive-xp.property.test.ts       # Properties 107, 108, 109
├── improvement-bonus.property.test.ts # Properties 110, 111
└── social-challenges.property.test.ts # Properties 112, 113, 114, 115
```

Add to `src/__tests__/unit/`:
```
├── sub-clo.test.ts
├── graduate-attributes.test.ts
├── competency-frameworks.test.ts
├── sankey-diagram.test.ts
├── gap-analysis.test.ts
├── coverage-heatmap.test.ts
├── semester-trends.test.ts
├── cohort-comparison.test.ts
├── historical-evidence.test.ts
├── extended-habits.test.ts
├── teams.test.ts
├── team-gamification.test.ts
├── team-leaderboard.test.ts
├── team-badges.test.ts
├── team-streaks.test.ts
├── adaptive-xp.test.ts
├── improvement-bonus.test.ts
└── social-challenges.test.ts
```

Add to `src/__tests__/integration/`:
```
├── sub-clo-rollup-pipeline.test.ts
├── graduate-attribute-rollup.test.ts
├── competency-import-pipeline.test.ts
├── team-xp-pipeline.test.ts
├── team-streak-pipeline.test.ts
├── adaptive-xp-pipeline.test.ts
├── improvement-bonus-pipeline.test.ts
├── challenge-completion-pipeline.test.ts
└── extended-habit-xp-pipeline.test.ts
```

### Property-Based Testing Configuration

All property tests use `fast-check` with minimum 100 iterations per property. Each test file references the design document property:

```typescript
// Example: src/__tests__/properties/adaptive-xp.property.test.ts
import * as fc from 'fast-check';

describe('Adaptive XP Engine', () => {
  // Feature: edeviser-platform, Property 107: Adaptive XP formula correctness
  it('should calculate final XP using correct formula with all multipliers', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),  // base_xp
        fc.integer({ min: 1, max: 20 }),   // level
        fc.constantFrom('remembering', 'understanding', 'applying', 'analyzing', 'evaluating', 'creating'),
        fc.integer({ min: 1, max: 10 }),   // repeat count
        fc.boolean(),                       // is milestone
        (baseXP, level, bloomsLevel, repeatCount, isMilestone) => {
          const result = calculateFinalXP(baseXP, level, [bloomsLevel], repeatCount, isMilestone);
          const expected = Math.floor(
            baseXP *
            getLevelMultiplier(level) *
            BLOOMS_MULTIPLIERS[bloomsLevel] *
            (isMilestone ? 1.0 : getDiminishingMultiplier(repeatCount))
          );
          expect(result).toBe(expected);
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### New TanStack Query Keys

Add to `/src/lib/queryKeys.ts`: `subCLOs`, `graduateAttributes`, `graduateAttributeMappings`, `graduateAttributeAttainment`, `competencyFrameworks`, `competencyItems`, `competencyOutcomeMappings`, `sankeyData`, `gapAnalysis`, `coverageHeatmap`, `semesterTrends`, `cohortComparison`, `historicalEvidence`, `teams`, `teamMembers`, `teamGamification`, `teamLeaderboard`, `teamBadges`, `challenges`, `challengeProgress`, `studentChallenges`, `xpMultiplier`, `diminishingReturns`, `improvementBonusHistory`.

---

## SECTION W: Engagement Safeguards & Anti-Burnout (Requirements 124–135)

### Overview

This section addresses research-backed gaps in the gamification engine: streak burnout prevention (multi-layered recovery system), BJ Fogg-inspired graduated habit difficulty levels, leaderboard improvements for lower performers (Personal Best, Most Improved, Percentile Bands, League Tiers), and badge fatigue mitigation (tiered badges, spotlight rotation, archive management). These features target Student engagement sustainability and Admin configurability.

### Architecture

#### Updated High-Level Component Flow

```
├── /admin/*
│   ├── /admin/settings — InstitutionSettings (+ Streak Sabbatical toggle, League Tier thresholds)
│   ├── /admin/badges — BadgeSpotlightManager
│   └── /admin/dashboard — AdminDashboard (+ Badge Spotlight config card)
├── /student/*
│   ├── /student/dashboard — StudentDashboard (+ Comeback Challenge banner, Habit Level indicator, Total Active Days)
│   ├── /student/leaderboard — LeaderboardPage (+ Personal Best tab, Most Improved tab, League tab, Percentile Bands)
│   └── /student/badges — BadgeCollection (+ tiered display, archive, pinning, spotlight card)
```

#### Updated Edge Functions

```
└── Edge Functions
    ├── process-streak (updated: Comeback Challenge logic, Streak Sabbatical check, Total Active Days increment)
    ├── award-xp (updated: Badge Spotlight 2x bonus, League Promotion bonus)
    ├── check-badges (updated: tiered badge progression, Rising Star badge, archive auto-management)
    ├── perfect-day-nudge-cron (updated: Habit Difficulty Level-relative threshold)
    ├── badge-spotlight-rotate-cron (pg_cron → midnight UTC Monday — auto-rotate spotlight)
    └── badge-archive-cron (pg_cron → daily — archive badges not upgraded in 90 days)
```

### Components and Interfaces

#### Comeback Challenge Banner (`/src/components/shared/ComebackChallengeBanner.tsx`)
```typescript
interface ComebackChallengeState {
  is_active: boolean;
  start_date: string;
  days_completed: number; // 0, 1, 2, or 3
  streak_to_restore: number; // 50% of lost streak, rounded down
  lost_streak_value: number;
}

interface ComebackChallengeBannerProps {
  studentId: string;
  challengeState: ComebackChallengeState;
}

// Displayed on Student Dashboard when challenge is active
// Progress indicator: 3 circles (day 1, 2, 3) with filled/empty state
// Shows "Complete today's habits to continue your Comeback Challenge"
// Shows streak value to be restored on completion
// Dismiss option cancels the challenge
```

#### Updated StreakDisplay (`/src/components/shared/StreakDisplay.tsx` — updated)
```typescript
interface StreakDisplayProps {
  currentStreak: number;
  restDays: number; // weekend rest days within current streak period
  totalActiveDays: number;
  streakSabbaticalEnabled: boolean;
  comebackChallengeActive: boolean;
}

// Range format: "15-day streak, 2 rest days" when sabbatical enabled
// Total Active Days counter with milestone celebrations (30, 60, 100, 200, 365)
// Motivational message on streak reset: "Your X total active days are still an achievement"
```

#### Habit Difficulty Level Indicator (`/src/components/shared/HabitDifficultyIndicator.tsx`)
```typescript
type HabitDifficultyLevel = 1 | 2 | 3;

interface HabitDifficultyIndicatorProps {
  currentLevel: HabitDifficultyLevel;
  habitLevelStreak: number; // consecutive days at current level
  daysToNextLevel: number; // 7 - habitLevelStreak
}

// Displays: "Level 2 — 5/7 days to Level 3"
// Progress bar showing days toward next level
// Level icons: Level 1 (Seedling), Level 2 (Sprout), Level 3 (Tree)
// Celebration animation on level promotion
```

#### Updated Leaderboard Page (`/src/pages/student/leaderboard/LeaderboardPage.tsx` — updated)
```typescript
type LeaderboardMode = 'top_xp' | 'personal_best' | 'most_improved' | 'league';

interface PersonalBestEntry {
  week_label: string; // "Week of Jan 6"
  xp_earned: number;
  is_current_week: boolean;
  is_personal_best: boolean;
}

interface MostImprovedEntry {
  rank: number;
  student_id: string;
  student_name: string;
  avatar_url: string | null;
  improvement_percent: number;
  xp_delta: number;
  is_anonymous: boolean;
}

type LeagueTier = 'bronze' | 'silver' | 'gold' | 'diamond';

interface LeagueTierConfig {
  tier: LeagueTier;
  min_xp: number;
  max_xp: number | null; // null for diamond (no upper bound)
  color: string;
  icon: string;
}

interface LeagueLeaderboardEntry {
  rank: number;
  student_id: string;
  student_name: string;
  avatar_url: string | null;
  league_tier: LeagueTier;
  weekly_xp: number;
  cumulative_xp: number;
  is_current_user: boolean;
  is_anonymous: boolean;
}

type PercentileBand = 'top_10' | 'top_25' | 'top_50' | 'bottom_50';

interface LeaderboardEntry {
  rank: number;
  percentile_band: PercentileBand | null; // null for top 10 (show exact rank)
  // ... existing fields
}

// Tab navigation: Top XP | Personal Best | Most Improved | League
// Personal Best: bar chart of last 8 weeks, "New Personal Best" confetti
// Most Improved: top 20 by improvement %, "Rising Star" badge eligibility
// League: within-tier ranking by weekly XP, tier badge display
// Percentile bands for ranks > 10 in Top XP mode
// Default to Personal Best for leaderboard opt-out students
```

#### League Tier Badge (`/src/components/shared/LeagueTierBadge.tsx`)
```typescript
interface LeagueTierBadgeProps {
  tier: LeagueTier;
  size: 'sm' | 'md' | 'lg';
}

// Bronze: amber-600 border, bronze shield icon
// Silver: gray-400 border, silver shield icon
// Gold: yellow-400 border, gold shield icon
// Diamond: blue-400 border, diamond icon
// Displayed on Student Dashboard, Leaderboard, and profile
```

#### League Promotion Celebration (`/src/components/shared/LeaguePromotionCelebration.tsx`)
```typescript
interface LeaguePromotionCelebrationProps {
  previousTier: LeagueTier;
  newTier: LeagueTier;
  bonusXP: number; // 100 XP
}

// Full-screen overlay with tier transition animation
// Shows old tier → new tier with arrow
// Confetti + "+100 XP" bonus display
// Uses Framer Motion + canvas-confetti
```

#### Updated BadgeCollection (`/src/components/shared/BadgeCollection.tsx` — updated)
```typescript
type BadgeTier = 'bronze' | 'silver' | 'gold';

interface TieredBadge {
  category: string;
  category_label: string;
  current_tier: BadgeTier | null; // null if not yet earned
  bronze_threshold: string;
  silver_threshold: string;
  gold_threshold: string;
  progress_toward_next: number; // 0.0–1.0
  earned_at: string | null;
  is_pinned: boolean;
  archived_at: string | null;
}

interface BadgeCollectionProps {
  studentId: string;
  maxActive: number; // default 12
}

// Active section: max 12 badges, most recently earned/upgraded first
// Pinned badges (up to 3) always in Active section
// Archived section: "View All Badges" expandable
// Tier display: color-coded border (Bronze: amber-600, Silver: gray-400, Gold: yellow-400)
// Progress bar toward next tier within each badge card
```

#### Badge Spotlight Card (`/src/components/shared/BadgeSpotlightCard.tsx`)
```typescript
interface BadgeSpotlightCardProps {
  category: string;
  category_label: string;
  tier_thresholds: { bronze: string; silver: string; gold: string };
  student_progress: number; // 0.0–1.0
  student_current_tier: BadgeTier | null;
  bonus_multiplier: number; // 2.0
  expires_at: string; // next Monday midnight UTC
}

// Displayed on Student Dashboard
// Shows featured badge category with sparkle icon
// Progress toward next tier
// "2x XP Bonus this week" label
// Countdown to spotlight expiry
```

#### Badge Spotlight Manager (`/src/pages/admin/badges/BadgeSpotlightManager.tsx`)
```typescript
interface BadgeSpotlightSchedule {
  week_start: string; // ISO date (Monday)
  category: string;
  is_manual: boolean; // true if admin-selected, false if auto-rotated
}

interface BadgeSpotlightManagerProps {
  institutionId: string;
}

// Calendar view showing upcoming spotlight schedule
// Drag-and-drop to reorder spotlight weeks
// Auto-rotate fills unassigned weeks alphabetically
// Preview of each badge category with tier thresholds
```

### New Database Schema Changes

#### Column Additions for Streak Recovery

```sql
-- Comeback Challenge state (Requirement 124)
ALTER TABLE student_gamification ADD COLUMN comeback_challenge_active boolean NOT NULL DEFAULT false;
ALTER TABLE student_gamification ADD COLUMN comeback_challenge_start_date timestamptz;
ALTER TABLE student_gamification ADD COLUMN comeback_challenge_days_completed integer NOT NULL DEFAULT 0
  CHECK (comeback_challenge_days_completed >= 0 AND comeback_challenge_days_completed <= 3);
ALTER TABLE student_gamification ADD COLUMN comeback_challenge_streak_to_restore integer NOT NULL DEFAULT 0;

-- Total Active Days (Requirement 126)
ALTER TABLE student_gamification ADD COLUMN total_active_days integer NOT NULL DEFAULT 0
  CHECK (total_active_days >= 0);

-- Streak Sabbatical (Requirement 125)
-- Stored in institution_settings jsonb: { ..., "streak_sabbatical_enabled": false }
```

#### Column Additions for Habit Difficulty Levels

```sql
-- Habit Difficulty Level (Requirement 127)
ALTER TABLE student_gamification ADD COLUMN habit_difficulty_level integer NOT NULL DEFAULT 1
  CHECK (habit_difficulty_level IN (1, 2, 3));
ALTER TABLE student_gamification ADD COLUMN habit_level_streak integer NOT NULL DEFAULT 0
  CHECK (habit_level_streak >= 0);
```

#### Column Additions for Leaderboard Enhancements

```sql
-- League Tier thresholds (Requirement 132)
-- Stored in institution_settings jsonb: { ..., "league_thresholds": { "bronze": 0, "silver": 500, "gold": 1500, "diamond": 4000 } }

-- No new tables needed — league tier is derived from cumulative XP at query time
```

#### Column Additions for Badge Tiers

```sql
-- Badge tier system (Requirement 133)
ALTER TABLE badges ADD COLUMN tier text DEFAULT NULL
  CHECK (tier IS NULL OR tier IN ('bronze', 'silver', 'gold'));
ALTER TABLE badges ADD COLUMN category text;

-- Student badge pinning and archiving (Requirement 135)
ALTER TABLE student_badges ADD COLUMN is_pinned boolean NOT NULL DEFAULT false;
ALTER TABLE student_badges ADD COLUMN archived_at timestamptz;

-- Badge Spotlight schedule (Requirement 134)
CREATE TABLE badge_spotlight_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid REFERENCES institutions(id) NOT NULL,
  week_start date NOT NULL, -- always a Monday
  category text NOT NULL,
  is_manual boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (institution_id, week_start)
);
ALTER TABLE badge_spotlight_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin manages badge spotlight" ON badge_spotlight_schedule
  FOR ALL USING (institution_id = auth_institution_id() AND auth_user_role() = 'admin');
CREATE POLICY "All roles read badge spotlight" ON badge_spotlight_schedule
  FOR SELECT USING (institution_id = auth_institution_id());
```

### New TanStack Query Hooks

```typescript
// Streak Recovery
useComebackChallenge(studentId: string)
useStartComebackChallenge()
useCancelComebackChallenge()

// Habit Difficulty
useHabitDifficultyLevel(studentId: string)

// Leaderboard Modes
usePersonalBestLeaderboard(studentId: string)
useMostImprovedLeaderboard(courseId: string)
useLeagueLeaderboard(courseId: string, tier: LeagueTier)
useStudentLeagueTier(studentId: string)
useStudentPercentileBand(studentId: string, courseId: string)

// Badge Tiers
useTieredBadges(studentId: string)
usePinBadge()
useUnpinBadge()
useBadgeSpotlight(institutionId: string)
useBadgeSpotlightSchedule(institutionId: string)
useUpdateBadgeSpotlightSchedule()
```

### New Zod Schemas

```
comebackChallenge.ts     — comebackChallengeSchema, comebackChallengeStateSchema
habitDifficulty.ts       — habitDifficultyLevelSchema
leagueLeaderboard.ts     — leagueTierSchema, leagueTierConfigSchema, personalBestSchema, mostImprovedSchema, percentileBandSchema
badgeTier.ts             — badgeTierSchema, tieredBadgeSchema, badgePinSchema
badgeSpotlight.ts        — badgeSpotlightScheduleSchema
```

### Updated Edge Function Logic

#### process-streak (updated for Streak Recovery)
```typescript
// On daily login:
// 1. Check if Streak Sabbatical is enabled and today is Saturday/Sunday → skip streak check
// 2. Increment total_active_days if student completed at least 1 habit today
// 3. If streak was broken:
//    a. Store lost streak value
//    b. Offer Comeback Challenge (set comeback_challenge_active = true, streak_to_restore = floor(lost_streak / 2))
// 4. If Comeback Challenge is active:
//    a. Check if student completed all habits at their Habit Difficulty Level today
//    b. If yes: increment comeback_challenge_days_completed
//    c. If days_completed = 3: restore streak, deactivate challenge, check Comeback Kid badge
//    d. If no: cancel challenge, reset to 0

function checkStreakSabbatical(institutionSettings: InstitutionSettings, date: Date): boolean {
  if (!institutionSettings.streak_sabbatical_enabled) return false;
  const day = date.getUTCDay();
  return day === 0 || day === 6; // Sunday or Saturday
}

function calculateStreakToRestore(lostStreak: number): number {
  return Math.floor(lostStreak / 2);
}
```

#### perfect-day-nudge-cron (updated for Habit Difficulty Levels)
```typescript
function getPerfectDayThreshold(habitDifficultyLevel: HabitDifficultyLevel): number {
  switch (habitDifficultyLevel) {
    case 1: return 1; // login only
    case 2: return 2; // login + one other
    case 3: return 6; // 6 of 8 habits
  }
}

function getNudgeThreshold(habitDifficultyLevel: HabitDifficultyLevel): number {
  // Nudge when student is 1 habit away from Perfect Day
  return getPerfectDayThreshold(habitDifficultyLevel) - 1;
}
```

#### check-badges (updated for Badge Tiers)
```typescript
// Badge tier progression logic:
// 1. For each badge category, check if student meets next tier threshold
// 2. If student has no badge in category and meets bronze threshold → award bronze
// 3. If student has bronze and meets silver threshold → upgrade to silver
// 4. If student has silver and meets gold threshold → upgrade to gold
// 5. Only store highest tier per category per student

function checkBadgeTierProgression(
  studentId: string,
  category: string,
  currentTier: BadgeTier | null,
  metrics: Record<string, number>
): { shouldUpgrade: boolean; newTier: BadgeTier } | null {
  const thresholds = BADGE_TIER_THRESHOLDS[category];
  if (!thresholds) return null;

  if (currentTier === 'gold') return null; // already max
  if (currentTier === 'silver' && meetsThreshold(metrics, thresholds.gold)) {
    return { shouldUpgrade: true, newTier: 'gold' };
  }
  if (currentTier === 'bronze' && meetsThreshold(metrics, thresholds.silver)) {
    return { shouldUpgrade: true, newTier: 'silver' };
  }
  if (currentTier === null && meetsThreshold(metrics, thresholds.bronze)) {
    return { shouldUpgrade: true, newTier: 'bronze' };
  }
  return null;
}
```

### Leaderboard Query Logic

```typescript
// Personal Best: query xp_transactions grouped by week for the student
// Most Improved: compare 4-week rolling windows
// League: filter by XP range thresholds, rank by weekly XP
// Percentile Band: calculate rank / total_students * 100

function calculatePercentileBand(rank: number, totalStudents: number): PercentileBand | null {
  if (rank <= 10) return null; // show exact rank
  const percentile = (rank / totalStudents) * 100;
  if (percentile <= 10) return 'top_10';
  if (percentile <= 25) return 'top_25';
  if (percentile <= 50) return 'top_50';
  return 'bottom_50';
}

function getLeagueTier(cumulativeXP: number, thresholds: LeagueTierConfig[]): LeagueTier {
  // thresholds sorted by min_xp descending
  for (const t of thresholds.sort((a, b) => b.min_xp - a.min_xp)) {
    if (cumulativeXP >= t.min_xp) return t.tier;
  }
  return 'bronze';
}

function calculateMostImproved(
  current4WeekXP: number,
  previous4WeekXP: number
): number | null {
  if (previous4WeekXP === 0) return null; // exclude from ranking
  return ((current4WeekXP - previous4WeekXP) / previous4WeekXP) * 100;
}
```

### Error Handling (Section W)

| Scenario | Handling |
|----------|----------|
| Comeback Challenge already active | "You already have an active Comeback Challenge" — block duplicate |
| Comeback Challenge day missed | Cancel challenge; show "Comeback Challenge ended — keep going, you'll get it next time" |
| Streak Sabbatical toggle during active streak | Apply from next calendar day; do not retroactively modify current streak |
| Habit level promotion at max level | No-op; Level 3 students remain at Level 3 |
| Habit level streak reset | Reset `habit_level_streak` to 0; do not demote level |
| Personal Best no history | Show "Complete your first week to see your Personal Best" empty state |
| Most Improved division by zero | Exclude student from ranking; show "Not enough history" |
| League Tier threshold change | Recalculate all student tiers on next leaderboard query; no retroactive XP adjustments |
| League Promotion during impersonation | Block; read-only mode |
| Badge tier upgrade during spotlight | Apply 2x XP bonus to the badge award XP |
| Badge pin limit exceeded (>3) | "You can pin a maximum of 3 badges. Unpin one first." |
| Badge Spotlight no manual selection | Auto-rotate alphabetically; show "Auto-selected" label |
| Badge archive with pinned badge | Pinned badges are never auto-archived |

### Correctness Properties (101–115)

### Property 101: Comeback Challenge streak restoration accuracy
*For any* student who completes a 3-day Comeback Challenge, the restored streak should equal `floor(lost_streak_value / 2)`. The restored streak should never exceed the original lost streak value. A student who fails any day should have their streak remain at 0.

**Validates: Requirements 124.2, 124.3, 124.4**

### Property 102: Streak Sabbatical weekend exclusion
*For any* institution with `streak_sabbatical_enabled = true`, a student's streak should not be reset for missing Saturday or Sunday logins. The streak should only be evaluated on weekdays (Monday–Friday). When sabbatical is disabled, all 7 days count toward streak requirements.

**Validates: Requirements 125.1, 125.2**

### Property 103: Total Active Days monotonic increment
*For any* student, `total_active_days` should be monotonically non-decreasing. It should increment by exactly 1 on each day the student completes at least one habit, and should never decrease.

**Validates: Requirements 126.2, 126.3**

### Property 104: Habit Difficulty Level promotion correctness
*For any* student at Habit Difficulty Level L (where L < 3), completing all required habits for 7 consecutive days should promote the student to Level L+1. Missing a day should reset `habit_level_streak` to 0 but should not change `habit_difficulty_level`.

**Validates: Requirements 127.3, 127.5**

### Property 105: Relative Perfect Day threshold
*For any* student at Habit Difficulty Level 1, Perfect Day requires 1 habit. At Level 2, Perfect Day requires 2 habits. At Level 3, Perfect Day requires 6 of 8 habits. The Perfect Day XP award (50 XP) should be the same regardless of level.

**Validates: Requirements 128.1, 128.2, 128.3, 128.5**

### Property 106: Personal Best leaderboard data integrity
*For any* student's Personal Best view, the weekly XP values should equal the sum of `xp_transactions.xp_amount` for that student within each ISO week. The "is_personal_best" flag should be true for exactly one week (the week with the highest XP).

**Validates: Requirements 129.1, 129.2**

### Property 107: Most Improved calculation correctness
*For any* student with non-zero XP in the previous 4-week period, the improvement percentage should equal `(current_4_week_xp - previous_4_week_xp) / previous_4_week_xp * 100`. Students with zero previous XP should be excluded from the ranking.

**Validates: Requirements 130.2, 130.3**

### Property 108: Percentile band assignment correctness
*For any* leaderboard with N students, a student at rank R should be assigned: exact rank if R ≤ 10, "Top 10%" if R/N ≤ 0.10, "Top 25%" if R/N ≤ 0.25, "Top 50%" if R/N ≤ 0.50, "Bottom 50%" otherwise. The band assignment should be mutually exclusive.

**Validates: Requirements 131.1, 131.2, 131.3**

### Property 109: League Tier assignment correctness
*For any* student with cumulative XP, the League Tier should be determined by the configured thresholds: Bronze (0–499), Silver (500–1499), Gold (1500–3999), Diamond (4000+). The tier should update immediately when XP crosses a threshold boundary.

**Validates: Requirements 132.1, 132.5**

### Property 110: League Promotion XP bonus idempotence
*For any* League Tier promotion event, exactly 100 XP should be awarded. The promotion bonus should be awarded exactly once per tier transition — re-querying the leaderboard should not trigger duplicate bonuses.

**Validates: Requirements 132.4**

### Property 111: Badge tier progression monotonicity
*For any* badge category, a student's tier should only progress upward: null → bronze → silver → gold. A student should never be downgraded to a lower tier. Only the highest earned tier should be stored per category per student.

**Validates: Requirements 133.3, 133.5**

### Property 112: Badge Spotlight XP bonus application
*For any* badge earned or upgraded during the spotlight week for the spotlighted category, the XP award should be exactly 2x the standard badge XP. Badges in non-spotlighted categories should receive standard XP (1x).

**Validates: Requirements 134.1, 134.5**

### Property 113: Badge archive threshold
*For any* badge not upgraded in the last 90 days and not pinned, the badge should be moved to the archived section. Pinned badges should never be auto-archived regardless of age.

**Validates: Requirements 135.3, 135.4**

### Property 114: Badge pin limit enforcement
*For any* student, the number of pinned badges should never exceed 3. Attempting to pin a 4th badge should be rejected.

**Validates: Requirements 135.4**

### Property 115: Active badge collection size limit
*For any* student with more than 12 badges, the Active section should display at most 12 badges (including pinned badges). Remaining badges should appear in the Archived section.

**Validates: Requirements 135.1, 135.2**

### Updated Test Organization

Add to `src/__tests__/properties/`:
```
├── comeback-challenge.property.test.ts    # Property 101
├── streak-sabbatical.property.test.ts     # Property 102
├── total-active-days.property.test.ts     # Property 103
├── habit-difficulty.property.test.ts      # Properties 104, 105
├── personal-best.property.test.ts         # Property 106
├── most-improved.property.test.ts         # Property 107
├── percentile-band.property.test.ts       # Property 108
├── league-tier.property.test.ts           # Properties 109, 110
├── badge-tier.property.test.ts            # Property 111
├── badge-spotlight.property.test.ts       # Property 112
└── badge-archive.property.test.ts         # Properties 113, 114, 115
```

Add to `src/__tests__/unit/`:
```
├── comebackChallenge.test.ts
├── streakSabbatical.test.ts
├── habitDifficulty.test.ts
├── personalBestLeaderboard.test.ts
├── mostImprovedLeaderboard.test.ts
├── percentileBand.test.ts
├── leagueTier.test.ts
├── badgeTier.test.ts
├── badgeSpotlight.test.ts
└── badgeArchive.test.ts
```

### New TanStack Query Keys

Add to `/src/lib/queryKeys.ts`: `comebackChallenge`, `habitDifficultyLevel`, `personalBest`, `mostImproved`, `leagueLeaderboard`, `leagueTier`, `percentileBand`, `tieredBadges`, `badgeSpotlight`, `badgeSpotlightSchedule`.

### Updated Testing Strategy

All previous 100 correctness properties retained + 15 engagement safeguard properties (Comeback Challenge restoration, Streak Sabbatical exclusion, Total Active Days monotonicity, Habit Difficulty promotion, Relative Perfect Day, Personal Best integrity, Most Improved calculation, Percentile Band assignment, League Tier assignment, League Promotion idempotence, Badge tier monotonicity, Badge Spotlight bonus, Badge archive threshold, Badge pin limit, Active badge size limit) = 115 total correctness properties.
