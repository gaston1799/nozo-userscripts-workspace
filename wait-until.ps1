param(
    [string]$Until,
    [int]$Minutes = -1,
    [string]$Run,
    [int]$PollSeconds = 15,
    [switch]$VerboseStatus
)

$rawArgs = $MyInvocation.UnboundArguments
for ($i = 0; $i -lt $rawArgs.Count; $i++) {
    if ($rawArgs[$i] -eq "--until" -and ($i + 1) -lt $rawArgs.Count) {
        $Until = $rawArgs[$i + 1]
        $i++
        continue
    }
    if ($rawArgs[$i] -eq "--minutes" -and ($i + 1) -lt $rawArgs.Count) {
        $Minutes = [int]$rawArgs[$i + 1]
        $i++
        continue
    }
    if ($rawArgs[$i] -eq "--run" -and ($i + 1) -lt $rawArgs.Count) {
        $Run = $rawArgs[$i + 1]
        $i++
        continue
    }
    if ($rawArgs[$i] -eq "--pollSeconds" -and ($i + 1) -lt $rawArgs.Count) {
        $PollSeconds = [int]$rawArgs[$i + 1]
        $i++
        continue
    }
    if ($rawArgs[$i] -eq "--verboseStatus") {
        $VerboseStatus = $true
        continue
    }
}

if (($Minutes -ge 0) -and $Until) {
    Write-Error "Use either --minutes or --until, not both."
    exit 1
}

if (($Minutes -lt 0) -and (-not $Until)) {
    Write-Error "Missing wait target. Use --minutes <int> or --until <time>."
    exit 1
}

if ($PollSeconds -lt 1) {
    $PollSeconds = 1
}

$now = Get-Date
$target = $null

if ($Minutes -ge 0) {
    $target = $now.AddMinutes($Minutes)
} else {
    try {
        # Accepts values like:
        #   18:40
        #   2026-05-18 18:40
        #   2026-05-18T18:40:00
        $parsed = [datetime]::Parse($Until)

        # If user only provided a time (e.g. "18:40"), Parse gives today's date.
        # If that time already passed, wait until tomorrow at that time.
        if (
            $parsed.Date -eq $now.Date -and
            ($Until -match '^\d{1,2}:\d{2}(:\d{2})?$') -and
            $parsed -le $now
        ) {
            $parsed = $parsed.AddDays(1)
        }

        $target = $parsed
    } catch {
        Write-Error "Could not parse --until value '$Until'."
        exit 1
    }
}

if ($target -le $now) {
    Write-Host "Target time already reached: $($target.ToString('yyyy-MM-dd HH:mm:ss'))"
} else {
    Write-Host "Waiting until $($target.ToString('yyyy-MM-dd HH:mm:ss')) ..."
    while ((Get-Date) -lt $target) {
        if ($VerboseStatus) {
            $remaining = $target - (Get-Date)
            $hours = [int][Math]::Floor($remaining.TotalHours)
            $mins = [int]$remaining.Minutes
            $secs = [int]$remaining.Seconds
            Write-Host ("Remaining: {0:00}:{1:00}:{2:00}" -f $hours, $mins, $secs)
        }
        Start-Sleep -Seconds $PollSeconds
    }
}

Write-Host "Wait complete at $((Get-Date).ToString('yyyy-MM-dd HH:mm:ss'))."

if ($Run) {
    Write-Host "Running: $Run"
    & powershell -NoProfile -ExecutionPolicy Bypass -Command $Run
    exit $LASTEXITCODE
}

exit 0
