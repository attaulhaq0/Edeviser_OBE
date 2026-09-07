$ErrorActionPreference = 'Continue'
$lines = Get-Content "$env:TEMP\rls2.txt"
$errs = @()
foreach ($l in $lines) {
  if ($l -match '##\[error\]') {
    $errs += ($l -replace '.*##\[error\]', '[ERR] ').Trim()
  }
  if ($l -match 'not ok \d+') {
    $errs += ('[NOT-OK] ' + $l.Trim())
  }
}
$errs | Select-Object -Last 10 | Set-Content -Path "F:\Edeviser-Kiro\zz_rls_errors.txt" -Encoding UTF8
Write-Output "captured $($errs.Count) error lines"