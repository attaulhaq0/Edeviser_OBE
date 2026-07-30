$pages = Get-ChildItem 'f:\Edeviser-Kiro\prototype\*.html' | Where-Object { $_.Name -notlike '_*' }
$withG = @()
foreach ($p in $pages) {
  $c = [IO.File]::ReadAllText($p.FullName)
  $n = ([regex]::Matches($c, 'BACKEND GROUNDING')).Count
  if ($n -gt 0) { $withG += ("{0} (x{1})" -f $p.Name, $n) }
  if ($n -gt 1) { Write-Output ("WARNING duplicate grounding in " + $p.Name) }
}
Write-Output ("pages with BACKEND GROUNDING = " + $withG.Count)
Write-Output ($withG -join ', ')
# sanity: ensure no file got a stray/broken comment (unbalanced <!-- -->)
foreach ($p in $pages) {
  $c = [IO.File]::ReadAllText($p.FullName)
  $open = ([regex]::Matches($c, '<!--')).Count
  $close = ([regex]::Matches($c, '-->')).Count
  if ($open -ne $close) { Write-Output ("COMMENT IMBALANCE in {0}: open={1} close={2}" -f $p.Name, $open, $close) }
}
Write-Output 'comment-balance check done'
