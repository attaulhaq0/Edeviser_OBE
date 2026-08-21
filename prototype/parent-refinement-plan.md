# Parent Experience Refinement Plan

## Scope guard

- Write scope: `prototype/` only.
- Preserve: existing sidebar, top bar, contextual right rail frame, card language, typography, spacing, colors, borders, shadows, icons, navigation order, and desktop three-column shell.
- Runtime: deterministic hard-coded prototype data; no API, database, package, deployment, or network integration.
- Existing dirty files were recorded before work. Unrelated changes will not be reverted.

## Parent page audit

### Parent Home — `parent-dashboard.html`

- **KEEP:** existing shell, compact hero placement, plain-language story, two-column information row, support section, and right rail.
- **FIX:** Maya identity; generic Writing/Math story; inaccurate course/focus/deadline data; diagnostic wellbeing wording; automatic reminder/encouragement implications.
- **ADD:** Sarah weekly narrative, Database Design/CLO 3 evidence, a non-duplicative “what the next evidence will show” card, one contextual support action, page-aware E Deviser Intelligence drawer, approval-safe status, subtle feedback loop, mobile context order.
- **REMOVE:** unsupported raw interpretations and auto-sent action language.
- **AGENTIC UI:** “Why am I seeing this?”, evidence/specialist/policy/result explanation, A1/A2 autonomy language, Parent Agent attribution.
- **RESPONSIVE FIX:** preserve dense desktop grouping; integrate upcoming/access rail content into mobile flow without repeating the main learning evidence.

### Parent Growth — `parent-progress.html`

- **KEEP:** shell, title area, horizontal progress bars, compact two-column sections, restrained wellbeing treatment, right rail.
- **FIX:** Maya identity; subject bands that contradict Student data; unsupported “best week” prediction; “None detected” stress claim.
- **ADD:** five canonical course progress rows, current CLO focus, compact Bloom learning journey, 12-day consistency, next evidence, parent-safe interpretation, contextual intelligence drawer.
- **REMOVE:** Writing/Math substitutions and diagnosis-like wording.
- **AGENTIC UI:** Mastery + Habit + Parent specialist inputs, policy result, “Why this focus?” evidence view.
- **RESPONSIVE FIX:** order current focus → journey → courses → consistency → wellbeing → intelligence on mobile.

### Parent Support — `parent-support.html`

- **KEEP:** shell, support-idea cards, teacher-message layout, helpful-resources area, right rail.
- **FIX:** Maya identity; generic support ideas; immediate Send behavior; ambiguous AI suggestion state.
- **ADD:** one prioritized teach-back prompt, two alternatives, editable teacher draft, review-and-send approval drawer, local prototype status, A2 Draft only badge, privacy disclosure.
- **REMOVE:** direct-send button and non-contextual math recommendation.
- **AGENTIC UI:** Intervention + Parent sources, evidence/policy rationale, protected communication approval, visible action status.
- **RESPONSIVE FIX:** order recommendation → alternatives → teacher draft → status/privacy; full-width touch targets without horizontal scroll.

### Parent Profile / Me — `parent-profile.html`

- **KEEP:** shell, Nadia profile header styling/avatar, contact details, notification preferences, security/access settings, quick links.
- **FIX:** linked-child identity and relationship copy.
- **ADD:** compact linked-student verification, Parent access, private-by-default fields, AI suggestions/drafts status, approval-required communication.
- **REMOVE:** unrelated child/analytics blocks that distract from Parent permissions.
- **AGENTIC UI:** compact permission/intelligence area only; no learning analytics.
- **RESPONSIVE FIX:** permission cards stack cleanly; keep controls touch-sized.

### Fees & Payments — `fees.html`

- **KEEP:** existing cross-role page and payment structure.
- **FIX:** Parent-specific Maya labels only.
- **ADD / REMOVE / AGENTIC UI / RESPONSIVE FIX:** none.

### Announcements and Notifications

- **KEEP:** existing shared pages, role-aware navigation, and layouts.
- **FIX:** shared Parent notification text where it references Maya.
- **ADD / REMOVE / AGENTIC UI / RESPONSIVE FIX:** none.

### Settings

- **KEEP AS-IS:** no Parent-specific student story or agentic addition is needed.

## Student → Parent data map

| Student learning truth | Parent-safe presentation |
| --- | --- |
| Sarah Ahmed · Level 4 · 750 / 1000 XP | Verified linked student: Sarah Ahmed · Level 4; XP omitted unless contextually useful |
| Database Design · CS301 · 72% · Module 5/8 | Course progress, not a grade |
| Normalization · CLO 3 · 62% · Developing | Current focus plus plain-language application interpretation |
| Assignment 3 · Normalize a Schema · Friday · due in 2 days | Upcoming evidence/deadline and support planning context |
| Learning Path Level 3 Apply · 65% · 2/5 · +18% | Compact Database Design journey with completed/current/future states |
| 12-day streak · study days 4/5 | Consistent learning rhythm; no causal or diagnostic claim |
| Daily Review · 5 cards today | Coming-up context only |
| Recommended 25-minute study window | Optional protected focus-window support idea |
| Tutor transcript, journal entries, teacher-only notes | Private by default; explicitly excluded |

## Page → orchestrator capability map

| Page | Authorized context | Specialists | Parent-safe output | Protected action | Approval |
| --- | --- | --- | --- | --- | --- |
| Home | Nadia + Sarah + weekly learning state | Mastery, Habit, Intervention, Parent | Weekly summary + priority + support suggestion | Reminder/external encouragement | Nadia |
| Growth | Sarah + courses + CLO + Learning Path + habit trend | Mastery, Habit, Parent | Parent-friendly progress interpretation | None | Not required |
| Support | Sarah + current focus + assignment deadline | Intervention, Parent | Prioritized support idea + teacher-message draft | Teacher message | Nadia |
| Profile | Nadia + verified Sarah link + access policy | Parent, Policy | Visible/private fields + assistance limits | External communication | Nadia |

## Allowed-file change plan

1. Add centralized Parent demo data/state and shared Parent-only UI behavior.
2. Add Parent-scoped styles without changing shared global primitives.
3. Refine the four Parent pages while preserving their shell.
4. Correct Parent-only Sarah references in shared navigation/notifications/fees.
5. Add consistency and orchestrator reports.
6. Run static interaction/data checks and browser QA at 390, 768, 1024, 1440, 1680, and 1920.
7. Store required screenshots under `prototype/_shots/`.
8. Run final `git diff --name-only` and confirm no task-created change exists outside `prototype/`.
