# Backend Coverage Gaps — every DB/hook/edge-function vs. prototype UI

Authoritative audit of the Edeviser backend against the `prototype/` UI, so every
backend capability gets a prototype screen. Ground truth gathered via `read_file`
+ PowerShell `Select-String` (the workspace `grep_search` returns false negatives).

**Backend size:** 131 tables · 200+ hooks (`src/hooks`) · 55+ edge functions
(`supabase/functions`).

## In-game currency — RESOLVED (no separate currency)

There is **no separate coins/gems/wallet currency**. **XP is the spendable
currency.** `get_xp_balance` RPC returns `GREATEST(0, earned − spent)` where earned
= `xp_transactions` and spent = `xp_purchases`. The header "💎 750" is the spendable
XP balance. `student_gamification` holds `xp_total`, `level`,
`streak_freezes_available`, `leaderboard_anonymous`. Lifetime XP drives level; the
spendable balance drives the marketplace. (Marketplace prototype now models this.)

## Legend

- ✅ built / covered in prototype (incl. this session's redesigns)
- 🆕 built this session as a NEW screen
- ❌ MISSING — backend exists, no prototype screen yet
- Each row lists the backing tables / hooks / edge functions.

---

## Student

| Feature | Backend | Status | Prototype |
|---|---|---|---|
| Dashboard, Learn, Path, Course, Lesson, Assignment/Quiz | useStudentDashboardAggregate, useLearningPath, useCourses, useAssignments, useQuizzes | ✅ | dashboard/learn/path/course/lesson/assignment |
| AI Tutor | useTutorConversations/Messages, chat-with-tutor | ✅ | tutor |
| Progress / attainment | useStudentProgress, outcome_attainment | ✅ | progress |
| Journal | useJournal, journal_entries | ✅ | journal |
| Calendar / timetable / tasks | useCalendarEvents, useTimetableSlots, usePlannerTasks | ✅ | calendar (redesigned) |
| Marketplace / wallet / boosts / inventory | useMarketplace, usePurchase, useInventory, useActiveBoosts, useEquippedItems, class_donations | ✅ | marketplace (redesigned) |
| Leaderboard / leagues / most-improved | useLeaderboard, useLeagueLeaderboard, useMostImproved | ✅ | leaderboard (redesigned) |
| Team / peer teaching | useTeams, useTeamMembers, usePeerTeaching, useTeamHealth | ✅ | team (redesigned) |
| Daily review (spaced repetition) | useReviewSchedule, review_schedules, quiz_attempts(practice) | ✅ | review (redesigned) |
| **Wellness & Habits** | habit_tracking, habit_logs, wellness_habit_logs, student_wellness_preferences, useWellnessHabits, useWellnessGoals, useHabitAnalytics, useHabitCorrelations, useFlowCheckIns, useStudentHabitLevel, flow_check_ins, compute-habit-correlations | 🆕 | **wellness.html** |
| **Focus / Study sessions** | study_sessions, session_intents, session_reflections, useFocusTimer, useStudySessions, useSessionReflections, useStudyTimeAnalytics | 🆕 | **focus.html** |
| **Knowledge Quests + create content** | knowledge_quests, student_quest_progress, student_content, useKnowledgeQuests | 🆕 | **quests.html** |
| Portfolio | usePortfolio | ❌ | — (add `portfolio.html`) |
| Fees / payments / receipt | fee_payments, fee_structures, useFees, generate-fee-receipt | ❌ | — (add `fees.html`, shared w/ parent) |
| Surveys (respond) | surveys, survey_questions, survey_responses, useSurveys | ❌ | — (add `surveys.html`) |
| Discussions | discussion_threads, discussion_replies, useDiscussions | ❌ | — (add `discussions.html`, shared) |
| Transcript | useTranscript, generate-transcript | ❌ | — (section in progress or `transcript.html`) |
| Weekly goals / goal suggestions | weekly_goals, goal_suggestions, useWeeklyGoals, suggest-goals | ❌ | — (section on wellness/dashboard) |

## Teacher

| Feature | Backend | Status | Prototype |
|---|---|---|---|
| Dashboard, curriculum (CLOs), grading, students, profile | useTeacherDashboardAggregate, useCLOs, useGrades, useSubmissions | ✅ | teacher-dashboard/curriculum/grading/students/profile |
| At-risk, teaching impact (dashboard sections) | useAtRiskPredictions, useTeachingImpact | ✅ | teacher-dashboard (added earlier) |
| **Question bank / quiz builder** | question_bank, quiz_questions, useQuestionBank, useGenerateQuestions, generate-quiz-questions, useReviewQueue (approve AI questions) | 🆕 | **teacher-questions.html** |
| **Gradebook (matrix)** | useGradebook, grades, grade_categories | 🆕 | **teacher-gradebook.html** |
| **Attendance** | class_sessions, attendance_records, useAttendance | 🆕 | **teacher-attendance.html** |
| Rubric builder | rubrics, rubric_criteria, useRubrics | ❌ | — (add `teacher-rubrics.html` or grading section) |
| Course materials upload / embeddings | course_materials, course_material_embeddings, embed-course-material | ❌ | — (add `teacher-materials.html`) |
| Tutor handoffs | teacher_handoff_requests, useTeacherHandoffs | ❌ | — (add `teacher-handoffs.html`) |
| Announcements (author) | announcements, useAnnouncements | ❌ | — (shared `announcements.html`) |
| Discussions (moderate) | discussion_threads/replies | ❌ | — (shared `discussions.html`) |

## Coordinator

| Feature | Backend | Status | Prototype |
|---|---|---|---|
| Dashboard, curriculum matrix, outcome chain, accreditation, profile | useCoordinatorDashboardAggregate, useCurriculumMatrix, useOutcomeChain, useCoordinatorAccreditation | ✅ | coordinator-dashboard/curriculum/outcomes/accreditation/profile |
| **CQI action plans** | cqi_action_plans, useCQIPlans, cqi-review-reminder | 🆕 | **coordinator-cqi.html** |
| Course file generation | useCourseFile, generate-course-file | ❌ | — (add `coordinator-course-file.html`) |
| Team health report / formation | useTeamHealthReport, useTeamFormation, team_health_snapshots | ❌ | — (add `coordinator-teams.html`) |
| Competency frameworks | competency_frameworks, competency_items, competency_outcome_mappings, useCompetencyFrameworks, import-competency-csv | ❌ | — (add `coordinator-competencies.html`) |
| Graduate attributes | graduate_attributes, graduate_attribute_mappings, useGraduateAttributes | ❌ | — (section in outcomes) |
| Attainment trends (dashboard) | useCoordinatorAttainmentTrends | ❌ (route only) | — (add dashboard section) |

## Admin

| Feature | Backend | Status | Prototype |
|---|---|---|---|
| Dashboard, analytics, governance, users, profile | useAdminDashboardAggregate, useAIPerformance, useAdminPLOHeatmap, useUsers | ✅ | admin-dashboard/analytics/governance/users/profile |
| **Marketplace management** | useMarketplaceAdmin, marketplace_items, sale_events, useSaleEvents, useKnowledgeQuestAdmin, useMarketplaceAnalytics | 🆕 | **admin-marketplace.html** |
| Bonus XP events | xp_events, useBonusEvents | ❌ | — (section in admin-marketplace) |
| XP economy health / dynamic pricing | useXPEconomist, useDynamicPricing, useWellnessXpConfig | ❌ | — (section in admin-marketplace) |
| Structure mgmt (departments/programs/courses/semesters) | useDepartments, usePrograms, useCourses, useSemesters, useCourseSections | ❌ | — (add `admin-structure.html`) |
| Bulk import / invitations | useBulkImport, useDataImport, useInviteUsers, bulk-import-users, bulk-data-import | ❌ | — (add `admin-import.html`) |
| Badge definitions | badge_definitions, useTieredBadges, badge_spotlight_schedule, useBadgeSpotlight | ❌ | — (add `admin-badges.html`) |
| Security (IP/rate-limit/login) | blocked_ips, rate_limit_events, login_attempts | ❌ | — (add `admin-security.html`) |
| Fees management | fee_structures, fee_payments, useFees | ❌ | — (add `admin-fees.html`) |
| Audit logs (full viewer) | audit_logs, useAuditLogs | ❌ (partial in governance) | — (section/screen) |

## Parent

| Feature | Backend | Status | Prototype |
|---|---|---|---|
| Dashboard, progress, support, profile | useParentDashboardAggregate, parent_student_links | ✅ | parent-dashboard/progress/support/profile |
| Fees / payments | fee_payments, generate-fee-receipt | ❌ | — (shared `fees.html`) |
| Growth reports (digest) | reflection_digests, generate-reflection-digest | ❌ | — (section in parent-progress) |
| Announcements from school | announcements | ❌ | — (shared `announcements.html`) |
| Attendance view | attendance_records | ❌ | — (section in parent-progress) |

## Cross-cutting (all/most roles)

| Feature | Backend | Status | Prototype |
|---|---|---|---|
| **Announcements** | announcements, announcement_reads, announcement_attachments, useAnnouncements, fan_out_announcement_notifications | 🆕 | **announcements.html** (role-aware) |
| Discussions | discussion_threads, discussion_replies, useDiscussions | ❌ | — (add `discussions.html`) |
| Surveys | surveys, survey_questions, survey_responses | ❌ | — (add `surveys.html`) |
| Notifications feed | notifications, useNotifications, notification-digest | ❌ (bell only) | — (add `notifications.html`) |

---

## Build priority this session (task 7)

Built now (🆕): `wellness.html` (student), `focus.html` (student), `quests.html`
(student), `teacher-questions.html`, `teacher-gradebook.html`,
`teacher-attendance.html`, `coordinator-cqi.html`, `admin-marketplace.html`,
`announcements.html` (role-aware, cross-cutting).

Remaining ❌ rows above are documented for a follow-up batch (portfolio, fees,
surveys, discussions, transcript, teacher rubrics/materials/handoffs, coordinator
course-file/teams/competencies, admin structure/import/badges/security/fees,
notifications feed). Each already has confirmed backend; none require backend work
to prototype — only presentation.
