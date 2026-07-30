$hooksDir = 'f:\Edeviser-Kiro\src\hooks'
# Collect every EXPORTED hook symbol (named exports) across all hook files — the true source of truth.
$exported = @{}
Get-ChildItem "$hooksDir\*.ts","$hooksDir\*.tsx" -ErrorAction SilentlyContinue | ForEach-Object {
  $c = Get-Content $_.FullName -Raw
  foreach ($m in [regex]::Matches($c, 'export\s+(?:async\s+)?(?:function|const)\s+(use[A-Z][A-Za-z0-9]+)')) {
    $exported[$m.Groups[1].Value] = $true
  }
}
Write-Output ("total exported hook symbols = " + $exported.Count)

# Now re-check the previously-flagged 'nonexistent' references against the TRUE export set.
$check = @('useBadgeSpotlightSchedule','useUpdateBadgeSpotlightSchedule','useCreateFeeStructure','useFeeStructures','useRecordPayment',
  'useInstitutionOverview','useCalendarEvents','useTimetableSlots','useCoordinatorProfile','useCreateReply','useCreateThread',
  'useDiscussionThreads','useMarkAnswer','useTogglePinThread','useGenerateFeeReceipt','useStudentFees','usePrompt','useMyRank',
  'useStudentPercentileBand','useStudentKPIs','useStudentGamification','useHasRespondedToSurvey','useSubmitSurveyResponse',
  'useSurveyQuestions','useRespondToHandoff','useTeacherProfile','useCopyRubric','useCreateRubric','useRubric','useRubricTemplates',
  'useUpdateRubric','useGenerateTranscript')
Write-Output ''
Write-Output '===== re-check flagged refs against TRUE exported symbols ====='
foreach ($h in $check) {
  $status = if ($exported.ContainsKey($h)) { 'EXISTS (named export)' } else { 'TRULY MISSING' }
  Write-Output ("{0,-34} {1}" -f $h, $status)
}
