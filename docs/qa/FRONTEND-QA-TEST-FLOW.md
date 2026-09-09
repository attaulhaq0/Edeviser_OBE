# Edeviser — Frontend QA Test Flow Guide (v1.0)

> **For new QA team members.** This guide assumes you have access ONLY to the live app
> (https://e-deviser.vercel.app) — no PostHog, no database, no code. Everything below is
> tested **from the browser** against the **production** build.
>
> **Updated**: 2026-09-09 (aligned to production main)

---

## 1. What Is Edeviser?

Edeviser is a **school platform** for the Qatar market. It has TWO big ideas:

1. **OBE (Outcome-Based Education)** — every course has learning outcomes (ILOs → PLOs → CLOs)
   and the system proves students achieved them with evidence (assignments, grades, quizzes).
2. **Gamification** — students earn XP, streaks, badges, and level up so learning feels like a game.

It supports **3 curricula (assessment models)** so different schools can use the way they grade:

| Curriculum | Grading style | Schools that use it |
|------------|--------------|---------------------|
| **IB MYP** | Criterion A–D, scored 0–8 each, total → 1–7 grade | IB schools |
| **Cambridge IGCSE** | Band grades A\*-G / 9–1, weighted assessment objectives | British schools |
| **MoEHE Qatar** | Percentage + learner attributes, Arabic/English | Qatar national schools |

5 user types (roles) exist, each with its own area:

| Role | What they do |
|------|-------------|
| **Admin** | Run the school: users, departments, programs, courses, fees, badges, marketplace |
| **Coordinator** | Curriculum quality: PLOs, curriculum matrix, CQI (improvement plans), accreditation |
| **Teacher** | Teach: grade assignments, gradebook, modules, rubrics, quizzes, attendance, AI tutor handoffs |
| **Student** | Learn: courses, assignments, AI Tutor, quizzes, habits, planner, XP, badges, marketplace |
| **Parent** | Watch: child progress, attendance, fees, communications |

---

## 2. Logging In

Open **https://e-deviser.vercel.app**, click **Sign In**, and use a demo account.

> **Important**: If you see a cookie-consent banner at the bottom on first visit, click
> **"Accept All"** — this is required by law and lets the app run normally.

### Demo accounts (all roles)

All use the shared demo password — ask the project owner for the value (it is stored in
`.env.local` on the dev machine, never committed).

| Role | Email | Full Name |
|------|-------|-----------|
| Admin | `principal@gulf-academy.test` | Dr. Aisha Al-Mansoori |
| Coordinator | `curriculum@gulf-academy.test` | Mr. Khalid Al-Thani |
| Teacher (Math 7) | `anderson@gulf-academy.test` | Mr. Omar Anderson |
| Teacher (Science 7) | `patel@gulf-academy.test` | Mr. Rajiv Patel |
| Student | `student01@gulf-academy.test` | Yusuf Ahmadi |
| Parent | `parent01@gulf-academy.test` | (see credentials guide) |

**Second school (bilingual test):**

| Role | Email |
|------|-------|
| Admin | `principal@noor-international.edu` |
| Teacher | `kim@noor-international.edu` |
| Student | `student01@noor-international.edu` |
| Parent | `parent01@noor-international.edu` |

> Full table: `docs/QA-Demo-Credentials-and-Testing-Guide.md`

---

## 3. Do This ONCE Before Testing

For EVERY role you test, start a **fresh browser session** (Incognito window) so login state
from a previous role does not leak into the next test. Log out fully between roles.

---
## 4. Route Verification — Every Sidebar Link Must Open

For each role, log in and click EVERY item in the sidebar. The page must load without a blank
screen, error screen, or "not found". Test each and tick the box.

### 4.1 Admin routes

| # | Route | Opens? | Notes |
|---|-------|--------|-------|
| A1 | `/admin/dashboard` | ☐ | KPIs load, no errors |
| A2 | `/admin/analytics` | ☐ | Charts render |
| A3 | `/admin/accreditation-reports` | ☐ | |
| A4 | `/admin/settings/profile` | ☐ | |
| A5 | `/admin/users` | ☐ | User list loads |
| A6 | `/admin/departments` | ☐ | Add/delete departments (CRUD in §6) |
| A7 | `/admin/programs` | ☐ | |
| A8 | `/admin/courses` | ☐ | |
| A9 | `/admin/semesters` | ☐ | |
| A10 | `/admin/outcomes` | ☐ | ILOs list |
| A11 | `/admin/timetable` | ☐ | |
| A12 | `/admin/calendar` | ☐ | |
| A13 | `/admin/fees` | ☐ | |
| A14 | `/admin/import` | ☐ | Bulk import page |
| A15 | `/admin/reports` | ☐ | |
| A16 | `/admin/historical-evidence` | ☐ | |
| A17 | `/admin/graduate-attributes` | ☐ | |
| A18 | `/admin/onboarding/pending` | ☐ | |
| A19 | `/admin/audit-log` | ☐ | |
| A20 | `/admin/governance` | ☐ | AI governance |
| A21 | `/admin/security` | ☐ | |
| A22 | `/admin/bonus-events` | ☐ | |
| A23 | `/admin/badges` | ☐ | Badge definitions |
| A24 | `/admin/badges/spotlight` | ☐ | |
| A25 | `/admin/marketplace` | ☐ | Marketplace items |
| A26 | `/admin/surveys` | ☐ | |
| A27 | `/admin/notifications` | ☐ | |
| A28 | `/admin/announcements` | ☐ | |

### 4.2 Coordinator routes

| # | Route | Opens? | Notes |
|---|-------|--------|-------|
| C1 | `/coordinator/dashboard` | ☐ | |
| C2 | `/coordinator/settings/profile` | ☐ | |
| C3 | `/coordinator/plos` | ☐ | PLO list |
| C4 | `/coordinator/matrix` | ☐ | Curriculum matrix |
| C5 | `/coordinator/sankey` | ☐ | Sankey diagram |
| C6 | `/coordinator/trends` | ☐ | Trends |
| C7 | `/coordinator/cohort-comparison` | ☐ | |
| C8 | `/coordinator/gap-analysis` | ☐ | Gap analysis |
| C9 | `/coordinator/coverage-heatmap` | ☐ | |
| C10 | `/coordinator/cqi` | ☐ | **Contains "Run pattern detection" button** (§7) |
| C11 | `/coordinator/outcome-chain` | ☐ | |
| C12 | `/coordinator/course-file` | ☐ | Course file generator |
| C13 | `/coordinator/accreditation` | ☐ | |
| C14 | `/coordinator/team-health` | ☐ | |
| C15 | `/coordinator/competencies` | ☐ | Framework packs (MYP/IGCSE/MoEHE) |
| C16 | `/coordinator/discussions` | ☐ | |
| C17 | `/coordinator/timetable` | ☐ | |
| C18 | `/coordinator/sessions` | ☐ | |
| C19 | `/coordinator/notifications` | ☐ | |

### 4.3 Teacher routes

| # | Route | Opens? | Notes |
|---|-------|--------|-------|
| T1 | `/teacher/dashboard` | ☐ | |
| T2 | `/teacher/settings/profile` | ☐ | |
| T3 | `/teacher/students` | ☐ | Student list |
| T4 | `/teacher/grading` | ☐ | Grading queue — **core chain §7.2** |
| T5 | `/teacher/gradebook` | ☐ | |
| T6 | `/teacher/modules` | ☐ | Course modules |
| T7 | `/teacher/questions` | ☐ | Question bank |
| T8 | `/teacher/rubrics` | ☐ | |
| T9 | `/teacher/tutor-handoffs` | ☐ | |
| T10 | `/teacher/tutor-analytics` | ☐ | |
| T11 | `/teacher/attendance` | ☐ | |
| T12 | `/teacher/attendance/report` | ☐ | |
| T13 | `/teacher/calendar` | ☐ | |
| T14 | `/teacher/timetable` | ☐ | |
| T15 | `/teacher/discussions` | ☐ | |
| T16 | `/teacher/announcements` | ☐ | |
| T17 | `/teacher/notifications` | ☐ | |
| T18 | `/teacher/clos` | ☐ | CLO list |

### 4.4 Student routes

| # | Route | Opens? | Notes |
|---|-------|--------|-------|
| S1 | `/student/dashboard` | ☐ | |
| S2 | `/student/learning-path` | ☐ | |
| S3 | `/student/tutor` | ☐ | AI Tutor chat — **core chain §7.5** |
| S4 | `/student/progress` | ☐ | |
| S5 | `/student/profile` | ☐ | |
| S6 | `/student/courses` | ☐ | |
| S7 | `/student/assignments` | ☐ | |
| S8 | `/student/today` | ☐ | |
| S9 | `/student/habits` | ☐ | Wellness heatmap |
| S10 | `/student/planner` | ☐ | |
| S11 | `/student/sessions` | ☐ | |
| S12 | `/student/challenges` | ☐ | |
| S13 | `/student/leaderboard` | ☐ | |
| S14 | `/student/friends` | ☐ | |
| S15 | `/student/team` | ☐ | |
| S16 | `/student/journal` | ☐ | |
| S17 | `/student/calendar` | ☐ | |
| S18 | `/student/marketplace` | ☐ | |
| S19 | `/student/notifications` | ☐ | |
| S20 | `/student/notification-preferences` | ☐ | |
| S21 | `/student/settings/profile` | ☐ | |
| S22 | `/student/surveys` | ☐ | |
| S23 | `/student/fees` | ☐ | |
| S24 | `/student/content` | ☐ | |
| S25 | `/student/timetable` | ☐ | |
| S26 | `/student/portfolio` | ☐ | |
| S27 | `/student/badges` | ☐ | |
| S28 | `/student/xp-history` | ☐ | |
| S29 | `/student/transcript` | ☐ | |

### 4.5 Parent routes

| # | Route | Opens? | Notes |
|---|-------|--------|-------|
| P1 | `/parent/dashboard` | ☐ | |
| P2 | `/parent/progress` | ☐ | Child progress — **core chain §7.6** |
| P3 | `/parent/attendance` | ☐ | |
| P4 | `/parent/fees` | ☐ | |
| P5 | `/parent/communications` | ☐ | |
| P6 | `/parent/support` | ☐ | |
| P7 | `/parent/children` | ☐ | |
| P8 | `/parent/planner` | ☐ | |
| P9 | `/parent/profile` | ☐ | |
| P10 | `/parent/notifications` | ☐ | |

---

## 5. Permission Checks (Role Isolation)

A student must NOT see teacher pages and vice versa. With the logged-in role, open these
URLs directly and confirm you are **redirected away** or see an access-denied message:

| Test | Open this URL as Student | Expected |
|------|--------------------------|----------|
| R1 | `/teacher/dashboard` | Redirected to `/student/dashboard` or access denied |
| R2 | `/admin/users` | Redirect / denied |
| R3 | `/coordinator/cqi` | Redirect / denied |
| R4 | `/parent/progress` | Redirect / denied |

| Test | Open this URL as Teacher | Expected |
|------|--------------------------|----------|
| R5 | `/admin/users` | Redirect / denied |
| R6 | `/coordinator/plos` | Redirect / denied |

| Test | Open this URL as Parent | Expected |
|------|--------------------------|----------|
| R7 | `/student/tutor` | Redirect / denied |
| R8 | `/teacher/grading` | Redirect / denied |

Also confirm: the sidebar for each role shows ONLY that role's items (no teacher links in the
student sidebar, etc.).

