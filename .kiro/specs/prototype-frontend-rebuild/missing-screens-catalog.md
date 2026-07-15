# Missing-Screens Catalog — Prototype Frontend Rebuild (Path A)

> The burn-down list proving **nothing is skipped**. Ground truth = `src/router/
> AppRouter.tsx` (164 routes) + `src/lib/navItems.ts`. Every route is classified and
> annotated with the **net-new sub-UI** it needs — because the prototype provides
> only read/list happy-paths (verified: its admin "invite" is a `toast()` stub, so
> **it contains ~0 real CRUD, modals, detail pages, wizards, or state screens**).

## Legend

- **P** — prototype mocks this 1:1 (match it). **P\*** — prototype sets the pattern
  (apply via archetype). **D** — no prototype ref (compose from archetypes).
- **Net-new** = UI the prototype does NOT provide and we must design in its language:
  **F** create/edit Form · **Del** delete/confirm modal · **Dt** detail page ·
  **W** wizard/stepper · **St** empty/loading/error/success states · **Mo** other modal/sheet.
- All screens reuse existing hooks (no new backend), except §7 (new hook over
  existing tables/functions).

## Summary (per `ui-prototype-migration` classification, verified against router)

| Class | Count | Meaning |
| --- | --- | --- |
| P | ~40 | prototype-referenced 1:1 |
| P\* | ~31 | prototype pattern |
| D | ~93 | design-system-derived (no prototype) |
| **Total routes** | **~164** | across 5 roles + public |

**Reality:** even the ~40 "P" screens need net-new **St/Del/Mo** layers, and nearly
all **F/Dt/W** surfaces are net-new across every role.

---

## 0. Public / Auth

| Route | Class | Net-new to build |
| --- | --- | --- |
| `/login` `/signup` `/reset-password` `/update-password` | P | St (error/lockout/success); preserve auth background + logic |
| `/accept-invite/:token` | P\* | St (valid/expired/consumed token states) |
| `/portfolio/:student_id` | D | St (public empty/not-shared/404) |
| `/terms` `/privacy` | D | prose layout |

## 1. Admin (`/admin/*`)

| Route | Class | Net-new to build |
| --- | --- | --- |
| `dashboard` | P | St |
| `users` | P | Del (deactivate), Mo (invite dialog — **prototype only toasts**), St |
| `users/new`, `users/:id/edit` | D | **F**, St |
| `users/import` | D | **W** (upload→map→validate→commit), St |
| `users/invite`, `users/invite-parent` | D | **F**, Mo, St |
| `onboarding/pending` | D | Dt (review), Del (approve/reject), St |
| `programs`, `programs/new`, `programs/:id/edit` | D | **F**, Del, St |
| `courses`, `courses/new`, `courses/:id/edit` | D | **F**, Del, St |
| `courses/:courseId/enrollment` | D | Mo (add/remove roster), Del, St |
| `semesters`, `departments` | D | **F** (inline/dialog), Del, St |
| `outcomes` (ILO), `outcomes/new`, `:id/edit` | P\*/D | **F**, Del, Dt, St |
| `audit-log` | P\* | St, filters, Dt (entry drawer) |
| `bonus-events` | D | **F**, Del, St |
| `reports` | P | St, export Mo |
| `calendar` | P\* | **F** (event), Del, St |
| `timetable` | D | **F** (slot), Del, grid St |
| `fees` | D | **F**, Del, receipt Mo, St |
| `import` | D | **W**, St |
| `surveys`, `surveys/results` | D | **F** (builder), Del, analytics St |
| `graduate-attributes` | D | **F**, Del, St |
| `competency-frameworks` | D | **F**, Del, Dt, St |
| `historical-evidence` | D | analytics St |
| `outcome-chain` | D | analytics St |
| `badges/spotlight` | D | **F**, Del, St |
| `marketplace`, `/sales`, `/analytics`, `/quests`, `/economist` | D/P\* | **F**, Del, Dt, analytics St |
| `settings/profile`, `settings/institution` | P/P\* | **F** (sectioned), St |

## 2. Coordinator (`/coordinator/*`)

| Route | Class | Net-new to build |
| --- | --- | --- |
| `dashboard` | P | St |
| `plos`, `plos/new`, `plos/:id/edit` | P/D | **F**, Del, St |
| `matrix` | P | Mo (cell detail), St |
| `sankey` | D | analytics St |
| `gap-analysis` | P\* | St |
| `coverage-heatmap` | P\* | Mo (cell), St |
| `trends`, `cohort-comparison` | D | analytics St |
| `cqi` | P\* | **F** (action plan), Del, Dt, status-transition Mo, St |
| `course-file` | P\* | **W** (generate), Dt, St |
| `outcome-chain` | D | analytics St |
| `timetable` | D | shared with admin |
| `settings/profile` | P | **F**, St |

## 3. Teacher (`/teacher/*`)

