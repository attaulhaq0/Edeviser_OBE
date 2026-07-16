# Card & Element Inventory — pixel-fidelity source of truth

**Source of truth: `prototype/*.html` + `shared.css` ONLY.** This inventory enumerates
**every card / section / element** the prototype defines, per role, with (a) its exact
prototype treatment, (b) the `@/design-system` component that reproduces it, (c) the
**Supabase-backed hook** it binds to (G.5), and (d) an honest fidelity status of the
current rebuild. It exists so nothing is missed and so "pixel-perfect vs prototype" is a
checklist, not a vibe.

> Complements: `tasks.md` §Appendix A (exact element treatments), §1.x (chrome), §1.7
> (cross-cutting systems). This file is the **per-card** ledger.

## Status legend

- ✅ **matched** — built to the prototype card, real hook wired.
- 🟡 **adapted** — built, but reframed to real data (a prototype sub-element had no
  backend, so it was mapped to a real signal — see note). Needs owner sign-off on the reframe.
- ⏸ **deferred / gap** — prototype card/sub-element NOT built because it has **no backend**
  (flagged, never faked). Needs a backend (`prototype-backend-parity`) or an owner decision.
- ❌ **missing** — prototype card that should be built and currently is not.

Every ⏸/❌/🟡 is a concrete item to implement or a backend gap to close.

---

## STUDENT — `dashboard.html` (hook: `useStudentDashboardAggregate` + section hooks)

| #   | Prototype card / element                                                                                                    | Exact treatment                                             | Component                          | Hook                                                                               | Status     |
| --- | --------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | ---------------------------------- | ---------------------------------------------------------------------------------- | ---------- |
| 1   | **Hero carousel** — 4 slides (dots + auto-advance + swipe)                                                                  | `.hero-carousel/.hero-slides/.hero-dots`, `--hero-gradient` | §1.7.1 carousel (**not built**)    | —                                                                                  | ⏸ carousel |
| 1a  | slide 1 — greeting + level ring + XP bar + Foxi                                                                             | `ring-mini`, XP bar, `chr` Foxi                             | `ProgressRing` + `MascotCharacter` | aggregate.kpis (XP/level/streak) + `computeLevelData`                              | ✅         |
| 1b  | slide 2 — streak-at-risk                                                                                                    | —                                                           | —                                  | streak-risk signal                                                                 | ⏸ gap      |
| 1c  | slide 3 — leaderboard rank movement ("climbed 2 spots")                                                                     | —                                                           | —                                  | weekly rank-delta                                                                  | ⏸ gap      |
| 1d  | slide 4 — badge "1 session away"                                                                                            | —                                                           | —                                  | badge-progress                                                                     | ⏸ gap      |
| 2   | **Weakest outcome** card                                                                                                    | `.pcard`, teal→blue gradient, `ring-mini`, Foxi             | bespoke                            | `useCLOProgress` (lowest CLO)                                                      | ✅         |
| 3   | **Next step** (nearest deadline)                                                                                            | `.pcard`, `border-l amber`, brand-gradient icon             | bespoke + `Button tactile`         | aggregate.deadlines[0]                                                             | ✅         |
| 4   | **My Courses** strip (≥5 ring cards)                                                                                        | horizontal scroll, `ring-mini` per course                   | `ProgressRing` cards               | `useStudentCourses`                                                                | ✅         |
| 5   | **Continue your path**                                                                                                      | nav `.pcard`, brand icon                                    | bespoke                            | weakest CLO → `/student/today`                                                     | ✅         |
| 6   | **Today's Habits** (4 circles, x/4, Pengu nudge)                                                                            | habit circles, green done, Pengu                            | bespoke + `MascotCharacter`        | `useTodayViewData` (login/submit/journal/read)                                     | ✅         |
| 7   | **Daily Review** (CLO chips, +15 XP, streak)                                                                                | chips, `Button tactile`                                     | bespoke                            | `useWeeklyReviews`                                                                 | ✅         |
| 8   | **This Week's Activity** heatmap (7-day)                                                                                    | `wk-grid`, heat colors                                      | bespoke heat grid                  | `useHeatmapData`                                                                   | ✅         |
| 9   | **Announcements**                                                                                                           | list + amber dot                                            | bespoke                            | aggregate.announcements                                                            | ✅         |
| R   | **Right rail** (dashboard context: Daily Goal ring · Daily Quests · Gold League · Coming up · Streak protection · AI tutor) | `.right-rail`/`.rail-card`                                  | §1.3.5 (**not built**)             | goal/quests/league/deadlines/streak (quests+league-weekly+freeze-inventory = gaps) | ⏸ rail     |

