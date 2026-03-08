param(
    [ValidateSet("auth", "tasks", "analytics", "all")]
    [string]$Service = "all",
    [int]$Tail = 60,
    [switch]$Follow,
    [string]$Rid,
    [string]$Uid
)

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

$logMap = @{
    auth      = Join-Path $scriptRoot "logs/auth-service/auth-service.log"
    tasks     = Join-Path $scriptRoot "logs/tasks-service/tasks-service.log"
    analytics = Join-Path $scriptRoot "logs/analytics-service/analytics-service.log"
}

function Match-Filter {
    param(
        [string]$Line,
        [string]$RequestId,
        [string]$UserId
    )

    if ($RequestId -and $Line -notmatch "\[rid=$([regex]::Escape($RequestId))\]") {
        return $false
    }
    if ($UserId -and $Line -notmatch "\[uid=$([regex]::Escape($UserId))\]") {
        return $false
    }
    return $true
}

function Print-File {
    param(
        [string]$Name,
        [string]$Path,
        [int]$TailLines,
        [switch]$IsFollow,
        [string]$RequestId,
        [string]$UserId
    )

    if (-not (Test-Path $Path)) {
        Write-Warning "Log file not found for '$Name': $Path"
        return
    }

    Write-Host ""
    Write-Host "=== $Name === $Path"

    if ($IsFollow) {
        Get-Content $Path -Tail $TailLines -Wait | ForEach-Object {
            if (Match-Filter -Line $_ -RequestId $RequestId -UserId $UserId) {
                $_
            }
        }
        return
    }

    Get-Content $Path -Tail $TailLines | ForEach-Object {
        if (Match-Filter -Line $_ -RequestId $RequestId -UserId $UserId) {
            $_
        }
    }
}

if ($Service -eq "all" -and $Follow) {
    Write-Warning "Follow mode for 'all' is not supported. Choose one service: auth, tasks, analytics."
    exit 1
}

if ($Service -eq "all") {
    foreach ($pair in $logMap.GetEnumerator()) {
        Print-File -Name $pair.Key -Path $pair.Value -TailLines $Tail -IsFollow:$false -RequestId $Rid -UserId $Uid
    }
    exit 0
}

Print-File -Name $Service -Path $logMap[$Service] -TailLines $Tail -IsFollow:$Follow -RequestId $Rid -UserId $Uid