---
## 6. CRUD Integrity Checks (Insert → Verify → Update → Verify → Delete → Verify → Re-insert)

These prove the database chain is sound from the frontend. For each entity, do the full
lifecycle and record the result. **Never delete data you did not create in this test run.**

### 6.1 Admin — Department
| Step | Action | Expected | ✅/❌ |
|------|--------|----------|------|
| 1 | `/admin/departments` → **Add department** name `QA-Test-Dept-<your initials>` | Toast success, row appears in list | |
| 2 | Rename it to `QA-Test-Dept-<initials>-renamed` | Renamed in list | |
| 3 | Delete it | Toast success, row gone | |
| 4 | Re-add the same name again | Reappears (proves no stale state / phantom row) | |
| 5 | Delete it again (cleanup) | Row gone | |

### 6.2 Admin — Program (needs a department first)
| Step | Action | Expected | ✅/❌ |
|------|--------|----------|------|
| 1 | `/admin/programs` → **Add program** name `QA-Test-Program-<initials>` | Appears in list | |
| 2 | Edit the program name | Updated in list | |
| 3 | Delete it | Gone | |

### 6.3 Admin — Course (needs a program)
| Step | Action | Expected | ✅/❌ |
|------|--------|----------|------|
| 1 | `/admin/courses` → **Add course** (pick program, fill name/code) | Appears | |
| 2 | Delete it | Gone | |

