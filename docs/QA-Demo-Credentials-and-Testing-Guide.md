# Edeviser Platform — Demo Credentials & QA Testing Guide

**Generated**: 2026-05-21
**Environment**: Production (https://e-deviser.vercel.app)
**Supabase Project**: cdlgtbvxlxjpcddjazzx

---

## 🔐 Universal Password

All demo accounts use the same password:

```
DemoQatar2026!
```

> ⚠️ **CHANGE THIS PASSWORD** after QA testing is complete. Reset via Supabase Dashboard > Authentication > Users.

---

## 🏫 School 1: Gulf Academy of Excellence

| Field | Value |
|-------|-------|
| Slug | `gulf-academy` |
| Email domain | `@gulf-academy.test` |
| Grade band | 6–8 |
| Locale | English (Arabic-style names) |

### Staff Accounts

| Role | Email | Full Name |
|------|-------|-----------|
| **Admin** (Principal) | `principal@gulf-academy.test` | Dr. Aisha Al-Mansoori |
| **Coordinator** (Curriculum) | `curriculum@gulf-academy.test` | Mr. Khalid Al-Thani |
| **Coordinator** (Welfare) | `welfare@gulf-academy.test` | Ms. Layla Hassan |
| **Teacher** (Math 7) | `anderson@gulf-academy.test` | Mr. Omar Anderson |
| **Teacher** (Science 7) | `patel@gulf-academy.test` | Mr. Rajiv Patel |
| **Teacher** (ELA 7) | `thompson@gulf-academy.test` | Ms. Sarah Thompson |

### Courses & Classes

| Course | Code | Teacher | Classes |
|--------|------|---------|---------|
| Mathematics 7 | MATH7 | Mr. Omar Anderson | 7A (10 students) |
| Science 7 | SCI7 | Mr. Rajiv Patel | 7B (10 students) |
| English Language Arts 7 | ELA7 | Ms. Sarah Thompson | 7C (10 students) |

### Student Accounts (30 total)

| # | Email | Full Name | Class |
|---|-------|-----------|-------|
| 1 | `student01@gulf-academy.test` | Yusuf Ahmadi | 7A |
| 2 | `student02@gulf-academy.test` | Maryam Al-Sulaiti | 7A |
| 3 | `student03@gulf-academy.test` | Hassan Karim | 7A |
| 4 | `student04@gulf-academy.test` | Noura Al-Kuwari | 7A |
| 5 | `student05@gulf-academy.test` | Ali Reza | 7A |
| 6 | `student06@gulf-academy.test` | Fatima Al-Naimi | 7A |
| 7 | `student07@gulf-academy.test` | Omar Siddiqui | 7A |
| 8 | `student08@gulf-academy.test` | Layla Khan | 7A |
| 9 | `student09@gulf-academy.test` | Ibrahim Mahmoud | 7A |
| 10 | `student10@gulf-academy.test` | Zainab Hussain | 7A |
| 11 | `student11@gulf-academy.test` | Abdullah Al-Marri | 7B |
| 12 | `student12@gulf-academy.test` | Hana Sultan | 7B |
| 13 | `student13@gulf-academy.test` | Khalid Aziz | 7B |
| 14 | `student14@gulf-academy.test` | Salma Rahman | 7B |
| 15 | `student15@gulf-academy.test` | Tariq Mehdi | 7B |
| 16 | `student16@gulf-academy.test` | Mariam Sheikh | 7B |
| 17 | `student17@gulf-academy.test` | Hamza Qureshi | 7B |
| 18 | `student18@gulf-academy.test` | Aisha Bashir | 7B |
| 19 | `student19@gulf-academy.test` | Saeed Al-Attiyah | 7B |
| 20 | `student20@gulf-academy.test` | Reem Hamad | 7B |
| 21 | `student21@gulf-academy.test` | Adam Rashid | 7C |
| 22 | `student22@gulf-academy.test` | Yara Othman | 7C |
| 23 | `student23@gulf-academy.test` | Mohammed Al-Dosari | 7C |
| 24 | `student24@gulf-academy.test` | Sara Imran | 7C |
| 25 | `student25@gulf-academy.test` | Karim Saleh | 7C |
| 26 | `student26@gulf-academy.test` | Lina Akhtar | 7C |
| 27 | `student27@gulf-academy.test` | Faisal Al-Emadi | 7C |
| 28 | `student28@gulf-academy.test` | Nadia Yousef | 7C |
| 29 | `student29@gulf-academy.test` | Rayan Habib | 7C |
| 30 | `student30@gulf-academy.test` | Dana Al-Khater | 7C |

### Parent Accounts (15 — linked to students 01–05, 11–15, 21–25)

| Email | Linked Student |
|-------|---------------|
| `parent01@gulf-academy.test` | Yusuf Ahmadi |
| `parent02@gulf-academy.test` | Maryam Al-Sulaiti |
| `parent03@gulf-academy.test` | Hassan Karim |
| `parent04@gulf-academy.test` | Noura Al-Kuwari |
| `parent05@gulf-academy.test` | Ali Reza |
| `parent11@gulf-academy.test` | Abdullah Al-Marri |
| `parent12@gulf-academy.test` | Hana Sultan |
| `parent13@gulf-academy.test` | Khalid Aziz |
| `parent14@gulf-academy.test` | Salma Rahman |
| `parent15@gulf-academy.test` | Tariq Mehdi |
| `parent21@gulf-academy.test` | Adam Rashid |
| `parent22@gulf-academy.test` | Yara Othman |
| `parent23@gulf-academy.test` | Mohammed Al-Dosari |
| `parent24@gulf-academy.test` | Sara Imran |
| `parent25@gulf-academy.test` | Karim Saleh |

---

## 🏫 School 2: Noor International School

| Field | Value |
|-------|-------|
| Slug | `noor-international` |
| Email domain | `@noor-international.test` |
| Grade band | 6–8 |
| Locale | Mixed English + bilingual UI test |

### Staff Accounts

| Role | Email | Full Name |
|------|-------|-----------|
| **Admin** (Principal) | `principal@noor-international.test` | Mrs. Priya Venkatesh |
| **Coordinator** (Curriculum) | `curriculum@noor-international.test` | Dr. James O'Connor |
| **Coordinator** (Welfare) | `welfare@noor-international.test` | Ms. Amina Diallo |
| **Coordinator** (Assessment) | `assessment@noor-international.test` | Mr. Benjamin Cohen |
| **Teacher** (Math 6) | `kim@noor-international.test` | Ms. Rachel Kim |
| **Teacher** (English 7) | `okonkwo@noor-international.test` | Mr. David Okonkwo |
| **Teacher** (Science 8) | `rodriguez@noor-international.test` | Ms. Elena Rodriguez |
| **Teacher** (Social Studies 7) | `tanaka@noor-international.test` | Mr. Hiroshi Tanaka |

### Courses & Classes

| Course | Code | Teacher | Classes |
|--------|------|---------|---------|
| Mathematics 6 | MATH6 | Ms. Rachel Kim | 6A (10 students) |
| English 7 | ENG7 | Mr. David Okonkwo | 7A (10 students) |
| Science 8 | SCI8 | Ms. Elena Rodriguez | 8A (10 students) |
| Social Studies 7 | SOC7 | Mr. Hiroshi Tanaka | 7B (10 students) |

### Student Accounts (40 total)

| # | Email | Full Name |
|---|-------|-----------|
| 1 | `student01@noor-international.test` | Aarav Sharma |
| 2 | `student02@noor-international.test` | Mei Lin |
| 3 | `student03@noor-international.test` | Diego Fernandez |
| 4 | `student04@noor-international.test` | Sofia Rossi |
| 5 | `student05@noor-international.test` | Kwame Asante |
| 6 | `student06@noor-international.test` | Yuki Sato |
| 7 | `student07@noor-international.test` | Anya Petrova |
| 8 | `student08@noor-international.test` | Lucas Müller |
| 9 | `student09@noor-international.test` | Priya Iyer |
| 10 | `student10@noor-international.test` | Tomas Novak |
| 11 | `student11@noor-international.test` | Sienna Walsh |
| 12 | `student12@noor-international.test` | Mateo García |
| 13 | `student13@noor-international.test` | Chioma Eze |
| 14 | `student14@noor-international.test` | Hiroto Yamamoto |
| 15 | `student15@noor-international.test` | Isla Campbell |
| 16 | `student16@noor-international.test` | Rafael Costa |
| 17 | `student17@noor-international.test` | Amara Singh |
| 18 | `student18@noor-international.test` | Felix Schmidt |
| 19 | `student19@noor-international.test` | Camila Vega |
| 20 | `student20@noor-international.test` | Theo Bennett |
| 21 | `student21@noor-international.test` | Nadia Volkov |
| 22 | `student22@noor-international.test` | Joaquin Reyes |
| 23 | `student23@noor-international.test` | Eden Cohen |
| 24 | `student24@noor-international.test` | Liang Chen |
| 25 | `student25@noor-international.test` | Maya Adler |
| 26 | `student26@noor-international.test` | Ravi Krishnan |
| 27 | `student27@noor-international.test` | Beatrice Lambert |
| 28 | `student28@noor-international.test` | Sebastian Pereira |
| 29 | `student29@noor-international.test` | Aaliyah Brooks |
| 30 | `student30@noor-international.test` | Nikhil Verma |
| 31 | `student31@noor-international.test` | Isabella Romano |
| 32 | `student32@noor-international.test` | Kenji Watanabe |
| 33 | `student33@noor-international.test` | Olivia Nguyen |
| 34 | `student34@noor-international.test` | Marcus Johansson |
| 35 | `student35@noor-international.test` | Layla Mansour |
| 36 | `student36@noor-international.test` | Ethan Park |
| 37 | `student37@noor-international.test` | Zara Khan |
| 38 | `student38@noor-international.test` | Henrik Larsen |
| 39 | `student39@noor-international.test` | Catalina Morales |
| 40 | `student40@noor-international.test` | Owen Fitzgerald |

### Parent Accounts (20 — linked to students 01–05, 11–15, 21–25, 31–35)

| Email | Linked Student |
|-------|---------------|
| `parent01@noor-international.test` | Aarav Sharma |
| `parent02@noor-international.test` | Mei Lin |
| `parent03@noor-international.test` | Diego Fernandez |
| `parent04@noor-international.test` | Sofia Rossi |
| `parent05@noor-international.test` | Kwame Asante |
| `parent11@noor-international.test` | Sienna Walsh |
| `parent12@noor-international.test` | Mateo García |
| `parent13@noor-international.test` | Chioma Eze |
| `parent14@noor-international.test` | Hiroto Yamamoto |
| `parent15@noor-international.test` | Isla Campbell |
| `parent21@noor-international.test` | Nadia Volkov |
| `parent22@noor-international.test` | Joaquin Reyes |
| `parent23@noor-international.test` | Eden Cohen |
| `parent24@noor-international.test` | Liang Chen |
| `parent25@noor-international.test` | Maya Adler |
| `parent31@noor-international.test` | Isabella Romano |
| `parent32@noor-international.test` | Kenji Watanabe |
| `parent33@noor-international.test` | Olivia Nguyen |
| `parent34@noor-international.test` | Marcus Johansson |
| `parent35@noor-international.test` | Layla Mansour |

---

## 📋 QA Testing Checklist — Manual Connectivity Verification

### Pre-Test Setup
- [ ] Open https://e-deviser.vercel.app in Chrome (desktop) + Safari (mobile)
- [ ] Clear browser cache and cookies
- [ ] Verify the login page renders (not blank)

---

### 1. Authentication Flow

| # | Test | Account | Expected Result | ✅/❌ |
|---|------|---------|-----------------|-------|
| 1.1 | Login as Admin | `principal@gulf-academy.test` | Redirects to `/admin/dashboard` |  |
| 1.2 | Login as Coordinator | `curriculum@gulf-academy.test` | Redirects to `/coordinator/dashboard` |  |
| 1.3 | Login as Teacher | `anderson@gulf-academy.test` | Redirects to `/teacher/dashboard` |  |
| 1.4 | Login as Student | `student01@gulf-academy.test` | Redirects to `/student/dashboard` |  |
| 1.5 | Login as Parent | `parent01@gulf-academy.test` | Redirects to `/parent/dashboard` |  |
| 1.6 | Wrong password | Any email + `wrong` | Shows "Invalid email or password" (generic) |  |
| 1.7 | Sign out | Any logged-in user | Returns to `/login`, cache cleared |  |
| 1.8 | Cross-institution isolation | Login as Gulf admin, try accessing Noor data | No Noor data visible |  |

---

### 2. Admin Dashboard (login as `principal@gulf-academy.test`)

| # | Test | Expected Result | ✅/❌ |
|---|------|-----------------|-------|
| 2.1 | Dashboard loads | KPI cards show: Total Users, Active Courses, Avg Attainment, At Risk |  |
| 2.2 | Welcome Hero | Shows "Good morning/afternoon/evening, Dr. Aisha Al-Mansoori" |  |
| 2.3 | Users list | Shows 51 users (Gulf Academy) with role badges |  |
| 2.4 | Programs list | Shows at least 1 program |  |
| 2.5 | Courses list | Shows Math 7, ELA 7, Science 7 |  |
| 2.6 | Audit Log | Shows recent actions (if any) |  |
| 2.7 | Empty state | Navigate to a list with no data → shows EmptyState component |  |
| 2.8 | Dark mode toggle | Profile dropdown → Theme → Dark → UI switches to dark |  |
| 2.9 | Language switch | Switch to Arabic → UI flips RTL, labels in Arabic |  |

---

### 3. Coordinator Dashboard (login as `curriculum@gulf-academy.test`)

| # | Test | Expected Result | ✅/❌ |
|---|------|-----------------|-------|
| 3.1 | Dashboard loads | Welcome hero + KPI cards |  |
| 3.2 | Programs visible | Can see programs for Gulf Academy |  |
| 3.3 | PLO list | Shows PLOs linked to the program |  |
| 3.4 | Curriculum Matrix | PLO × Course grid renders |  |
| 3.5 | CQI Action Plans | List renders (may be empty → EmptyState) |  |
| 3.6 | PLO → ILO mapping | Can view outcome mappings |  |

---

### 4. Teacher Dashboard (login as `anderson@gulf-academy.test`)

| # | Test | Expected Result | ✅/❌ |
|---|------|-----------------|-------|
| 4.1 | Dashboard loads | Welcome hero + course cards |  |
| 4.2 | Course visible | Mathematics 7 appears in course list |  |
| 4.3 | Assignments | Shows 4+ assignments for Math 7 |  |
| 4.4 | Grading queue | Shows submissions awaiting grading (or empty state) |  |
| 4.5 | CLOs | Shows CLOs for Math 7 with Bloom's badges |  |
| 4.6 | Grade a submission | Open a submission → grade → save → evidence created |  |
| 4.7 | Student list | Shows 10 enrolled students |  |

---

### 5. Student Dashboard (login as `student01@gulf-academy.test`)

| # | Test | Expected Result | ✅/❌ |
|---|------|-----------------|-------|
| 5.1 | Dashboard loads | Welcome hero with XP/Level/Streak chips |  |
| 5.2 | Courses visible | Shows enrolled courses |  |
| 5.3 | Assignments | Shows assignments with due dates |  |
| 5.4 | XP display | XP total matches, level badge shows |  |
| 5.5 | Streak counter | Shows current streak days |  |
| 5.6 | Leaderboard | Shows ranked students (anonymized for opted-out) |  |
| 5.7 | Badges | Shows earned badges with emojis |  |
| 5.8 | Habit heatmap | Shows daily habit tracking grid |  |
| 5.9 | Journal | Can view/create journal entries |  |
| 5.10 | Learning path | Assignments ordered by Bloom's level |  |
| 5.11 | Submit assignment | Can submit to an unlocked assignment |  |

---

### 6. Parent Dashboard (login as `parent01@gulf-academy.test`)

| # | Test | Expected Result | ✅/❌ |
|---|------|-----------------|-------|
| 6.1 | Dashboard loads | Welcome hero + linked student card |  |
| 6.2 | Linked student visible | Shows Yusuf Ahmadi as linked child |  |
| 6.3 | Child progress | Can view XP, attainment, recent activity |  |
| 6.4 | Notifications | Notification feed renders |  |
| 6.5 | No access to other students | Cannot see other students' data |  |

---

### 7. Cross-Role Data Flow (Critical Paths)

| # | Test | Steps | Expected Result | ✅/❌ |
|---|------|-------|-----------------|-------|
| 7.1 | Grade → XP | Teacher grades → Student XP increases by 15 | Check student XP before/after |  |
| 7.2 | Grade → Attainment | Teacher grades → CLO/PLO/ILO attainment updates | Check outcome_attainment table |  |
| 7.3 | Grade → Notification | Teacher grades → Student gets notification | Check notification bell |  |
| 7.4 | Grade → Parent sees | Teacher grades → Parent sees updated progress | Login as parent, check child |  |
| 7.5 | PLO → Teacher sees | Coordinator creates PLO → Teacher can map CLO to it | Check CLO mapping dialog |  |
| 7.6 | Bonus XP | Admin creates bonus event → Student gets multiplied XP | Create event, then submit |  |

---

### 8. Realtime & Notifications

| # | Test | Expected Result | ✅/❌ |
|---|------|-----------------|-------|
| 8.1 | Notification bell | Shows unread count badge |  |
| 8.2 | Bell popover | Click bell → shows notification list grouped by date |  |
| 8.3 | Mark as read | Open popover → notifications marked as read |  |
| 8.4 | Live update | Insert notification in another tab → badge increments |  |

---

### 9. Gamification Engine

| # | Test | Account | Expected Result | ✅/❌ |
|---|------|---------|-----------------|-------|
| 9.1 | XP total matches | `student01@gulf-academy.test` | XP display = SUM(xp_transactions) |  |
| 9.2 | Level correct | Any student | Level matches XP formula (50*N^1.5) |  |
| 9.3 | Streak display | Any student | Streak counter matches last_login_date chain |  |
| 9.4 | Badge display | High-perf student | Shows 5+ badges |  |
| 9.5 | Leaderboard privacy | Opted-out student | Name anonymized for peers |  |

---

### 10. OBE (Outcome-Based Education)

| # | Test | Expected Result | ✅/❌ |
|---|------|-----------------|-------|
| 10.1 | ILO → PLO → CLO chain | Admin can see ILOs, Coordinator PLOs, Teacher CLOs |  |
| 10.2 | Outcome mappings | Weights sum to 100% per child-to-parent |  |
| 10.3 | Attainment levels | Excellent ≥85%, Satisfactory 70-84%, Developing 50-69%, Not Yet <50% |  |
| 10.4 | Bloom's taxonomy | Each CLO has exactly one Bloom's level badge |  |
| 10.5 | Prerequisite gates | Locked assignments show lock icon when prereq not met |  |

---

### 11. UI Consistency

| # | Test | Expected Result | ✅/❌ |
|---|------|-----------------|-------|
| 11.1 | Dark mode | All surfaces use design tokens (no white-on-dark leaks) |  |
| 11.2 | RTL layout | Arabic mode → sidebar/header flip correctly |  |
| 11.3 | Gradient CTAs | Brand gradient buttons have white text in both themes |  |
| 11.4 | Empty states | Every list shows EmptyState when data is empty |  |
| 11.5 | Data tables | Headers always visible (not transparent) |  |
| 11.6 | Mobile responsive | Student dashboard works on 390×844 viewport |  |

---

### 12. Security Checks

| # | Test | Expected Result | ✅/❌ |
|---|------|-----------------|-------|
| 12.1 | RLS isolation | Student can't see other institution's data |  |
| 12.2 | Parent boundary | Unlinked parent can't access child data |  |
| 12.3 | Role escalation | Student can't access `/admin/*` routes |  |
| 12.4 | Append-only tables | Evidence, audit_logs, xp_transactions can't be deleted via UI |  |

---

### 13. Edge Functions (Backend Connectivity)

| # | Function | Trigger | Expected Result | ✅/❌ |
|---|----------|---------|-----------------|-------|
| 13.1 | `award-xp` | Student login/submission | XP transaction created |  |
| 13.2 | `process-streak` | Student daily login | Streak incremented |  |
| 13.3 | `check-badges` | After XP award | Badge awarded if conditions met |  |
| 13.4 | `chat-with-tutor` | Student opens AI tutor | Conversation created |  |
| 13.5 | `generate-quiz-questions` | Teacher creates quiz | AI questions generated |  |
| 13.6 | `send-email-notification` | Admin invites user | Email sent via Resend |  |
| 13.7 | `process-onboarding` | New student completes wizard | Profile updated |  |
| 13.8 | Attainment trigger | Grade inserted | Evidence + attainment cascade |  |
| 13.9 | Notification trigger | Grade released | Student notification created |  |

---

### 14. Noor International — Bilingual Test

| # | Test | Account | Expected Result | ✅/❌ |
|---|------|---------|-----------------|-------|
| 14.1 | Login | `principal@noor-international.test` | Dashboard loads |  |
| 14.2 | Switch to Arabic | Language toggle | Full RTL layout, Arabic labels |  |
| 14.3 | Student diversity | `student01@noor-international.test` | Aarav Sharma dashboard |  |
| 14.4 | 4 courses visible | Teacher `kim@noor-international.test` | Math 6 course |  |
| 14.5 | Different data | Compare Gulf vs Noor dashboards | Different KPI values |  |

---

## 🚀 Deployment Notes

### Edge Functions
The following edge functions have security fixes in the repo that need deployment:
```bash
npx supabase functions deploy award-xp
npx supabase functions deploy check-badges
npx supabase functions deploy process-streak
npx supabase functions deploy send-email-notification
npx supabase functions deploy calculate-attainment-rollup
npx supabase functions deploy ai-at-risk-prediction
npx supabase functions deploy ai-module-suggestion
npx supabase functions deploy check-login-rate
npx supabase functions deploy compute-at-risk-signals
npx supabase functions deploy compute-habit-correlations
npx supabase functions deploy notification-digest
npx supabase functions deploy streak-risk-cron
npx supabase functions deploy update-question-analytics
npx supabase functions deploy weekly-summary-cron
```

### Vercel Environment Variables Required
- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — Supabase anon/publishable key
- `VITE_SENTRY_DSN` — (optional) Sentry error tracking

---

## 📊 Data Verification Summary

| Metric | Gulf Academy | Noor International | Expected |
|--------|-------------|-------------------|----------|
| Admins | 1 | 1 | ✅ |
| Coordinators | 2 | 3 | ✅ |
| Teachers | 3 | 4 | ✅ |
| Students | 30 | 40 | ✅ |
| Parents | 15 | 20 | ✅ |
| **Total** | **51** | **68** | ✅ |
| Courses | 3 | 4 | ✅ |
| Assignments | 4 per course | 4 per course | ✅ |
| Attendance data | 6 weeks | 6 weeks | ✅ |
| At-risk students | ~3 per class | ~3 per class | ✅ |

---

*End of QA Testing Guide*
