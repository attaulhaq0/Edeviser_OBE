$hooksDir = 'f:\Edeviser-Kiro\src\hooks'
$exported = @{}
Get-ChildItem "$hooksDir\*.ts","$hooksDir\*.tsx" -ErrorAction SilentlyContinue | ForEach-Object {
  $c = Get-Content $_.FullName -Raw
  foreach ($m in [regex]::Matches($c, 'export\s+(?:async\s+)?(?:function|const)\s+(use[A-Z][A-Za-z0-9]+)')) { $exported[$m.Groups[1].Value] = $true }
}
Write-Output '===== remaining questionable hooks =====' 
foreach ($h in @('useCourseMaterials','useCourseModules','useStudentContent','useAuditLogs','useImpersonation','useConnectedIntegrations','useTeachingImpact','useProfileCompleteness','useTutorAutonomy','useKnowledgeQuestAdmin','useEmailPreferences','useNotificationPreferences','useAvatarUpload','useInstitutionSettings','useAdminDashboard','useDepartments','useCoordinatorProfileSettings','useCoordinatorProfileStats','useLevel','useStreak','useXP','useTieredBadges','useEquippedItems','useJournal')) {
  $status = if ($exported.ContainsKey($h)) { 'EXISTS' } else { 'MISSING' }
  Write-Output ("{0,-34} {1}" -f $h, $status)
}

# ---- TABLE cross-check: live tables vs table-name tokens referenced in prototype comments ----
$live = @('institutions','profiles','programs','courses','student_courses','learning_outcomes','outcome_mappings','rubrics','rubric_criteria','assignments','submissions','grades','evidence','outcome_attainment','student_gamification','badges','xp_transactions','journal_entries','audit_logs','notifications','habit_tracking','xp_events','learning_path_nodes','student_activity_log','ai_feedback','semesters','departments','course_sections','surveys','survey_questions','survey_responses','cqi_action_plans','institution_settings','program_accreditations','announcements','course_modules','course_materials','discussion_threads','discussion_replies','class_sessions','attendance_records','quizzes','quiz_questions','quiz_attempts','grade_categories','timetable_slots','academic_calendar_events','parent_student_links','fee_structures','fee_payments','onboarding_questions','onboarding_responses','onboarding_progress','student_profiles','baseline_attainment','baseline_test_config','micro_assessment_schedule','starter_week_sessions','goal_suggestions','wellness_habit_logs','student_wellness_preferences','mastery_recovery_pathways','question_bank','question_analytics','quiz_generation_logs','verified_explanations','badge_spotlight_schedule','teams','team_members','social_challenges','challenge_progress','graduate_attributes','graduate_attribute_mappings','competency_frameworks','competency_items','competency_outcome_mappings','sub_clos','study_sessions','planner_tasks','weekly_goals','session_evidence','habit_correlations','session_reflections','marketplace_items','xp_purchases','student_equipped_items','sale_events','sale_event_items','student_active_boosts','deadline_extensions','student_content','knowledge_quests','student_quest_progress','class_donations','class_donation_contributions','badge_definitions','team_invitations','team_badges','peer_teaching_moments','teaching_moment_views','teaching_moment_ratings','team_health_snapshots','replacement_votes','session_intents','flow_check_ins','review_schedules','reflection_digests','reflection_quality_scores','login_attempts','blooms_progression','challenge_participants','course_material_embeddings','tutor_conversations','tutor_messages','tutor_usage_limits','tutor_llm_logs','tutor_plan_updates','teacher_handoff_requests','habit_logs','audit_runs','audit_findings','invitations','rate_limit_events','blocked_ips','student_habit_levels','student_habit_level_history','team_gamification','student_badges','quiz_clos','announcement_reads','announcement_attachments','coordinator_ai_insights','outcome_attainment_snapshots','accreditation_approvals','connected_integrations')
$liveSet = @{}; foreach ($t in $live) { $liveSet[$t] = $true }

# Gather table-like tokens from prototype comment lines that mention table/maps
$refTables = @{}
Get-ChildItem 'f:\Edeviser-Kiro\prototype\*.html' | Where-Object { $_.Name -notlike '_*' } | ForEach-Object {
  foreach ($line in Get-Content $_.FullName) {
    if ($line -match 'maps to|table|supabase|RPC|\.from\(') {
      foreach ($m in [regex]::Matches($line, '\b([a-z][a-z0-9]+_[a-z0-9_]+)\b')) {
        $tok = $m.Groups[1].Value
        if (-not $refTables.ContainsKey($tok)) { $refTables[$tok] = $_.Name }
      }
    }
  }
}
Write-Output ''
Write-Output '===== table-like tokens referenced in prototype that are NOT live tables ====='
$notLive = $refTables.Keys | Where-Object { -not $liveSet.ContainsKey($_) } | Sort-Object
Write-Output ($notLive -join ', ')
