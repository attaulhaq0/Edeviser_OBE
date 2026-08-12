$hooksDir = 'f:\Edeviser-Kiro\src\hooks'
$realHooks = (Get-ChildItem "$hooksDir\*.ts","$hooksDir\*.tsx" -ErrorAction SilentlyContinue).BaseName
$realSet = @{}; foreach ($h in $realHooks) { $realSet[$h] = $true }
# React built-ins to ignore
$builtin = @{ 'useState'=1;'useEffect'=1;'useRef'=1;'useMemo'=1;'useCallback'=1;'useContext'=1;'useReducer'=1;'useLayoutEffect'=1;'useNavigate'=1;'useParams'=1;'useQuery'=1;'useMutation'=1;'useQueryClient'=1;'useSearchParams'=1;'useForm'=1;'useTranslation'=1 }

$pages = Get-ChildItem 'f:\Edeviser-Kiro\prototype\*.html' | Where-Object { $_.Name -notlike '_*' -and $_.Name -notlike '*variations*' } | Sort-Object Name

$ungrounded = @()
Write-Output '===== PER-PAGE HOOK REFERENCES (and any that DO NOT EXIST) ====='
foreach ($p in $pages) {
  $c = Get-Content $p.FullName -Raw
  $refs = ([regex]::Matches($c, 'use[A-Z][A-Za-z0-9]+')).Value | Sort-Object -Unique
  $refs = $refs | Where-Object { -not $builtin.ContainsKey($_) }
  if (-not $refs -or $refs.Count -eq 0) { $ungrounded += $p.Name; continue }
  $missing = $refs | Where-Object { -not $realSet.ContainsKey($_) }
  $line = ("{0,-30} [{1} refs]" -f $p.Name, $refs.Count)
  if ($missing) { $line += "  >>> NONEXISTENT: " + ($missing -join ', ') }
  Write-Output $line
}
Write-Output ''
Write-Output '===== PAGES WITH NO HOOK GROUNDING (ungrounded) ====='
Write-Output ($ungrounded -join ', ')
