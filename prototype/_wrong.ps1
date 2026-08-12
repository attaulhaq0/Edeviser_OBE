$targets = @{
  'admin-profile.html'       = 'useInstitutionOverview'
  'coordinator-profile.html' = 'useCoordinatorProfile\b'
  'journal.html'             = 'usePrompt'
  'profile.html'             = 'useStudentGamification'
  'teacher-profile.html'     = 'useTeacherProfile'
}
foreach ($k in $targets.Keys) {
  Write-Output ("===== $k  ::  " + $targets[$k] + " =====")
  $hits = Select-String -Path "f:\Edeviser-Kiro\prototype\$k" -Pattern $targets[$k]
  foreach ($h in $hits) {
    Write-Output ("  L{0}: {1}" -f $h.LineNumber, $h.Line.Trim())
  }
}
