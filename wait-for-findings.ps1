param(
    [string]$Path = ".\findings.md",
    [string]$FileName,
    [string]$LogPath,
    [switch]$StopOnLimit,
    [int]$TimeoutSeconds = 1800,
    [int]$PollMilliseconds = 1000
)

$rawArgs = $MyInvocation.UnboundArguments
for ($i = 0; $i -lt $rawArgs.Count; $i++) {
    if ($rawArgs[$i] -eq "--fileName" -and ($i + 1) -lt $rawArgs.Count) {
        $FileName = $rawArgs[$i + 1]
        $i++
        continue
    }
    if ($rawArgs[$i] -eq "--path" -and ($i + 1) -lt $rawArgs.Count) {
        $Path = $rawArgs[$i + 1]
        $i++
        continue
    }
    if ($rawArgs[$i] -eq "--timeoutSeconds" -and ($i + 1) -lt $rawArgs.Count) {
        $TimeoutSeconds = [int]$rawArgs[$i + 1]
        $i++
        continue
    }
    if ($rawArgs[$i] -eq "--logPath" -and ($i + 1) -lt $rawArgs.Count) {
        $LogPath = $rawArgs[$i + 1]
        $i++
        continue
    }
    if ($rawArgs[$i] -eq "--stopOnLimit") {
        $StopOnLimit = $true
        continue
    }
    if ($rawArgs[$i] -eq "--pollMilliseconds" -and ($i + 1) -lt $rawArgs.Count) {
        $PollMilliseconds = [int]$rawArgs[$i + 1]
        $i++
        continue
    }
}

if ($FileName) {
    $Path = $FileName
}

$start = Get-Date
$parentPath = Split-Path -Parent $Path
$resolvedParent = $null
if ($parentPath) {
    $resolvedParent = Resolve-Path -LiteralPath $parentPath -ErrorAction SilentlyContinue
}

if (-not $resolvedParent) {
    $resolvedParent = Resolve-Path -LiteralPath "."
}

Write-Host "Waiting for $Path ..."

while ($true) {
    if (Test-Path -LiteralPath $Path) {
        $item = Get-Item -LiteralPath $Path
        Write-Host "Found $($item.FullName)"
        exit 0
    }

    if ($StopOnLimit -and $LogPath -and (Test-Path -LiteralPath $LogPath)) {
        $logText = Get-Content -LiteralPath $LogPath -Raw -ErrorAction SilentlyContinue
        if ($logText -match "You've hit your limit") {
            $now = Get-Date
            $timeMatch = [regex]::Match($logText, "resets\s+([0-9]{1,2}:[0-9]{2}\s*(?:am|pm))", [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
            if ($timeMatch.Success) {
                $timeStr = $timeMatch.Groups[1].Value.Trim()
                try {
                    $today = $now.ToString("yyyy-MM-dd")
                    $resetAt = [datetime]::Parse("$today $timeStr")
                    if ($resetAt -le $now) {
                        $resetAt = $resetAt.AddDays(1)
                    }
                    $remaining = $resetAt - $now
                    $hh = [int][Math]::Floor($remaining.TotalHours)
                    $mm = [int]$remaining.Minutes
                    $ss = [int]$remaining.Seconds
                    Write-Error "Claude usage limit detected. Reset at $($resetAt.ToString('yyyy-MM-dd HH:mm:ss')). Remaining ${hh}h ${mm}m ${ss}s."
                } catch {
                    Write-Error "Claude usage limit detected in log, but reset time parse failed: '$timeStr'."
                }
            } else {
                Write-Error "Claude usage limit detected in log."
            }
            exit 2
        }
    }

    $elapsed = ((Get-Date) - $start).TotalSeconds
    if ($TimeoutSeconds -gt 0 -and $elapsed -ge $TimeoutSeconds) {
        Write-Error "Timed out waiting for $Path after $TimeoutSeconds seconds."
        exit 1
    }

    Start-Sleep -Milliseconds $PollMilliseconds
}
