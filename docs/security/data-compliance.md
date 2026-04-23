# Data Compliance: FERPA & GDPR

This document classifies all platform data by sensitivity level, audits logging/monitoring for PII exposure, and documents deletion and data export workflows.

## 1. Data Classification

### Tier 1 — PII (Personally Identifiable Information)

| Table | PII Columns | Regulation |
|-------|-------------|------------|
| `profiles` | `email`, `full_name`, `avatar_url` | FERPA, GDPR |
| `parent_student_links` | `parent_id` (links to profile) | FERPA |

### Tier 2 — Education Records (FERPA-Protected)

| Table | Sensitive Columns | Notes |
|-------|-------------------|-------|
| `grades` | `score_percent`, `overall_feedback` | Linked to student via `submissions` |
| `submissions` | `file_url`, `student_id` | Student work product |
| `evidence` | `score_percent`, `attainment_level` | Immutable, append-only |
| `outcome_attainment` | `attainment_percent`, `student_id` | CLO/PLO/ILO scores |
| `journal_entries` | `body`, `student_id` | Reflective writing |
| `student_activity_log` | `event_type`, `metadata` | Behavioral data |
| `student_gamification` | `xp_total`, `streak_days` | Engagement metrics |
| `xp_transactions` | `xp_amount`, `source` | XP ledger |
| `student_badges` | `badge_id`, `awarded_at` | Achievement records |
| `habit_logs` | `habit_type`, `date` | Daily habit tracking |
| `quiz_attempts` | `score`, `answers` | Assessment data |
| `attendance_records` | `status`, `student_id` | Attendance data |
| `fee_payments` | `amount`, `status`, `student_id` | Financial records |
| `survey_responses` | `answers`, `respondent_id` | Survey data |
| `ai_feedback` | `suggestion_text`, `student_id` | AI-generated content |
| `student_profiles` | All columns | Onboarding/profiling data |

### Tier 3 — Institutional/System Data (Non-PII)

| Table | Notes |
|-------|-------|
| `institutions` | Org metadata |
| `programs`, `courses`, `semesters` | Academic structure |
| `learning_outcomes`, `outcome_mappings` | OBE curriculum |
| `rubrics`, `rubric_criteria` | Assessment instruments |
| `assignments` | Assignment definitions (no student data) |
| `audit_logs` | Admin actions (PII-scrubbed via allowlist) |
| `notifications` | Delivery metadata |
| `bonus_xp_events` | Gamification config |
| `announcements`, `course_modules`, `course_materials` | Content |
| `discussion_threads`, `discussion_replies` | Forum content |
| `class_sessions` | Schedule data |
| `departments`, `academic_calendar_events` | Org structure |
| `timetable_slots` | Scheduling |
| `cqi_action_plans` | Quality improvement |
| `institution_settings`, `program_accreditations` | Config |
| `fee_structures` | Fee definitions (no student data) |

## 2. PII Audit: Sentry Error Monitoring

### Controls in Place

- `sendDefaultPii: false` — Sentry never auto-collects cookies, IP addresses, or user-agent fingerprints
- `beforeSend` hook strips `user.email`, `user.username`, and `user.ip_address` from all error events
- `beforeSend` scrubs email addresses and UUIDs from exception messages via regex
- `beforeBreadcrumb` scrubs PII patterns from breadcrumb messages
- `beforeBreadcrumb` strips query parameters from navigation breadcrumbs (may contain search terms with student names)
- Session Replay configured with `maskAllText: true`, `maskAllInputs: true`, `blockAllMedia: true` — no student data visible in replays

### Verification

See `src/__tests__/unit/dataCompliance.test.ts` for automated validation of these controls.

## 3. PII Audit: Audit Logger

### Controls in Place

The audit logger (`src/lib/auditLogger.ts`) uses a field allowlist to prevent PII leakage:

- Only allowlisted fields per entity type are recorded in the `diff` column
- PII fields (`email`, `full_name`, `avatar_url`, `password`) are never in any allowlist
- Unknown entity types have all values replaced with `[redacted]`
- Allowlisted entity types: `user`, `grade`, `assignment`, `course`, `program`, `ilo`, `plo`, `clo`, `outcome_mapping`, `bonus_xp_event`, `enrollment`

