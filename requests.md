# Helper Requests / One-Liners

## 1. Function body extractor (moomoo.js → clipboard)
```powershell
function Extract-Func($name) {
  $c = Get-Content moomoo.js -Raw; $lines = $c -split "`n"
  $re = "function $name\b"
  for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match $re) {
      $brace = 0; $start = $i
      for ($j = $i; $j -lt $lines.Count; $j++) {
        $brace += ([regex]::Matches($lines[$j], '\{')).Count
        $brace -= ([regex]::Matches($lines[$j], '\}')).Count
        if ($brace -eq 0 -and $j -gt $i) {
          ($lines[$start..$j] -join "`n") | Set-Clipboard
          Write-Host "$name L$($start+1)-L$($j+1) ($($j-$start+1) lines) -> clipboard"
          return
        }
      }
    }
  }
}
```

## 2. Unported function checker
```powershell
$need = @('healer','healthBased','notif2','addDeadPlayer','getAttacker','soldierMult','HKH','addMenuChText','getAttackDir')
$nozo = Get-Content project-nozo-single.user.js -Raw
$need | ? { $nozo -notmatch "\b$_\s*[=(:{]" } | % { "MISSING: $_" }
```

## 3. Cross-reference scanner (find all call sites in both files)
```powershell
function Find-Refs($func) {
  Write-Host "=== moomoo.js ===" -f Yellow
  Select-String moomoo.js -Pattern "\b$func\b" | select LineNumber,Line
  Write-Host "=== nozo-single ===" -f Yellow
  Select-String project-nozo-single.user.js -Pattern "\b$func\b" | select LineNumber,Line
}
```

## 4. Quick line count
```powershell
(Get-Content project-nozo-single.user.js).Count
```

## 5. Syntax check
```powershell
node --check .\project-nozo-single.user.js
```