---

## TEACHER — `teacher-dashboard.html` (hook: `useTeacherDashboardAggregate`)

| #   | Prototype card / element                                                                                                                                | Exact treatment                         | Component                    | Hook                                                               | Status                                                                                                                                     |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- | ---------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | **Hero carousel** — 3 slides                                                                                                                            | `.hero-carousel`, `.ai-chip`            | §1.7.1 (**not built**)       | —                                                                  | ⏸ carousel                                                                                                                                 |
| 1a  | slide 1 — greeting + AI status chips (3 need attention / 12 feedback / 6 micro-lessons / 2 CLO gaps)                                                    | `.ai-chip`                              | bespoke chips                | atRiskCount + pendingSubmissions (micro-lessons + CLO-gaps = gaps) | 🟡 (2 of 4 chips real)                                                                                                                     |
| 1b  | slide 2 — weekly momentum (▲6% mastery / on-time 88% / 24 moments / 6.2h saved)                                                                         | `.hero-kfig`                            | —                            | week-over-week / on-time / teaching-time                           | ⏸ gap                                                                                                                                      |
| 1c  | slide 3 — up next today (schedule)                                                                                                                      | schedule rows                           | —                            | timetable                                                          | ⏸ gap                                                                                                                                      |
| 2   | **KPI row** — Classes / Avg mastery (+`spark`) / On-time / CLOs-below (+`trend`)                                                                        | `.kpi/.kpi-ic/.trend/.spark`            | `KPICard`                    | aggregate.kpis                                                     | 🟡 adapted → Students / Avg-mastery / To-grade / At-risk; **missing** `.spark` sparkline + `.trend` week-deltas + Classes count + On-time% |
| 3   | **Do first · Student triage** — `.tri-tabs` Critical/Attention/Monitor, `.lead` avatar, risk% pill, `.spark`, actions Send-nudge/Assign-review/Book-1:1 | `.tri-tab`, `.pcard`, `.pill-red/amber` | bespoke tabs + `Button`      | `useAtRiskStudents` + `useSendNudge`                               | 🟡 severity pill (no fake risk%); ⏸ risk%, `.spark`, Assign-review, Book-1:1                                                               |
| 4a  | **Approve AI Feedback** — batch "Approve all (9)" + per-item feedback previews (Aisha/Yousef, pill %, Approve/Edit)                                     | `.pcard`, `data-ai-card`, `.btn3d`      | needs §1.7.3 approve/dismiss | pendingSubmissions count; **AI-draft item previews**               | 🟡 count+nav only; ⏸ feedback-item previews + batch-approve                                                                                |
| 4b  | **Curriculum Studio** — gradient header, "6 micro-lessons", `.time-chip` "Saved ~42 min", NEW badge                                                     | gradient header `.pcard-tap`            | nav card                     | — (no curriculum-studio hook)                                      | ❌ built as plain nav tile; **missing** studio card + time-saved                                                                           |
| 4c  | **Outcome Gaps** — REST APIs (CLO5) 46%, recommendation box, Assign-now                                                                                 | `.pcard`, `.pill-red`, blue rec box     | —                            | course-scoped CLO attainment                                       | ❌ replaced by Bloom's-coverage; **missing**                                                                                               |
| 4d  | **Today's Classes** — schedule rows (9:00 DB Design, 11:00 Web Dev), Open-class                                                                         | `.pcard`, rounded rows                  | nav card                     | timetable                                                          | ❌ built as Timetable nav tile; **missing** schedule list                                                                                  |
| 5a  | **At-risk students · AI prediction** — probability %, contributing-signal chips, current attainment, nudge/view                                         | `.pill-red`, signal chips               | bespoke                      | `useAtRiskPredictions` + `useSendAtRiskNudge`                      | ✅                                                                                                                                         |
| 5b  | **Teaching impact** — `.stat-tile` ×4 (moments/views/clarity/helpfulness) + most-viewed list                                                            | `.stat-tile`                            | —                            | `useTeachingImpact` (course-scoped)                                | ⏸ OMITTED (course-scoped gap)                                                                                                              |
| 6   | **Autonomy footer (A2)**                                                                                                                                | bordered bar                            | bespoke                      | static policy                                                      | ✅                                                                                                                                         |
| R   | **Right rail** (AI-prepared-day / at-risk ×3 / class pulse / Curriculum Studio)                                                                         | `.right-rail`                           | §1.3.1 (**not built**)       | at-risk + KPIs                                                     | ⏸ rail                                                                                                                                     |

