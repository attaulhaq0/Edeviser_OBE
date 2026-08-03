$proto = 'f:\Edeviser-Kiro\prototype'
$hooksDir = 'f:\Edeviser-Kiro\src\hooks'

Write-Output '===== PROTOTYPE PAGES (excluding _showcase and temp) ====='
$pages = Get-ChildItem "$proto\*.html" | Where-Object { $_.Name -notlike '_*' } | Sort-Object Name
Write-Output ("count = " + $pages.Count)
Write-Output ($pages.Name -join ', ')

Write-Output ''
Write-Output '===== src/hooks FILES ====='
if (Test-Path $hooksDir) {
  $hooks = Get-ChildItem "$hooksDir\*.ts","$hooksDir\*.tsx" -ErrorAction SilentlyContinue | Sort-Object Name
  Write-Output ("count = " + $hooks.Count)
  Write-Output ($hooks.BaseName -join ', ')
} else {
  Write-Output 'HOOKS DIR NOT FOUND'
}