### User Entity Allowlist

For the `user` entity type, only these fields are logged: `role`, `is_active`, `program_id`. Fields like `full_name`, `email`, and `avatar_url` are excluded.

## 4. PII Audit: Activity Logger

### Controls in Place

The activity logger (`src/lib/activityLogger.ts`) records behavioral events to `student_activity_log`:

- Stores `student_id`, `event_type`, and optional `metadata`
- The `metadata` field contains structural data (page IDs, assignment IDs, durations) — not PII
- No student names, emails, or free-text content is stored in metadata
- Error messages logged to `console.error` contain only Supabase error messages, not student data

### Metadata Examples

| Event Type | Metadata Fields |
|------------|----------------|
| `page_view` | `{ page: string, course_id?: string }` |
| `submission` | `{ assignment_id: string }` |
| `assignment_view` | `{ assignment_id: string, duration_seconds?: number }` |
| `journal` | `{ journal_id: string, word_count: number }` |
| `login` | `{}` (no metadata) |

## 5. Soft-Delete Workflow (User Deactivation)

### Flow

1. Admin navigates to User List → clicks deactivate on a user
2. Confirmation dialog shown: "Are you sure you want to deactivate {name}?"
3. On confirm, `profiles.is_active` is set to `false`
4. Change is logged to `audit_logs` via the audit logger

### Data Integrity Preservation

- The profile record is NOT deleted — `is_active = false` prevents login
- All historical data is preserved:
  - `grades` — linked via `submissions.student_id`, remain intact
  - `evidence` — immutable, append-only, never deleted
  - `outcome_attainment` — preserved for accreditation reporting
  - `xp_transactions` — append-only ledger, preserved
  - `journal_entries` — preserved
  - `student_badges` — preserved
  - `habit_logs` — preserved
- RLS policies continue to scope data by institution — deactivated user data is still accessible to authorized roles (admin, teacher, coordinator) for reporting
- The deactivated user cannot log in, so no new data is created

### FERPA Compliance

FERPA requires institutions to maintain education records. Soft-delete satisfies this by:
- Preventing unauthorized access (login disabled)
- Preserving records for legitimate educational purposes
- Maintaining audit trail of the deactivation action

## 6. GDPR Data Export Workflow

### Flow

1. Student navigates to Profile → clicks "Export My Data"
2. Format selector (JSON) is presented
3. The `export-student-data` Edge Function is invoked
4. Function authenticates the student (JWT) — students can only export their own data
5. All student-scoped data is gathered:
   - `profiles` (id, full_name, email, role, created_at)
   - `grades` (scores, feedback)
   - `outcome_attainment` (CLO/PLO/ILO scores)
   - `xp_transactions` (XP history)
   - `journal_entries` (titles, word counts)
   - `student_badges` (badges earned)
   - `habit_logs` (daily habits)
6. Data is packaged as JSON, uploaded to Supabase Storage (`reports/` bucket, private)
7. A signed URL (1-hour expiry) is returned for download

### GDPR Article 20 Compliance (Data Portability)

- Export is in a structured, machine-readable format (JSON)
- Student can only access their own data (enforced by JWT auth)
- Signed URL expires after 1 hour
- Export file is stored in a private bucket with RLS

## 7. GDPR Right to Erasure

Full data erasure is not implemented as a self-service feature because:
- FERPA requires retention of education records
- Institutions have legitimate interest in maintaining academic records

For GDPR erasure requests from EU users:
1. Institution admin receives the request
2. Admin deactivates the user (soft-delete)
3. For full erasure: admin contacts platform support for manual data removal
4. PII fields (`email`, `full_name`, `avatar_url`) can be anonymized while preserving non-PII education records for accreditation

## 8. RLS Enforcement

Row Level Security is enabled on ALL tables. Key patterns:

- Institution-scoped: all queries filtered by `auth_institution_id()`
- Student-scoped: students only see their own data via `auth.uid()`
- Parent-scoped: parents only see linked student data via `parent_student_links`
- Append-only tables (`evidence`, `audit_logs`, `xp_transactions`): INSERT only, no UPDATE/DELETE policies