---

## PARENT — `parent-dashboard.html` (hook: `useParentDashboardAggregate`; NO raw grades)

| #   | Prototype card / element                                                                                             | Exact treatment          | Component                | Hook                                                                    | Status                                                                             |
| --- | -------------------------------------------------------------------------------------------------------------------- | ------------------------ | ------------------------ | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| 1   | **AI story banner** — green→indigo, 🌱, chips (🔥Consistency↑ / ✍️Writing-improving / 😊Wellbeing-good), why-popover | `.ai-banner`, `.ai-chip` | bespoke                  | streak/level/band chips                                                 | 🟡 3 chips → real streak/level/band; "writing-improving" + "wellbeing-good" = gaps |
| 2   | **This week, in plain words** — narrative                                                                            | `.feed-wide .pcard`      | bespoke                  | — (auto-narrative gap)                                                  | 🟡 factual real-data summary instead                                               |
| 3a  | **Where she's growing** — per-subject rows (Databases↑ / Writing↑ / Math→), `.h-9` icon + trend arrow                | icon rows + arrows       | bespoke                  | per-subject trend                                                       | 🟡 → overall OBE band + link; ⏸ per-subject rows (gap)                             |
| 3b  | **Wellbeing & balance** — Study days 4/5 · Focus balance Healthy · Mood Good + note                                  | 3-stat grid              | bespoke                  | streak/courses/level proxies                                            | 🟡 real proxies; ⏸ mood/focus-balance (gap)                                        |
| 4   | **One way to help** — retrieval-practice prompt, Remind-tonight / More-ideas                                         | gradient `.pcard`        | `Button tactile/outline` | generic coaching (static)                                               | ✅                                                                                 |
| 5   | **Celebrate** — "reached Satisfactory", Send 💚                                                                      | `.pcard` row             | `Button outline`         | milestone (band/streak); ⏸ parent→child "send" (no hook → View instead) | 🟡                                                                                 |
| R   | **Right rail** (This week / Conversation starter / Celebrate)                                                        | `.right-rail`            | §1.3.2 (**not built**)   | proxies + static                                                        | ⏸ rail                                                                             |

---

## COORDINATOR — `coordinator-dashboard.html` (hook: `useCoordinatorDashboardAggregate`)

| #   | Prototype card / element                                                                                                                  | Exact treatment                                | Component                                                  | Hook                                                         | Status                                                |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------ | ----------------------------------------------------- |
| 1   | **Hero carousel** — 3 slides (greeting+action-chips / PLO2-drop context / accreditation-readiness)                                        | `.hero-carousel`, `.act-chip`                  | §1.7.1 (**not built**)                                     | belowTarget/avg/accred                                       | 🟡 slide 1 real chips; ⏸ slides 2-3                   |
| 2   | **KPI-filters row** — Programs / Avg PLO / Below target / Accred ready (`.kpi-filter` + `.flt`)                                           | `.pcard-tap`, `.flt`                           | bespoke `KpiFilter`                                        | usePrograms / aggregate / outcome-attainment / accreditation | ✅                                                    |
| 3   | **Attainment alerts** — PLO2 & CLO5, `.meta-row` (trend/vs-last-term/affected) + `.rootcause` box, priority pills, Draft-CQI/Drill/Follow | `.pcard`, `.lead sev-*`, `.meta`, `.rootcause` | bespoke                                                    | `useCoordinatorOutcomeAttainment` (weakestCourse/affected)   | ✅ root-cause; ⏸ trend-vs-last-term, Follow-up action |
| 4a  | **Curriculum gap** — "Concurrency has no assessment", HIGH IMPACT                                                                         | `.pcard-tap`, `.pill-red`                      | nav card                                                   | — (no gap-detection hook)                                    | 🟡 → real CLO-coverage% card                          |
| 4b  | **Accreditation evidence** — checklist (CLO mapping/samples/analysis/reflection/CQI), 82%                                                 | `.rail-check`, `.rc-box.mi`                    | bespoke checklist                                          | `useCoordinatorAccreditationReadiness` (`pack`)              | ✅                                                    |
| 5a  | **Close the loop (CQI)** timeline — done/prog/plan/pend                                                                                   | `.tl/.tl-dot`                                  | bespoke `Timeline`                                         | `useCQIPlans`                                                | ✅                                                    |
| 5b  | **Program timeline** — milestones                                                                                                         | `.tl`                                          | `Timeline`                                                 | `useAcademicCalendarEvents`                                  | ✅                                                    |
| 6   | **Recovery pathways** (Concept) — 3 PLO routes (diagnostic→lessons→re-assess)                                                             | `.pcard`, "Concept" pill                       | —                                                          | none (prototype-only)                                        | ⏸ OMITTED (flagged concept)                           |
| R   | **Right rail** (attainment alerts ×2 / curriculum gap / accreditation)                                                                    | `.right-rail`                                  | §1.3.3 (**not built**; supersede `CoordinatorInsightRail`) | outcome-attainment/accred                                    | ⏸ rail                                                |

