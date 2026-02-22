# Edeviser — Product Requirements Document (PRD)
**Version:** 2.0 | **Status:** Active | **Last Updated:** 2026-02-22
**Owners:** Product, Engineering, Design | **Reviewers:** CTO, Head of Curriculum

---

## Table of Contents
1. [Executive Summary](#1-executive-summary)
2. [Product Vision & Strategy](#2-product-vision--strategy)
3. [User Personas & Jobs-To-Be-Done](#3-user-personas--jobs-to-be-done)
4. [The Dual-Engine Architecture](#4-the-dual-engine-architecture)
5. [Functional Requirements](#5-functional-requirements)
6. [Non-Functional Requirements](#6-non-functional-requirements)
7. [User Stories & Acceptance Criteria](#7-user-stories--acceptance-criteria)
8. [Feature Prioritization & Roadmap](#8-feature-prioritization--roadmap)
9. [API Contract Overview](#9-api-contract-overview)
10. [Success Metrics & KPIs](#10-success-metrics--kpis)
11. [Risk Register](#11-risk-register)
12. [Open Questions & Decisions](#12-open-questions--decisions)

---

## 1. Executive Summary

### Problem Statement
Higher education institutions face a critical operational gap: accreditation bodies demand rigorous evidence of Outcome-Based Education (OBE) compliance, yet the very systems used to generate this compliance create disengaged students. Faculty are burdened with administrative data entry, coordinators cannot visualize curriculum gaps in real time, and students experience a fundamentally broken feedback loop — they submit work but rarely understand *why* or feel rewarded for it.

### The Edeviser Solution
Edeviser is a **Human-Centric OBE Platform** that resolves this paradox through a **Dual-Engine Architecture**:

- **Engine 1 — The OBE Core:** Ensures institutional accreditation compliance through structured ILO → PLO → CLO mapping, Bloom's Taxonomy alignment, rubric-based evidence generation, and automated reporting.
- **Engine 2 — The Habit Core:** Transforms compliance-driven activities into motivating student experiences through gamification (XP, streaks, badges, leaderboards), self-regulated learning dashboards, and an Agentic AI Co-Pilot.

**Key Differentiator:** Where competitors treat compliance and engagement as separate products, Edeviser fuses them into a single feedback loop — *compliance generates gamified triggers; student engagement generates accreditation evidence.*

### Target Market
- Primary: Private and semi-government universities in South/Southeast Asia seeking ABET, AACSB, or HEC accreditation.
- Secondary: Corporate L&D teams adopting competency-based learning frameworks.

---

## 2. Product Vision & Strategy

### Vision Statement
> "To make every learning interaction count — for the student who needs to grow, and the institution that needs to prove it."

### Strategic Pillars
| Pillar | Description | Metric |
|--------|-------------|--------|
| **Compliance Automation** | Eliminate manual OBE data entry entirely | 90% reduction in coordinator admin hours |
| **Learner Engagement** | Apply behavioral science to keep students active daily | >60% DAU/MAU ratio for students |
| **Evidence Intelligence** | Auto-generate accreditation-ready reports | <30 min to produce a full PLO attainment report |
| **AI-Driven Personalization** | Surface the right content to the right learner at the right time | >70% relevance rating on AI suggestions |

### MVP Scope (Phase 1)
Phase 1 delivers the core OBE Engine and Gamification foundation. Agentic AI and advanced analytics are Phase 2.

---

## 3. User Personas & Jobs-To-Be-Done

### 3.1 The Administrator
| Attribute | Detail |
|-----------|--------|
| **Role** | System owner, compliance officer, IT manager |
| **Core JTBD** | *"When I receive an accreditation visit notice, I want to generate comprehensive, auditable outcome attainment reports instantly, so I can demonstrate compliance without a two-week manual data compilation sprint."* |
| **Key Behaviors** | Monthly report generation, user provisioning, system health monitoring |
| **Technical Comfort** | Medium — comfortable with dashboards, not code |
| **Critical Pain Points** | Data siloed across spreadsheets; no single source of truth; last-minute accreditation preparation |
| **Success Looks Like** | One-click PDF export of institution-wide PLO attainment with evidence citations |

### 3.2 The Coordinator (Program Manager)
| Attribute | Detail |
|-----------|--------|
| **Role** | Curriculum architect, program oversight |
| **Core JTBD** | *"When I am designing or reviewing a program, I want to see a live visual matrix of which courses cover which PLOs, so I can identify curriculum gaps before they become accreditation findings."* |
| **Key Behaviors** | Semester-start curriculum review, mid-semester compliance checks, faculty oversight |
| **Technical Comfort** | Medium-high — heavy spreadsheet user, wants visual tools |
| **Critical Pain Points** | No real-time visibility; teachers don't enter CLO data on time; mapping errors discovered only at audit |
| **Success Looks Like** | A live, color-coded PLO × Course matrix with drill-down to individual CLO evidence |

### 3.3 The Teacher (Faculty)
| Attribute | Detail |
|-----------|--------|
| **Role** | Instructor, content creator, assessor |
| **Core JTBD** | *"When I grade an assignment, I want the system to automatically link my grade to the right CLO and PLO, so I do not have to fill out a separate OBE reporting form after every submission."* |
| **Key Behaviors** | Weekly grading sessions, CLO-linked assignment creation, student progress monitoring |
| **Technical Comfort** | Low-medium — resistant to new tools; needs frictionless UX |
| **Critical Pain Points** | Dual data entry (grade in LMS + report in OBE system); rubric creation complexity; no real-time student insight |
| **Success Looks Like** | Grade once → evidence auto-generated; 5-minute assignment setup with rubric templates |

### 3.4 The Student
| Attribute | Detail |
|-----------|--------|
| **Role** | Learner, primary end-user |
| **Core JTBD** | *"When I complete learning tasks, I want to feel immediate progress and understand how my work connects to my skills, so I stay motivated to continue even when the content is challenging."* |
| **Key Behaviors** | Daily logins, assignment submissions, reflection journaling, leaderboard checking |
| **Technical Comfort** | High — mobile-first digital natives |
| **Critical Pain Points** | No feedback loop; grades arrive late; cannot see their own growth; feels like a number, not a learner |
| **Success Looks Like** | Real-time XP animation on submission; visible skill progression; streak maintained for 30+ days |

### 3.5 The Department Head *(Phase 2 Persona)*
| Attribute | Detail |
|-----------|--------|
| **Role** | Academic leader overseeing multiple programs |
| **Core JTBD** | *"I want cross-program analytics so I can make data-driven decisions about curriculum investment."* |

---

## 4. The Dual-Engine Architecture

### The 10 Foundational Pillars

#### Engine 1: OBE Core (Structure & Compliance)
| Pillar | Science Basis | Product Manifestation |
|--------|--------------|----------------------|
| **1. Outcome-Based Education** | Spady (1994) — results-driven curriculum | ILO → PLO → CLO mapping; automated evidence rollup |
| **2. Rubrics** | Andrade (2000) — performance criteria reduce grader bias | Per-CLO rubric builder with pre-defined level descriptors |
| **3. Bloom's Taxonomy** | Bloom (1956), Anderson & Krathwohl (2001) | Dropdown tag on each CLO (Remembering → Creating); visual Bloom's distribution chart |

#### Engine 2: Habit Core (Behavior & Motivation)
| Pillar | Science Basis | Product Manifestation |
|--------|--------------|----------------------|
| **4. Agentic AI** | Large Language Models + Retrieval-Augmented Generation | AI Co-Pilot suggests next modules; detects at-risk students |
| **5. Self-Regulated Learning** | Zimmerman (1989) — metacognitive monitoring | Personal learning dashboard with habit tracking, goal setting |
| **6. BJ Fogg Behavior Model** | Fogg (2009) — Motivation × Ability × Prompt | Daily micro-task prompts; XP for small consistent actions |
| **7. Hooked Model** | Nir Eyal (2014) — Trigger → Action → Variable Reward → Investment | Daily login triggers; variable XP rewards; leaderboard investment |
| **8. Gamification (Octalysis)** | Yu-kai Chou — 8 core drives | XP, levels, badges, streaks, leaderboards, team challenges |
| **9. Flow Theory** | Csikszentmihalyi (1990) — optimal challenge-skill balance | Adaptive difficulty tags; AI monitors frustration signals |
| **10. Reflection Journaling** | Kolb (1984) — experiential learning cycle | Weekly journal prompts tied to CLO completion; journal entry earns XP |

### The Closed Feedback Loop
```
Institutional Standard (ILO/PLO)
        ↓ Compliance Requirement
Assignment Linked to CLO
        ↓ Student Engagement Trigger
Student Submits → XP Earned → Streak Maintained
        ↓ Evidence Auto-Generated
CLO → PLO → ILO Attainment Updated
        ↓ Feeds Back Into
Accreditation Dashboard
```

---

## 5. Functional Requirements

### Requirement Format
Each requirement follows: **ID | Description | Acceptance Criteria | Priority | Dependency**

---

### 5.1 Authentication & Authorization (FR-AUTH)

**FR-AUTH-01 — Email/Password Login**
- Users log in with institutional email and password via Supabase Auth.
- *AC:* Login succeeds within 2s; failed attempts after 5 tries trigger a 15-minute lockout; lockout event is logged.
- *Priority:* P0 | *Dependencies:* Supabase Auth

**FR-AUTH-02 — Role-Based Access Control (RBAC)**
- Roles: `admin`, `coordinator`, `teacher`, `student`. Roles are stored in `profiles.role` and enforced via Supabase RLS policies.
- *AC:* A `student` token cannot read `learning_outcomes` where `type = 'ILO'`. API returns 403 on unauthorized access.
- *Priority:* P0 | *Dependencies:* FR-AUTH-01

**FR-AUTH-03 — Role-Aware Redirect**
- Post-login, users are redirected to their role-specific dashboard (`/admin`, `/coordinator`, `/teacher`, `/student`).
- *AC:* Redirect occurs in <500ms post auth; direct URL access to wrong role dashboard returns 403 redirect.
- *Priority:* P0

**FR-AUTH-04 — Password Reset Flow**
- Users can request a password reset email; link expires after 1 hour.
- *AC:* Email delivered within 60s; reset link single-use; expired link shows descriptive error.
- *Priority:* P1

**FR-AUTH-05 — Session Persistence & Refresh**
- Sessions persist across browser refreshes using Supabase's token refresh mechanism.
- *AC:* User does not need to re-login within a 24-hour active session; idle sessions expire after 8 hours.
- *Priority:* P1

**FR-AUTH-06 — SSO / OAuth (Phase 2)**
- Support Google Workspace and Microsoft Azure AD SSO for institutional deployment.
- *Priority:* P3

---

### 5.2 User & Profile Management (FR-USER)

**FR-USER-01 — Admin User Provisioning**
- Admins can create, read, update, and soft-delete user accounts. Soft-delete preserves historical evidence records.
- *AC:* Deleted user cannot log in; their historical evidence records remain intact and queryable.
- *Priority:* P0

**FR-USER-02 — Bulk User Import**
- Admins can upload a CSV file (`email, full_name, role, program_id`) to bulk-create accounts.
- *AC:* System validates CSV format before processing; invalid rows listed with error message; valid rows created atomically; email invitations sent to created users.
- *Priority:* P1

**FR-USER-03 — Profile Management**
- All users can update their display name, avatar, and notification preferences.
- *AC:* Avatar uploads ≤ 2MB (JPG/PNG); updates reflected immediately without page refresh.
- *Priority:* P2

**FR-USER-04 — Teacher–Course–Student Association**
- Coordinators assign teachers to courses; teachers enroll students into their course sections.
- *AC:* A teacher can only see students enrolled in their courses; a student can only see courses they are enrolled in.
- *Priority:* P0

---

### 5.3 OBE Engine (FR-OBE)

**FR-OBE-01 — Institutional Learning Outcomes (ILO)**
- Admins perform full CRUD on ILOs. Each ILO has: `title` (varchar 255), `description` (text), `category` (Graduate Attributes enum).
- *AC:* ILO deletion blocked if mapped PLOs exist (show list of dependent PLOs). Maximum 30 ILOs per institution (soft limit, configurable).
- *Priority:* P0 | *Actor:* Admin

**FR-OBE-02 — Program Learning Outcomes (PLO)**
- Coordinators perform full CRUD on PLOs scoped to their program. PLOs map to one or more ILOs with a `weight` (0.0–1.0).
- *AC:* Sum of weights for a PLO's ILO mappings need not equal 1.0 but system warns if total < 0.5. PLO order is drag-reorderable.
- *Priority:* P0 | *Actor:* Coordinator

**FR-OBE-03 — Course Learning Outcomes (CLO)**
- Teachers perform full CRUD on CLOs scoped to their course. CLOs map to one or more PLOs.
- *AC:* A CLO must have at least one PLO mapping before it can be linked to an assignment. System warns if a CLO has no assignment linkage after 7 days.
- *Priority:* P0 | *Actor:* Teacher

**FR-OBE-04 — Bloom's Taxonomy Assignment**
- Each CLO is assigned exactly one Bloom's level: Remembering, Understanding, Applying, Analyzing, Evaluating, Creating.
- *AC:* Bloom's level is required; CLO cannot be saved without it. Dashboard shows Bloom's distribution chart per course.
- *Priority:* P0

**FR-OBE-05 — Rubric Builder**
- Teachers create rubrics with a variable number of criteria (rows) and performance levels (columns). Each cell has a descriptor and point value.
- *AC:* Rubric must have ≥2 criteria and ≥2 performance levels. Rubric is linked to exactly one CLO. Point values are auto-summed into a total score. Rubric templates are reusable across assignments.
- *Priority:* P0 | *Actor:* Teacher

**FR-OBE-06 — Assignment Creation & CLO Linking**
- Teachers create assignments with: title, description, due date, total marks, linked CLO(s), linked rubric.
- *AC:* An assignment can link to 1–3 CLOs with weight distribution (must sum to 100%). Due date must be ≥ 24 hours in the future.
- *Priority:* P0

**FR-OBE-07 — Assignment Submission**
- Students submit assignments before the due date. Submissions accepted up to 24 hours late with automatic late flag.
- *AC:* Student cannot submit after 24h past due date (configurable). Submission triggers a notification to teacher. Student receives submission confirmation with timestamp.
- *Priority:* P0

**FR-OBE-08 — Rubric-Based Grading**
- Teachers grade submissions using the linked rubric. Per-cell selection auto-calculates total score and maps to attainment level.
- *AC:* Grading triggers the Evidence creation workflow (FR-OBE-09). Grade is visible to student immediately upon submission. Teacher can add text feedback per criterion.
- *Priority:* P0

**FR-OBE-09 — Automatic Evidence Generation**
- On grade submission, system creates an `evidence` record linking: `submission_id → CLO → PLO → ILO → attainment_level → score_percent`.
- *AC:* Evidence record created within 500ms of grade save. `outcome_attainment` table updated via rollup function. Evidence is immutable once created (append-only log).
- *Priority:* P0 | *Trigger:* Database trigger on `grades` table insert

**FR-OBE-10 — Outcome Attainment Rollup**
- System aggregates individual evidence records into `outcome_attainment` scores at CLO, PLO, and ILO levels.
- *AC:* Rollup recalculates within 500ms of new evidence insertion. PLO attainment = weighted average of contributing CLO attainments. ILO attainment = weighted average of contributing PLO attainments.
- *Priority:* P0 | *Implementation:* Supabase Edge Function

**FR-OBE-11 — Accreditation Report Export**
- Admins export PDF reports showing ILO/PLO attainment across the institution for a selected semester.
- *AC:* Report includes: institution logo, program name, semester, per-PLO attainment %, evidence count, Bloom's distribution chart. PDF generated within 10 seconds. Report matches accreditation body formatting guidelines (configurable template).
- *Priority:* P1 | *Actor:* Admin

**FR-OBE-12 — Curriculum Mapping Matrix**
- Coordinators view a matrix: rows = PLOs, columns = courses, cells = CLO coverage and attainment percentage.
- *AC:* Cell colors: Green (>70% attainment), Yellow (50–70%), Red (<50%), Gray (no CLO mapped). Click-through to evidence detail. Exportable as CSV.
- *Priority:* P1 | *Actor:* Coordinator

---

### 5.4 Gamification / Habit Engine (FR-GAME)

**FR-GAME-01 — Experience Points (XP) Engine**
- Students earn XP for defined actions. XP is the universal currency feeding levels and leaderboards.
- *XP Schedule:*

| Action | XP Earned | Notes |
|--------|-----------|-------|
| Daily Login | 10 XP | Once per calendar day |
| Assignment Submission (on time) | 50 XP | Deducted to 25 XP if late |
| Assignment Graded (pass) | 25 XP | Bonus on first attempt |
| Reflection Journal Entry | 20 XP | Once per day |
| Streak Milestone (7, 30, 100 days) | 100 / 250 / 500 XP | One-time awards |
| Perfect Rubric Score | 75 XP | All criteria at highest level |
| Helping Peer (future: peer review) | 30 XP | Phase 2 |

- *AC:* XP credited within 1 second of trigger action. XP history log accessible to student. XP cannot be manually adjusted by teachers (admin only, with audit trail).

**FR-GAME-02 — Streak System**
- System tracks consecutive-day login streaks. A streak increments when a student logs in on consecutive calendar days (UTC+5 timezone-aware for Pakistan region, configurable).
- *AC:* Missing a day resets streak to 0. Student receives a push/email reminder at 8 PM if not yet logged in that day. A "streak freeze" item (purchasable with XP) protects streak for 1 day (Phase 2).
- *Priority:* P0

**FR-GAME-03 — Badge System**
- System awards badges for defined milestones. Badges are permanent, visible on student profile.
- *Badge Catalog (MVP):*

| Badge | Trigger | Rarity |
|-------|---------|--------|
| 🔥 First Flame | First login | Common |
| 📚 Homework Hero | First assignment submitted on time | Common |
| ⚡ 7-Day Warrior | 7-day login streak | Uncommon |
| 🏆 30-Day Legend | 30-day login streak | Rare |
| 🎯 Bullseye | Perfect rubric score on an assignment | Uncommon |
| 🧠 Deep Thinker | 10 journal entries submitted | Uncommon |
| 🚀 Level 5 Pioneer | Reach Level 5 | Common |
| 💎 Level 10 Elite | Reach Level 10 | Rare |
| 🌟 Top 10% | Weekly leaderboard top 10% | Rare |

- *AC:* Badge award is atomic and idempotent (cannot be awarded twice for same trigger). Badge award triggers an animated modal notification.
- *Priority:* P0

**FR-GAME-04 — Level System**
- XP accumulation triggers level progression from Level 1 to Level 20.
- *Level Thresholds:*

| Level | XP Required | Title |
|-------|-------------|-------|
| 1 | 0 | Newcomer |
| 2 | 100 | Explorer |
| 3 | 250 | Learner |
| 4 | 500 | Practitioner |
| 5 | 900 | Achiever |
| 6–10 | +500/level | Specialist → Expert |
| 11–15 | +1000/level | Master → Virtuoso |
| 16–20 | +2000/level | Legend → Grandmaster |

- *AC:* Level-up triggers a full-screen animation and badge award. Level displayed on student profile card and leaderboard.
- *Priority:* P0

**FR-GAME-05 — Leaderboard**
- Weekly and all-time leaderboards showing top 50 students by XP within a course section or program.
- *AC:* Leaderboard updates in real time via Supabase Realtime subscription. Students can toggle between "My Course," "My Program," and "All Students." Student's own rank always shown even if outside top 50.
- *Privacy:* Student can opt out of leaderboard visibility (shows as "Anonymous" with rank hidden).
- *Priority:* P1

**FR-GAME-06 — Learning Path Visualization**
- Student dashboard displays a visual "path" of modules/assignments as nodes on a journey map.
- *Node States:* Locked (greyed) → Available (full color, clickable) → In Progress (pulsing) → Completed (checkmarked with XP label).
- *AC:* Path updates in real time after submissions. Locked nodes show unlock condition (e.g., "Submit Assignment 2 to unlock"). Path is mobile-optimized.
- *Priority:* P1

**FR-GAME-07 — Daily Habit Tracker**
- Student dashboard shows a 7-day habit grid with tracked micro-habits: Login, Submit, Journal, Read.
- *AC:* Habit filled/unfilled state updates in real-time. Completing all 4 habits in a day awards a "Perfect Day" bonus (50 XP).
- *Priority:* P2

**FR-GAME-08 — Reflection Journal**
- Students write weekly reflection entries linked to their CLO progress. Entries are private (student-visible only) unless shared.
- *Prompt Engine:* System generates a contextual prompt based on most recently graded CLO (e.g., "You just scored 80% on CLO: 'Apply sorting algorithms.' Reflect: where would you use this in real life?").
- *AC:* Journal entry minimum 100 words (enforced client-side). XP awarded on save. Teacher can view entries only if student opts to share.
- *Priority:* P2

---

### 5.5 Dashboard & Analytics (FR-DASH)

**FR-DASH-01 — Admin Dashboard**
- *Widgets:* System health status, total active users (by role), institution-wide PLO attainment heatmap, recent activity feed, top-performing programs.
- *AC:* Dashboard data max 30 seconds stale (cached with auto-refresh). All charts are drill-down capable.
- *Priority:* P0

**FR-DASH-02 — Coordinator Dashboard**
- *Widgets:* Program PLO attainment matrix, CLO coverage by course, teacher compliance rate (% of assignments with linked CLOs), at-risk student count.
- *AC:* Matrix updates within 1 second of new evidence. Coordinator can filter by semester/academic year.
- *Priority:* P0

**FR-DASH-03 — Teacher Dashboard**
- *Widgets:* Grading queue (submissions pending grade), course-level CLO attainment chart, student performance heatmap, Bloom's taxonomy distribution for the course, at-risk student list.
- *At-Risk Criteria:* Student has not logged in for 7+ days OR has <50% attainment on ≥2 CLOs.
- *AC:* Grading queue updates in real time. At-risk list refreshes daily. Teacher can send a nudge notification from the at-risk list.
- *Priority:* P0

**FR-DASH-04 — Student Dashboard**
- *Widgets:* Welcome hero card (XP, Level, Streak), Learning Path visualization, upcoming deadlines, habit tracker, recent badge awards, leaderboard position.
- *Layout:* 3-column grid on desktop; single column stack on mobile.
- *AC:* Dashboard loads in <1.5s on 4G. XP and streak update in real time. Deadline widget sorted chronologically with urgency color coding (red <24h, yellow <72h, green >72h).
- *Priority:* P0

**FR-DASH-05 — Notification Center**
- In-app notification bell with unread count. Notification types: grading complete, new assignment, badge earned, streak at risk, AI recommendation.
- *AC:* Notification delivered within 5s of trigger event. Mark-all-read action. Notifications persist for 30 days.
- *Priority:* P1

---

### 5.6 AI Co-Pilot (FR-AI) — Phase 2

**FR-AI-01 — Personalized Module Suggestions**
- AI analyzes student's CLO attainment gaps and suggests specific learning resources or extra practice tasks.
- *AC:* Suggestion relevance rated by student (thumbs up/down); feedback fed back into model weighting.

**FR-AI-02 — At-Risk Early Warning**
- AI flags students with >80% probability of failing a CLO based on early submission patterns.
- *AC:* Warning surfaced to teacher ≥7 days before assignment due date. False positive rate <20%.

**FR-AI-03 — Assignment Feedback Draft**
- AI generates a first-draft rubric feedback comment based on the submitted work (teacher edits and confirms before sending).
- *AC:* Draft available within 10 seconds of teacher opening grading view. Teacher must confirm before feedback is sent to student.

---

## 6. Non-Functional Requirements

### 6.1 Performance
| ID | Requirement | Measurement Method |
|----|-------------|-------------------|
| NFR-PERF-01 | Dashboard initial load ≤ 1.5s (4G, cold cache) | Lighthouse CI on every PR |
| NFR-PERF-02 | Evidence rollup recalculation ≤ 500ms | Supabase Edge Function execution logs |
| NFR-PERF-03 | API response p95 ≤ 300ms for read queries | Supabase dashboard monitoring |
| NFR-PERF-04 | Support 5,000 concurrent active users without degradation | Load test via k6 before each major release |
| NFR-PERF-05 | Leaderboard real-time update ≤ 2s via Supabase Realtime | Manual testing + monitoring |

### 6.2 Security
| ID | Requirement | Implementation |
|----|-------------|---------------|
| NFR-SEC-01 | FERPA & GDPR compliance | Data classification; deletion workflows; DPA agreements with Supabase |
| NFR-SEC-02 | Row Level Security on all tables | RLS policies mandatory; CI test suite validates policy coverage |
| NFR-SEC-03 | JWT verification on all API endpoints | Supabase Edge Function middleware |
| NFR-SEC-04 | No PII in server logs | Structured logging policy; PII masking in dev environments |
| NFR-SEC-05 | Input validation on all user inputs | Zod schemas; server-side revalidation |
| NFR-SEC-06 | Rate limiting on auth endpoints | 5 login attempts / 15 min per IP; Supabase built-in |
| NFR-SEC-07 | File upload malware scanning | Supabase Storage with ClamAV integration (Phase 2) |
| NFR-SEC-08 | Dependency vulnerability scanning | GitHub Dependabot + Snyk in CI pipeline |

### 6.3 Reliability & Availability
| ID | Requirement | Target |
|----|-------------|--------|
| NFR-REL-01 | System uptime | 99.9% (≤8.7h downtime/year) |
| NFR-REL-02 | RTO (Recovery Time Objective) | <4 hours |
| NFR-REL-03 | RPO (Recovery Point Objective) | <1 hour (daily Supabase backups + PITR) |
| NFR-REL-04 | Graceful degradation | AI Co-Pilot features degrade gracefully; core OBE/Grading must never be blocked |

### 6.4 Scalability
- Database: PostgreSQL with read replicas for analytics queries (Phase 2).
- Caching: TanStack Query client-side caching; consider Redis for leaderboard aggregation at scale (>10k students).
- Storage: Supabase Storage for assignment file submissions; max 50MB per file.

### 6.5 Usability & Accessibility
| ID | Requirement |
|----|-------------|
| NFR-UX-01 | WCAG 2.1 AA compliance for all core learning flows |
| NFR-UX-02 | Mobile-responsive (360px → 1440px) for Student and Teacher views |
| NFR-UX-03 | Keyboard navigability for all interactive elements |
| NFR-UX-04 | Color contrast ratio ≥ 4.5:1 for all body text |
| NFR-UX-05 | Screen reader compatibility for learning path and grading views |
| NFR-UX-06 | Localization-ready (i18n) architecture — English first, Urdu/Arabic Phase 2 |
| NFR-UX-07 | "Premium Design" constraint: consistent spacing, typography hierarchy, no UI clutter |

### 6.6 Observability
- **Error Tracking:** Sentry (frontend JS errors, API errors)
- **Uptime Monitoring:** BetterUptime or Checkly (ping every 60s)
- **Application Metrics:** Vercel Analytics (Web Vitals) + Supabase Dashboard
- **Audit Logging:** All admin actions (create/delete user, modify ILO) logged to an immutable `audit_logs` table

---

## 7. User Stories & Acceptance Criteria

### Epic 1: Accreditation Engine

**Story 1.1 — Admin generates accreditation report**
> **As an** Administrator,
> **I want to** export a formatted PDF report of PLO attainment across all programs for a selected semester,
> **So that** I can submit evidence to the accreditation body without manual data compilation.

*Acceptance Criteria:*
- [ ] Report generation triggered from Admin Dashboard → Reports tab
- [ ] User selects: Program, Semester, Report Format (ABET / HEC / Generic)
- [ ] Report includes: header (institution name, logo, date), per-PLO attainment table, Bloom's distribution chart, evidence count per PLO, conclusion section
- [ ] PDF generated within 10 seconds
- [ ] Report is downloadable and also emailed to the admin

---

**Story 1.2 — Coordinator identifies curriculum gap**
> **As a** Coordinator,
> **I want to** see which PLOs are not adequately covered by any course in my program,
> **So that** I can flag the gap and assign a course to address it before the next accreditation cycle.

*Acceptance Criteria:*
- [ ] Curriculum matrix visible on Coordinator Dashboard → Mapping tab
- [ ] Red cells (< 50% coverage or no linked CLO) are clearly differentiated
- [ ] Coordinator can click a red cell to see: which courses exist, which have CLOs, which have evidence
- [ ] "Flag Gap" action creates a task/note visible to relevant teachers
- [ ] Matrix filterable by academic year and semester

---

**Story 1.3 — Teacher completes grading with automatic evidence**
> **As a** Teacher,
> **I want to** grade a submission using the linked rubric and have evidence automatically generated,
> **So that** I do not have to fill out a separate OBE compliance form.

*Acceptance Criteria:*
- [ ] Rubric-based grading interface shows all criteria and performance levels
- [ ] Selecting a cell auto-calculates total score
- [ ] On "Submit Grade," evidence record is created within 500ms
- [ ] Student receives grade notification within 5s
- [ ] Teacher grading queue updates (removes graded submission)

---

### Epic 2: Gamification Engine

**Story 2.1 — Student earns XP on submission**
> **As a** Student,
> **I want to** see an animation and receive XP immediately after submitting my assignment,
> **So that** I feel a sense of accomplishment and am motivated to tackle the next task.

*Acceptance Criteria:*
- [ ] On successful submission, a full-screen XP animation plays ("+50 XP!" with confetti)
- [ ] XP balance in header updates in real time
- [ ] Toast notification confirms submission and XP earned
- [ ] If this submission triggers a badge, badge modal appears after XP animation
- [ ] Student can dismiss animations; they are not blocking

---

**Story 2.2 — Student maintains a streak**
> **As a** Student,
> **I want to** see my daily streak displayed prominently and receive a reminder if I haven't logged in today,
> **So that** I maintain my habit of daily engagement with my studies.

*Acceptance Criteria:*
- [ ] Streak counter displayed on student dashboard hero card with flame icon
- [ ] Streak increments at midnight if student logged in that day
- [ ] At 8 PM if no login: push notification (if enabled) and email "Your streak is at risk!"
- [ ] Streak resets to 0 at midnight+1 if missed (shown as "Streak Lost" notification next login)
- [ ] Streak milestones (7, 30, 100 days) trigger special animations and XP bonuses

---

**Story 2.3 — Teacher monitors at-risk students**
> **As a** Teacher,
> **I want to** see a list of students who have been inactive or are underperforming,
> **So that** I can proactively intervene before they fall too far behind.

*Acceptance Criteria:*
- [ ] "At-Risk Students" widget visible on Teacher Dashboard
- [ ] At-risk criteria: no login for 7+ days OR <50% attainment on ≥2 CLOs
- [ ] List shows: student name, last login date, at-risk reason, attainment summary
- [ ] Teacher can click "Send Nudge" to send a pre-written motivational email to the student
- [ ] List refreshes daily at midnight

---

### Epic 3: User Management

**Story 3.1 — Admin bulk imports users**
> **As an** Administrator,
> **I want to** upload a CSV file of new students at semester start,
> **So that** I can onboard 300+ students in minutes instead of one by one.

*Acceptance Criteria:*
- [ ] CSV template downloadable from the Users page
- [ ] CSV format: `email, full_name, role, program_id`
- [ ] System validates CSV before import (shows row-by-row errors)
- [ ] Valid rows imported atomically; invalid rows skipped with error report
- [ ] Imported users receive a "Set Your Password" email invitation
- [ ] Admin sees import summary: X created, Y skipped, Z errors

---

## 8. Feature Prioritization & Roadmap

### MoSCoW Prioritization

| Priority | Features |
|----------|----------|
| **Must Have (P0)** | Auth & RBAC, ILO/PLO/CLO CRUD, Rubric Builder, Grading, Evidence Auto-Generation, Attainment Rollup, Student Dashboard (XP/Streak/Level/Badges), Admin/Coord/Teacher Dashboards |
| **Should Have (P1)** | Accreditation Report Export, Curriculum Mapping Matrix, Leaderboard, Notification Center, Password Reset, Bulk User Import |
| **Could Have (P2)** | Reflection Journal, Daily Habit Tracker, AI At-Risk Warnings, Streak Freeze Item |
| **Won't Have (MVP)** | AI Module Suggestions, Peer Review, SSO/OAuth, Mobile App, Multi-language |

### Release Roadmap

| Phase | Timeline | Deliverables |
|-------|----------|--------------|
| **Alpha (Internal)** | Month 1–2 | Auth, RBAC, ILO/PLO/CLO CRUD, basic dashboards |
| **Beta (Pilot Institution)** | Month 3–4 | Grading, Evidence, Gamification core (XP/Streaks/Badges/Levels), Student Dashboard |
| **v1.0 (GA)** | Month 5–6 | Accreditation Reports, Curriculum Matrix, Notifications, Leaderboard, Performance hardening |
| **v1.5** | Month 7–9 | Reflection Journal, AI At-Risk, Habit Tracker, Bulk Import |
| **v2.0** | Month 10–12 | AI Co-Pilot (suggestions), SSO, Advanced Analytics, Multi-program views |

---

## 9. API Contract Overview

All API access is via Supabase PostgREST and Edge Functions. Core endpoints:

### Authentication
```
POST /auth/v1/token (Supabase managed)
POST /auth/v1/recover
POST /auth/v1/logout
```

### Learning Outcomes
```
GET    /rest/v1/learning_outcomes?type=eq.ILO          → List ILOs
POST   /rest/v1/learning_outcomes                       → Create outcome
PATCH  /rest/v1/learning_outcomes?id=eq.{id}           → Update outcome
DELETE /rest/v1/learning_outcomes?id=eq.{id}           → Delete outcome
GET    /rest/v1/outcome_mappings?source_id=eq.{id}     → Get mappings for outcome
```

### Assignments & Grading
```
GET    /rest/v1/assignments?course_id=eq.{id}          → List assignments
POST   /rest/v1/assignments                             → Create assignment
POST   /rest/v1/submissions                             → Student submits
POST   /functions/v1/grade-submission                  → Teacher grades (triggers evidence)
GET    /rest/v1/evidence?student_id=eq.{id}            → Student's evidence
```

### Gamification
```
GET    /rest/v1/student_profiles?id=eq.{id}            → XP, level, streak
GET    /rest/v1/badges?student_id=eq.{id}              → Student's badges
GET    /functions/v1/leaderboard?course_id={id}        → Real-time leaderboard
```

### Reports (Edge Functions)
```
POST   /functions/v1/generate-accreditation-report     → Trigger PDF generation
POST   /functions/v1/calculate-attainment-rollup       → Manual rollup trigger (also auto-fired)
```

---

## 10. Success Metrics & KPIs

### Product Health KPIs

| Metric | Target | Measurement |
|--------|--------|-------------|
| Student DAU/MAU Ratio | ≥ 60% | Supabase analytics |
| Average Session Length (Student) | ≥ 8 minutes | Custom analytics events |
| Streak Continuation Rate (7-day) | ≥ 40% of users | Gamification analytics |
| Assignment On-Time Submission Rate | ≥ 75% | `submissions` table |
| Evidence Records Created | 100% of graded assignments | Evidence vs grades delta |
| Report Generation to Export | < 10 seconds | Edge Function execution time |
| Teacher Grading Turnaround | ≤ 5 days median | Grade vs submission timestamp |
| NPS Score (Student) | ≥ 40 | Quarterly in-app survey |
| NPS Score (Teacher) | ≥ 30 | Quarterly in-app survey |

### Business KPIs (Post-Launch)

| Metric | Target | Measurement |
|--------|--------|-------------|
| Institutions Onboarded | 5 in year 1 | CRM |
| Student MAU | 10,000 by end of year 1 | Platform |
| Accreditation Reports Generated | 50+ in year 1 | Platform |
| Churn Rate (Institution) | < 10% annually | Contract tracking |

---

## 11. Risk Register

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Teacher adoption resistance | High | High | Reduce friction in CLO/rubric setup; provide templates; training videos |
| Evidence rollup performance at scale | Medium | High | Index optimization; pre-aggregated views; load testing in staging |
| Accreditation report format varies by body | High | Medium | Configurable report templates; start with 2–3 formats |
| GDPR/FERPA data residency requirements | Medium | High | Supabase region selection; DPA signing; legal review before launch |
| Gamification leading to gaming the system | Medium | Medium | XP caps per day; admin visibility into XP history; anomaly detection (Phase 2) |
| Supabase Realtime stability at high concurrency | Low | Medium | Fallback polling; graceful degradation |
| AI Co-Pilot hallucinations (Phase 2) | Medium | Medium | Human-in-the-loop for all AI outputs; confidence threshold filtering |

---

## 12. Open Questions & Decisions

| # | Question | Owner | Due | Status |
|---|----------|-------|-----|--------|
| 1 | Which accreditation body format should be supported in v1.0? (ABET vs HEC vs AACSB) | Product | Week 4 | Open |
| 2 | Should XP be visible to teachers and coordinators? (Privacy vs. transparency tradeoff) | Product, Design | Week 3 | Open |
| 3 | What is the data retention policy for evidence records? (GDPR consideration) | Legal, Engineering | Week 6 | Open |
| 4 | Stripe integration for SaaS billing — per-student, per-institution, or seat-based? | Business | Week 8 | Open |
| 5 | Should Reflection Journal entries be AI-analyzed for sentiment/engagement signals? | Product, AI | Phase 2 | Deferred |
| 6 | Multi-tenant architecture: single Supabase project with RLS or separate projects per institution? | Engineering | Week 2 | **Decided: Single project with RLS (revisit at 50+ institutions)** |

---

*Document maintained by the Edeviser Product Team. All changes tracked in version history. For questions, contact the Product Owner.*
