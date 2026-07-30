# Insert an accurate BACKEND GROUNDING comment after the .page-content opener in
# core pages that currently lack any hook grounding. Idempotent + encoding-safe.
$map = [ordered]@{
 'dashboard.html'                = 'hooks: useStudentDashboardAggregate, useTodayView, useStreak, useLevel, useHeatmapData, useAnnouncements | tables: student_gamification, student_activity_log, assignments, announcements'
 'learn.html'                    = 'hooks: useStudentCourses, useAssignments, useCourses | tables: student_courses, assignments, courses'
 'course.html'                   = 'hooks: useCourses, useCourseModules, useAssignments, useCLOProgress | tables: courses, course_modules, assignments, learning_outcomes'
 'lesson.html'                   = 'hooks: useLearningPath, useSessionCompletion | tables: learning_path_nodes, study_sessions, evidence'
 'path.html'                     = 'hooks: useLearningPath, useBloomsProgression | tables: learning_path_nodes, blooms_progression, learning_outcomes'
 'progress.html'                 = 'hooks: useStudentProgress, useCLOProgress, useOutcomeChain | tables: outcome_attainment, evidence, learning_outcomes'
 'review.html'                   = 'hooks: useReviewQueue, useReviewSchedule | tables: review_schedules, evidence, micro_assessment_schedule'
 'tutor.html'                    = 'hooks: useTutorConversations, useTutorMessages, useTutorUsage, useTutorAutonomy | tables: tutor_conversations, tutor_messages, tutor_usage_limits'
 'marketplace.html'              = 'hooks: useMarketplace, useInventory, usePurchase, useXPBalance | tables: marketplace_items, xp_purchases, student_equipped_items, student_gamification'
 'learning-profile.html'         = 'hooks: useOnboarding, useOnboardingResponses, useStudentProfile | tables: onboarding_responses, student_profiles'
 'assignment.html'               = 'hooks: useAssignments, useSubmissions, useRubrics | tables: assignments, submissions, grades, rubrics, rubric_criteria'
 'teacher-grading.html'          = 'hooks: useGradingStats, useGrades, useAIFeedbackDraft | tables: submissions, grades, evidence, ai_feedback'
 'teacher-students.html'         = 'hooks: useTeacherDashboardAggregate, useAtRiskPredictions | tables: student_courses, outcome_attainment, submissions'
 'teacher-curriculum.html'       = 'hooks: useCLOs, useCurriculumMatrix, useCourseModules | tables: learning_outcomes, outcome_mappings, course_modules'
 'teacher-materials.html'        = 'hooks: useCourseMaterials, useCourseModules, useStudentContent | tables: course_materials, course_modules, course_material_embeddings'
 'coordinator-outcomes.html'     = 'hooks: useCoordinatorOutcomeAttainment, useCoordinatorAttainmentTrends | tables: outcome_attainment, outcome_attainment_snapshots, learning_outcomes'
 'coordinator-curriculum.html'   = 'hooks: useCurriculumMatrix, useOutcomeChain | tables: outcome_mappings, learning_outcomes, courses'
 'coordinator-accreditation.html'= 'hooks: useCoordinatorAccreditation, useAccreditationReport | tables: program_accreditations, accreditation_approvals, graduate_attributes'
 'admin-dashboard.html'          = 'hooks: useAdminDashboardAggregate | tables: profiles, courses, programs, outcome_attainment'
 'admin-governance.html'         = 'hooks: useAISuggestions, useAIPerformance, useTutorAutonomy | tables: tutor_llm_logs, ai_feedback, audit_logs'
 'admin-security.html'           = 'hooks: useAuditLogs, useImpersonation | tables: audit_logs, login_attempts, blocked_ips, rate_limit_events'
 'parent-dashboard.html'         = 'hooks: useParentDashboardAggregate | tables: parent_student_links, student_gamification, outcome_attainment'
 'parent-progress.html'          = 'hooks: useParentDashboard, useStudentProgress | tables: outcome_attainment, evidence, habit_tracking'
 'parent-support.html'           = 'hooks: useParentDashboard, useNotifications | tables: notifications, announcements'
}
$done = 0; $skipped = 0; $noanchor = 0
foreach ($name in $map.Keys) {
  $path = "f:\Edeviser-Kiro\prototype\$name"
  if (!(Test-Path $path)) { Write-Output ("MISSING FILE: $name"); continue }
  $txt = [IO.File]::ReadAllText($path)
  if ($txt -match 'BACKEND GROUNDING') { $skipped++; continue }
  $i = $txt.IndexOf('class="page-content')
  if ($i -lt 0) { Write-Output ("NO page-content anchor: $name"); $noanchor++; continue }
  $nl = $txt.IndexOf("`n", $i)
  if ($nl -lt 0) { Write-Output ("no newline after anchor: $name"); $noanchor++; continue }
  $comment = "  <!-- BACKEND GROUNDING · " + $map[$name] + " -->`r`n"
  $txt = $txt.Insert($nl + 1, $comment)
  [IO.File]::WriteAllText($path, $txt, (New-Object System.Text.UTF8Encoding($false)))
  $done++
}
Write-Output ("grounded={0}  already-had={1}  no-anchor={2}" -f $done, $skipped, $noanchor)