### 6.4 Teacher — CLO (learning outcome)
| Step | Action | Expected | ✅/❌ |
|------|--------|----------|------|
| 1 | `/teacher/clos` → **Create CLO** for a course | CLO list shows it | |
| 2 | Edit it | Updated | |
| 3 | Delete it | Gone | |

### 6.5 Teacher — Rubric
| Step | Action | Expected | ✅/❌ |
|------|--------|----------|------|
| 1 | `/teacher/rubrics` → **Create rubric** with criteria | Appears | |
| 2 | Delete it | Gone | |

### 6.6 Admin — Announcement
| Step | Action | Expected | ✅/❌ |
|------|--------|----------|------|
| 1 | `/admin/announcements` → **Create announcement** | Appears | |
| 2 | It shows for students on their dashboard (check in §7.7) | | |
| 3 | Delete it | Gone | |

---

## 7. Full Frontend Chain Tests (the real product stories)

These are the most important tests — they prove one role's action feeds another role's view.
Run each across two browser sessions (two Incognito windows or two browsers).

### 7.1 CHAIN-A: Student submits → Teacher grades → Student sees grade

**People**: Student (window 1), Teacher (window 2)

| Step | Who | Action | Expected | ✅/❌ |
|------|-----|--------|----------|------|
| 1 | Student | `/student/assignments` → open an assignment → submit (upload a small PDF or type) | "Submission confirmed" toast; submission shows in list | |
| 2 | Teacher | `/teacher/grading` → find that student's submission | It is in queue, mark as graden/ungraded | |
| 3 | Teacher | Grade it (type score %) → Save | Toast success | |
| 4 | Student | Refresh `/student/assignments` or progress page | Grade appears on their assignment | |
| 5 | Student | `/student/xp-history` | XP transaction for the grade appears (+15) | |
| 6 | Student | `/student/progress` | CLO attainment for the linked outcome updated | |