| Route | Class | Net-new to build |
| --- | --- | --- |
| `dashboard` | P | St |
| `clos`, `clos/new`, `clos/:id/edit`, `clos/:id` | P\*/D | **F**, Del, **Dt**, St |
| `clos/:cloId/sub-clos`, `outcomes/sub-clos` | D | **F**, Del, St |
| `rubrics`, `rubrics/new`, `rubrics/:id/edit` | P\*/D | **F/W** (criteria builder), Del, St |
| `assignments`, `/new`, `/:id/edit` | D | **F**, Del, St |
| `grading`, `grading/:submissionId` | P | **Dt** (grade UI + AI draft), Mo, St |
| `gradebook` | P\* | Mo (cell edit), St |
| `baseline`, `/:courseId`, `/config`, `/questions/new` | D | **F**, **W** (config), analytics St |
| `courses/:courseId/generate-questions` | P | **W** (AI Studio: generate→review), St |
| `courses/:courseId/review-queue`, `question-bank`, `explanation-review` | P\* | Del/approve Mo, Dt, St |
| `courses/:courseId/question-analytics`, `quiz-clo-correlation/:quizId` | D | analytics St |
| `courses/:courseId/quizzes/new`, `/:id/edit` | D | **F**, St |
| `announcements` | D | **F** (editor), Del, St |
| `modules` | P\* | **F**, Del, reorder Mo, St |
| `courses/:courseId/discussions`, `/:threadId` | D | Del/moderate Mo, **Dt**, St |
| `attendance`, `attendance/report` | P\*/D | Mo (mark), analytics St |
| `teams`, `teams/manage`, `teams/new`, `teams/:id/edit`, `team-health` | P\*/D | **F**, Del, **Dt**, analytics St |
| `challenges`, `/new`, `/:id/edit` | D | **F**, Del, St |
| `tutor-analytics`, `tutor-handoffs` | D | Dt (handoff), analytics St |
| `content-review` | P\* | approve/reject Mo, St |
| `calendar`, `timetable`, `settings/profile` | P\*/D/P | **F**, St |

## 4. Student (`/student/*`)

| Route | Class | Net-new to build |
| --- | --- | --- |
| `dashboard` | P | St |
| `courses`, `courses/:courseId`, `.../materials/:materialId` | P/P\* | **Dt**, St |
| `assignments`, `assignments/:id` | P | **Dt** (submit Mo/upload), St |
| `quizzes/:quizId/adaptive` | P\* | Focus (full-screen), St |
| `quizzes/:quizId/review/:attemptId` | P\* | Focus, St |
| `courses/:courseId/recovery/:cloId` | D | Focus/Dt, St |
| `today`, `planner`, `planner/starter-week` | P/P\* | **W** (starter week), Mo, St |
| `focus/:sessionId` (outside shell) | P | Focus (full-screen), St |
| `journal` | P | **F** (entry dialog), Dt, St |
| `tutor`, `tutor/:conversationId` | P | autonomy/persona controls, source Mo, history, St |
| `habits`, `habits/analytics` | P\* | Mo (log), analytics St |
| `leaderboard` | P | St (anonymity opt-out preserved) |
| `challenges`, `challenges/list`, `challenges/:id` | P\*/D | **Dt**, join Mo, St |
| `team`, `teams/:teamId`, `teams/new` | P\* | **F**, **Dt**, invite Mo, St |
| `marketplace`, `/my-items`, `/history` | P | purchase-confirm Mo, Dt, St |
| `portfolio` | P | share Mo (public toggle), St |
| `content` | D | **F**, Del, St |
| `progress` | P | analytics St |
| `calendar`, `timetable` | P\* | St |
| `surveys` | D | **F** (respond), St |
| `announcements/:announcementId` | D | **Dt**, St |
| `discussions`, `/:threadId` | P\* | **F** (post), **Dt**, St |
| `onboarding`, `onboarding/complete-profile` | P\* | **W** (multi-step), St |
| `settings/profile`, `/reassessment`, `notification-preferences`, `sessions` | P/D | **F**, Del (revoke session), St |

## 5. Parent (`/parent/*`)

| Route | Class | Net-new to build |
| --- | --- | --- |
| `dashboard` | P | St |
| `children` | D | Dt, link-child Mo, St |
| `progress` | P | analytics St |
| `attendance` | D | analytics St |
| `planner`, `planner/:studentId` | P\* | Mo, St |
| `profile`, `settings/profile` | P\* | **F**, St |

## 6. AI Tutor (cross-cutting, student + teacher)

Surface EXISTING backend only: autonomy L1/L2/L3 (`useTutorAutonomy`), personas,
RAG source citations, per-CLO context ("what I know about you" = real CLO mastery;
long-term memory = **roadmap label**). Curriculum "Studio" = compose existing
teacher AI fns (embed / module-suggest / generate-questions / feedback-draft /
review-queue) into one teacher-approved flow. No new AI backend. (R3.4)

## 7. Net-new screens (backend exists, no UI today — confirmed via router grep)

| New screen | Backend it surfaces | Build |
| --- | --- | --- |
| **Admin Security console** (`/admin/security`) | `blocked_ips`, `rate_limit_events`, `login_attempts`, `check-login-rate` | Table + Dt drawer + unblock Del/confirm; **needs a new read/mutation hook over existing tables** (no new backend logic) |
| **Transcript viewer** (student, e.g. `/student/transcript`) | `useTranscript`, `generate-transcript`, `transcripts` bucket | Dt + generate/download Mo, St |

---

### How to use this catalog

P3 tasks (`tasks.md`) work this list top-to-bottom. Each row is done only when its
screen + all listed net-new sub-UI exist in the new design system AND it passes the
per-screen Definition of Done. Update each row's status as its route cuts over.
