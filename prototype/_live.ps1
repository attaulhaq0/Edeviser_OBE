$base = 'https://prototype-one-virid.vercel.app'
function Chk($path, $must, $mustNot) {
  try {
    $r = Invoke-WebRequest -Uri "$base/$path" -UseBasicParsing -TimeoutSec 15
    $h = foreach ($p in $must) { if ($r.Content -match [regex]::Escape($p)) { 'OK' } else { "MISS:$p" } }
    $n = foreach ($p in $mustNot) { if ($p -and ($r.Content -match [regex]::Escape($p))) { "STILL:$p" } else { 'gone' } }
    Write-Output ("{0,-26} {1}  have[{2}] not[{3}]" -f $path, $r.StatusCode, ($h -join ','), ($n -join ','))
  } catch { Write-Output ("{0,-26} ERR {1}" -f $path, $_.Exception.Message) }
}
Chk 'profile.html'          @('useLevel / useStreak')       @('useStudentGamification (')
Chk 'admin-profile.html'    @('useAdminDashboardAggregate') @('useInstitutionOverview')
Chk 'coordinator-profile.html' @('useCoordinatorProfileSettings') @()
Chk 'teacher-profile.html'  @('useTeachingImpact / useProfileCompleteness') @()
Chk 'dashboard.html'        @('BACKEND GROUNDING','useStudentDashboardAggregate') @()
Chk 'tutor.html'            @('BACKEND GROUNDING','tutor_conversations') @()
Chk 'admin-security.html'   @('BACKEND GROUNDING','blocked_ips') @()