**Also try the negative path:**
| 7 | Teacher | Enter an out-of-range score (e.g. 150 or -5) | Validation error, not accepted | |

### 7.2 CHAIN-B: Teacher creates quiz → Student takes adaptive quiz → grade recorded

**People**: Teacher (window 1), Student (window 2)

| Step | Who | Action | Expected | ✅/❌ |
|------|-----|--------|----------|------|
| 1 | Teacher | `/teacher/questions` or the quizzes entry → create a quiz linked to a CLO (MCQ/true-false) | Quiz created, questions attached | |
| 2 | Student | `/student/courses` → open course → open the quiz → **Start** | Quiz opens | |
| 3 | Student | Answer all questions → **Submit** | Score shown, auto-graded | |
| 4 | Student | `/student/progress` | Quiz linked CLO attainment reflects score | |

> Note: if the quiz is marked `is_adaptive`, you should see one question at a time and the
> difficulty adjust (harder on correct, easier on wrong).

### 7.3 CHAIN-C: Teacher marks attendance → Student/Parent sees it

| Step | Who | Action | Expected | ✅/❌ |
|------|-----|--------|----------|------|
| 1 | Teacher | `/teacher/attendance` → pick a session → mark Present/Absent for a student → Save | Marked | |
| 2 | Student | `/student/dashboard` (attendance tile) or sessions | Attendance reflects | |
| 3 | Parent | `/parent/attendance` | Shows the child's updated attendance | |

