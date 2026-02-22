# Design Document — Edeviser Platform (Full Production)

## Overview

This design covers the complete production-ready Edeviser platform across all feature areas: authentication, RBAC, user management, program/course management, the full OBE engine (ILO/PLO/CLO, rubrics, assignments, submissions, grading, evidence, rollup), the gamification engine (XP, streaks, badges, levels, leaderboards, journals), four role-specific dashboards, notifications (including peer milestone notifications and Perfect Day nudges), realtime, reporting, audit logging, student CLO progress tracking, XP transaction history, the AI Co-Pilot subsystem (personalized module suggestions, at-risk early warnings, and feedback draft generation), and platform enhancements (student learning portfolio, streak freeze, role-specific onboarding, achievable read habit, dark mode, offline resilience & draft saving, GDPR data export, notification batching & rate limiting, error state components, and teacher grading stats).

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
│   │   ├── /admin/outcomes — ILOListPage, ILOForm
│   │   ├── /admin/reports — ReportGenerator
│   │   ├── /admin/bonus-events — BonusXPEventManager
│   │   └── /admin/audit — AuditLogViewer
│   ├── /coordinator/* — CoordinatorLayout
│   │   ├── /coordinator/dashboard — CoordinatorDashboard
│   │   ├── /coordinator/programs — ProgramDetail
│   │   ├── /coordinator/courses — CourseListPage
│   │   ├── /coordinator/outcomes — PLOListPage, PLOForm, CurriculumMatrix
│   │   └── /coordinator/mapping — OutcomeMappingEditor
│   ├── /teacher/* — TeacherLayout
│   │   ├── /teacher/dashboard — TeacherDashboard
│   │   ├── /teacher/courses — CourseDetail
│   │   ├── /teacher/outcomes — CLOListPage, CLOForm, BloomsVerbGuide
│   │   ├── /teacher/rubrics — RubricBuilder
│   │   ├── /teacher/assignments — AssignmentListPage, AssignmentForm (with prerequisite gates)
│   │   ├── /teacher/grading — GradingQueue, GradingInterface
│   │   └── /teacher/students — StudentHeatmap
│   └── /student/* — StudentLayout
│       ├── /student/dashboard — StudentDashboard (CLOProgress, AISuggestionWidget)
│       ├── /student/courses — CourseList
│       ├── /student/assignments — AssignmentDetail, SubmissionForm
│       ├── /student/progress — ProgressView, LearningPath (Bloom's-gated nodes), CLOProgressView
│       ├── /student/xp-history — XPTransactionHistory
│       ├── /student/journal — JournalEditor (contextual prompts)
│       ├── /student/leaderboard — LeaderboardView
│       └── /student/portfolio — StudentPortfolio (CLO mastery, badges, XP timeline, public link)
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
        └── notification-digest (pg_cron → 8 PM daily for digest subscribers)
```

## Components and Interfaces

### Core Providers

#### AuthProvider (`/src/providers/AuthProvider.tsx`)
```typescript
interface AuthContextValue {
  user: User | null;
  profile: Profile | null;
  role: 'admin' | 'coordinator' | 'teacher' | 'student' | null;
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
  source: 'login' | 'submission' | 'badge' | 'admin_adjustment' | 'perfect_day' | 'first_attempt_bonus' | 'perfect_rubric' | 'bonus_event';
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
  template: 'streak_risk' | 'weekly_summary' | 'new_assignment' | 'grade_released' | 'bulk_import_invitation';
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
  event_type: 'login' | 'page_view' | 'submission' | 'journal' | 'streak_break' | 'assignment_view';
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

Note: The `xp_transactions.source` CHECK constraint should be updated to include `'streak_freeze_purchase'` as a valid source value. The `student_activity_log.event_type` CHECK constraint should be updated to include `'grading_start'` and `'grading_end'` event types for teacher grading time tracking.

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

Hierarchical keys for all entities: users, programs, courses, enrollments, ilos, plos, clos, rubrics, assignments, submissions, grades, evidence, attainment, gamification, badges, xpTransactions, journal, leaderboard, notifications, auditLogs, habitLogs, bonusXPEvents, activityLog, cloProgress, aiModuleSuggestions, aiAtRiskPredictions, aiFeedbackDrafts, aiFeedback, aiPerformanceSummary, portfolio, streakFreezes, onboardingStatus, gradingStats, exportData.

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

## Testing Strategy

### Expanded Property-Based Tests (50 properties total)
All 18 MVP properties retained + 10 OBE/gamification properties + 7 habit/reward/path/activity/journal properties + 5 AI Co-Pilot properties + 10 platform enhancement properties (streak freeze, notification batching, offline queue, draft saving, data export, dark mode, read habit timer, grading time).

### Integration Tests
- End-to-end grading → evidence → rollup pipeline
- XP award → level check → badge check pipeline
- Submission → XP → streak → leaderboard update pipeline
- Realtime subscription delivery tests
- AI suggestion → feedback collection pipeline
- Level-up → peer milestone notification pipeline

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
│   └── grading-stats.property.test.ts # Property 50
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
│   └── grading-stats.test.ts
└── integration/
    ├── grading-pipeline.test.ts
    ├── gamification-pipeline.test.ts
    ├── habit-perfect-day.test.ts
    ├── prerequisite-gating.test.ts
    ├── peer-milestone-pipeline.test.ts
    ├── ai-suggestion-feedback.test.ts
    ├── realtime.test.ts
    ├── streak-freeze-consumption.test.ts
    └── offline-queue-flush.test.ts
```