---

## ADMIN — `admin-dashboard.html` (hook: `useAdminDashboardAggregate`)

| #   | Prototype card / element                                                                    | Exact treatment                                  | Component              | Hook                                                          | Status                                                                              |
| --- | ------------------------------------------------------------------------------------------- | ------------------------------------------------ | ---------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| 1   | **Hero carousel** — 3 slides (greeting+status-chips / executive watch-item / AI governance) | `.hero-carousel`, `.ai-chip`, `.hero-kfig`       | §1.7.1 (**not built**) | users/active/programs                                         | 🟡 slide 1 real chips; ⏸ slides 2-3 (watch-item, governance)                        |
| 2   | **KPI row** — Learners / Weekly active / Avg mastery / Retention risk                       | `.pcard`, big value                              | `KPICard`              | aggregate + department mean                                   | 🟡 → Users / Active / Avg-mastery / Courses; ⏸ weekly-active-login%, retention-risk |
| 3   | **Executive insight** — AI narrative, Draft-outreach / See-analytics                        | `.feed-wide .pcard`, `.pill-blue` "AI-generated" | bespoke                | — (no admin AI-insight hook)                                  | 🟡 factual real-data summary + lowest-dept; ⏸ AI narrative, Draft-outreach action   |
| 4a  | **Departments by mastery** — bars                                                           | progress bars                                    | bespoke                | `useDepartmentAnalytics`                                      | ✅                                                                                  |
| 4b  | **AI Governance** — A2 / 214 suggestions / 0 unapproved                                     | `.pcard-tap`, 3-stat                             | —                      | — (no governance metrics + no `/admin/governance` route)      | 🟡 → real Users-by-role card + static A2 footer; ⏸ governance metrics               |
| R   | **Right rail** (Institution / AI governance / Departments)                                  | `.right-rail`                                    | §1.3.4 (**not built**) | KPIs + department (weekly-active/retention/governance = gaps) | ⏸ rail                                                                              |

---

## Roll-up — what to build / connect (dashboards)

**Front-end to build (backend exists):**

- Hero **carousel** component + slide 1 for all 4 carousel dashboards (§1.7.1).
- All 5 **right rails** (§1.3) — none render today.
- Teacher: feedback-item previews + batch-approve (§1.7.3), Today's-Classes schedule (needs timetable read), triage risk% + sparkline.
- Admin: Departments already ✅; wire executive-insight to real trend if a delta hook is added.
- KPI `.spark` sparklines + `.trend` week-over-week labels (teacher/coordinator/admin) once a trend source exists.

**Backend gaps (no table/hook — build in `prototype-backend-parity` or owner-decide; never fake):**

- Student: streak-risk flag, weekly leaderboard rank-delta, badge-progress ("N sessions away"), daily-quests, gold-league-weekly, streak-freeze inventory.
- Teacher: curriculum-studio (micro-lesson generation + time-saved), on-time %, classes count, weekly momentum deltas, teaching-time-saved, timetable/schedule, teaching-impact at dashboard scope.
- Parent: per-subject growth trend, mood / focus-balance / wellbeing, "writing improving" signal, parent→child encouragement send, auto weekly narrative.
- Coordinator: attainment trend-vs-last-term, curriculum-gap auto-detection, recovery-pathways.
- Admin: weekly-active-login %, retention-risk count, AI-generated executive narrative, AI-governance metrics (suggestions/wk, unapproved-actions) + `/admin/governance` route.

**Other screens (P3):** the same per-card inventory format is applied screen-by-screen as each
is rebuilt (drive from its `prototype/*.html`); this file is extended per screen at rebuild time.