### 7.4 CHAIN-D: Admin creates announcement → Student/Parent sees it

| Step | Who | Action | Expected | ✅/❌ |
|------|-----|--------|----------|------|
| 1 | Admin | `/admin/announcements` → create + publish | Toast | |
| 2 | Student | `/student/dashboard` or notifications | Announcement visible | |
| 3 | Parent | `/parent/communications` | Announcement visible | |

### 7.5 CHAIN-E: Student uses AI Tutor → response streams → rating

| Step | Who | Action | Expected | ✅/❌ |
|------|-----|--------|----------|------|
| 1 | Student | `/student/tutor` → type a question about a course | Response streams (types out), citations shown | |
| 2 | Student | Rate the response (thumbs up/down) | Rating saved | |
| 3 | Teacher | `/teacher/tutor-analytics` | Usage/latency shows the message | |

> **Fallback**: If streaming fails, expect a clear error toast — never a silent hang.

### 7.6 CHAIN-F: Parent views child progress

| Step | Who | Action | Expected | ✅/❌ |
|------|-----|--------|----------|------|
| 1 | Parent | `/parent/progress` | Sees ONLY linked children (never other students) | |
| 2 | Parent | Open a child | Grades, attainment, attendance, habits visible | |
| 3 | Parent | `/parent/planner/:studentId` | Child's planner visible | |

### 7.7 Student gamification: Planner → XP → Badge → Heatmap

| Step | Who | Action | Expected | ✅/❌ |
|------|-----|--------|----------|------|
| 1 | Student | `/student/planner` → add a task → check it done | "+10 XP" toast | |
| 2 | Student | `/student/xp-history` | Exactly ONE XP row for that task (no duplicates) | |
| 3 | Student | `/student/habits` | Today's cell filled on the heatmap | |
| 4 | Student | `/student/badges` (after streak days) | Streak badges award at 7/30/60/100 days | |

### 7.8 Coordinator CQI detection

| Step | Who | Action | Expected | ✅/❌ |
|------|-----|--------|----------|------|
| 1 | Coordinator | `/coordinator/cqi` | Page loads with "Run pattern detection" button | |
| 2 | Coordinator | Click **Run pattern detection** | Progress, then a summary or "no new patterns"; no error | |
| 3 | Coordinator | If a pattern appears → **Create plan** from it | Plan appears in list | |
| 4 | Coordinator | Delete the test plan (cleanup) | Gone | |

### 7.9 Student Marketplace purchase

| Step | Who | Action | Expected | ✅/❌ |
|------|-----|--------|----------|------|
| 1 | Student | `/student/marketplace` | Items load with prices | |
| 2 | Student | Buy an affordable item | Balance deducted, success toast | |
| 3 | Student | `/student/marketplace/history` | Purchase appears | |

---

## 8. Student-specific flows not covered above

| # | Flow | Steps | Expected | ✅/❌ |
|---|------|-------|----------|------|
| G1 | **Habits/wellness** | `/student/habits` → complete the daily habits | Heatmap cell fills; streak count ticks | |
| G2 | **Leaderboard** | `/student/leaderboard` | Rankings load | |
| G3 | **Friends** | `/student/friends` → send friend request | Request appears | |
| G4 | **Journal** | `/student/journal` → **New entry** ≥ 50 words → save | +20 XP toast; entry in list | |
| G5 | **Team** | `/student/team` → view team | Team loads | |
| G6 | **Challenges** | `/student/challenges` | Challenge list loads | |
| G7 | **Portfolio** | `/student/portfolio` | Artifacts render | |
| G8 | **Fees** | `/student/fees` | Fee balance visible | |
| G9 | **Sessions** | `/student/sessions` | Study sessions list | |
| G10 | **Focus mode** | From planner, start a focus session | `/student/focus/:id` full-screen timer runs | |

---
## 9. Bilingual (Arabic/English) & RTL

| # | Test | Steps | Expected | ✅/❌ |
|---|------|-------|----------|------|
| L1 | Switch to Arabic | Top-right language switcher → العربية | UI flips to RTL; sidebar, buttons, labels in Arabic | |
| L2 | Switch back to English | Switcher → English | Full LTR English UI | |
| L3 | Arabic student data | Login `student01@noor-international.edu` → Arabic | Course/outcome names bilingual | |
| L4 | No garbled text | Check Arabic UI has **no** "??" or broken glyphs | Clean rendering | |
| L5 | RTL layout sanity | In Arabic, check sidebar on right, content flows right→left | Correct mirror | |

## 10. Error Handling & Validation

| # | Test | Steps | Expected | ✅/❌ |
|---|------|-------|----------|------|
| V1 | Empty required field | Submit a form (e.g., new department) with empty name | Field-level validation error shown | |
| V2 | Invalid login | Wrong email/password | Clear error toast, no crash | |
| V3 | Numeric bounds | Out-of-range grade/score | Blocked with message | |
| V4 | Network error UX | (Optional) DevTools → Offline → try to load a page | Error state/empty state, no white screen | |
| V5 | Route 404 | Visit `/student/not-a-route` | Friendly not-found screen with back link | |
| V6 | Double-submit | Click "Save" twice fast on a create form | No duplicate rows (button disabled or idempotent) | |

## 11. Cookie Consent & Privacy

| # | Test | Steps | Expected | ✅/❌ |
|---|------|-------|----------|------|
| CC1 | Banner shows first visit | Fresh incognito, no consent stored | Cookie banner at bottom with Accept All / Reject | |
| CC2 | Accept All | Click **Accept All** | Banner disappears | |
| CC3 | Persists | Refresh after accept | Banner does NOT reappear | |
| CC4 | Reject | Reject non-essential | App still works; banner dismisses | |

## 12. Responsive / Basic Browser Checks

| # | Check | Expected | ✅/❌ |
|---|-------|----------|------|
| B1 | Desktop 1440px | Sidebar visible, no horizontal scroll on main pages | |
| B2 | Tablet 768px | Usable | |
| B3 | Mobile 375px | Mobile tab bar appears; sidebar hidden | |
| B4 | Dark mode toggle (if visible) | Toggle works without broken contrast | |

---

## 13. Bug Report Template

Copy-paste and fill for every bug found:

```markdown
**Title**: [Role] [Page] — [short description]

**Severity**: Blocker / Major / Minor / Cosmetic

**Steps to reproduce**:
1. Login as _____________
2. Go to _______________
3. Click _______________
4. Expected: ____________
5. Actual: ______________

**Environment**: Production https://e-deviser.vercel.app · Chrome version __ · incognito? __

**Screenshots**: (paste)

**Console errors** (F12 → Console tab): paste any red errors here

**Network tab**: if the action calls an API, paste the failing request status

**Data affected**: which records were created/deleted during repro (so dev can clean up)
```

## 14. Test Run Checklist (do before you finish)

- ☐ All routes in §4 opened without error (tick each)
- ☐ Permission checks §5 all pass
- ☐ CRUD §6 all pass
- ☐ Chains §7 all pass (2-window tests)
- ☐ Student flows §8 all pass
- ☐ Bilingual §9 pass
- ☐ Validation §10 pass
- ☐ Cookie consent §11 pass
- ☐ All created test data cleaned up (deleted) at the end
- ☐ Any leftover test data reported to dev for cleanup

---

**If you find a bug, do NOT fix it yourself — file it with the template above and continue.**
**A good QA run finds bugs; a great QA run leaves the data clean and the report complete.**
