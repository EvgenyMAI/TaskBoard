param(
  [switch]$BackendOnly,
  [switch]$E2EOnly,
  [switch]$VerboseBackendLogs
)

$ErrorActionPreference = "Stop"
$script:sourceRoot = $PWD.Path
$script:backendResults = @()
$script:mavenCacheDir = Join-Path $script:sourceRoot ".cache\m2"
New-Item -ItemType Directory -Path $script:mavenCacheDir -Force | Out-Null

function NewRunLogDir() {
  $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
  $dir = Join-Path $script:sourceRoot ("logs\test-runs\" + $stamp)
  New-Item -ItemType Directory -Path $dir -Force | Out-Null
  return $dir
}

$script:runLogDir = NewRunLogDir

function Info($msg) {
  Write-Host ("`n==> " + $msg) -ForegroundColor Cyan
}

function Run($cmd) {
  Info $cmd
  iex $cmd
  if ($LASTEXITCODE -ne 0) { throw "Command failed with exit code ${LASTEXITCODE}: $cmd" }
}

function RunWithRetry([string]$cmd, [int]$retries = 3, [int]$sleepSeconds = 5) {
  for ($i = 1; $i -le $retries; $i++) {
    try {
      Run $cmd
      return
    } catch {
      if ($i -eq $retries) { throw }
      Info "Retry $i/$retries failed. Waiting ${sleepSeconds}s..."
      Start-Sleep -Seconds $sleepSeconds
    }
  }
}

function RunDockerMvnTest([string]$servicePath, [string]$mvnImage) {
  $src = $servicePath
  $serviceName = Split-Path -Leaf $servicePath
  $serviceStart = Get-Date
  $logPath = Join-Path $script:runLogDir ($serviceName + ".log")
  Info "docker run (mvn test) in $src"
  $output = New-Object System.Collections.Generic.List[string]
  $lastHeartbeat = Get-Date
  $heartbeatEverySec = 15

  # Route through cmd so stderr/stdout are merged before PowerShell processes streams.
  $dockerCmd = @(
    "docker run --rm"
    ("--mount ""type=bind,source={0},target=/work""" -f $src)
    ("--mount ""type=bind,source={0},target=/root/.m2""" -f $script:mavenCacheDir)
    "-w /work"
    $mvnImage
    "mvn -B test 2>&1"
  ) -join " "

  try {
    & cmd /c $dockerCmd | ForEach-Object {
        $line = "$_"
        $output.Add($line) | Out-Null

        if ($VerboseBackendLogs) {
          Write-Host $line
        } else {
          if ($line -match "^\[INFO\] (Tests run:|BUILD SUCCESS|BUILD FAILURE|Total time:|Finished at:|Results:|Running )") {
            Write-Host $line
          }
        }

        $elapsedNow = [math]::Round(((Get-Date) - $serviceStart).TotalSeconds, 0)
        if ($elapsedNow -gt 0 -and (((Get-Date) - $lastHeartbeat).TotalSeconds -ge $heartbeatEverySec)) {
          Write-Host ("   ... {0} still running ({1}s)" -f $serviceName, $elapsedNow)
          $lastHeartbeat = Get-Date
        }
      }
    $exitCode = $LASTEXITCODE
  } finally { }

  $output | Out-File -FilePath $logPath -Encoding utf8

  $elapsedSec = [math]::Round(((Get-Date) - $serviceStart).TotalSeconds, 1)
  $testsLine = ($output | Where-Object { $_ -match "^\[INFO\] Tests run:" } | Select-Object -Last 1)
  $totalLine = ($output | Where-Object { $_ -match "^\[INFO\] Total time:" } | Select-Object -Last 1)
  $status = if ($exitCode -eq 0) { "PASS" } else { "FAIL" }

  $script:backendResults += [PSCustomObject]@{
    Service = $serviceName
    Status = $status
    Tests = if ($testsLine) { $testsLine.Trim() } else { "n/a" }
    Time = if ($totalLine) { $totalLine.Trim() } else { "n/a" }
    ElapsedSec = $elapsedSec
    Elapsed = "$elapsedSec s"
    Log = $logPath
  }

  Write-Host ("   -> {0} | {1} | {2}" -f $serviceName, $status, $testsLine)
  Write-Host ("   -> Full log: {0}" -f $logPath)

  if ($exitCode -ne 0) { throw "mvn test failed for $src (see $logPath)" }
}

function PrintBackendSummary() {
  if ($script:backendResults.Count -eq 0) { return }
  Info "Backend summary"
  foreach ($r in $script:backendResults) {
    Write-Host ("[{0}] {1}" -f $r.Status, $r.Service)
    Write-Host ("  {0}" -f $r.Tests)
    Write-Host ("  {0}" -f $r.Time)
    Write-Host ("  elapsed: {0}" -f $r.Elapsed)
    Write-Host ("  log: {0}" -f $r.Log)
  }
}

function PrintBackendKpi() {
  if ($script:backendResults.Count -eq 0) { return }
  $total = $script:backendResults.Count
  $passed = ($script:backendResults | Where-Object { $_.Status -eq "PASS" }).Count
  $failed = ($script:backendResults | Where-Object { $_.Status -eq "FAIL" }).Count
  $elapsedSum = [math]::Round((($script:backendResults | Measure-Object -Property ElapsedSec -Sum).Sum), 1)
  Info "Backend KPI"
  Write-Host ("services: {0} | pass: {1} | fail: {2} | total elapsed: {3} s" -f $total, $passed, $failed, $elapsedSum)
  Write-Host ("logs: {0}" -f $script:runLogDir)
  Write-Host ("maven cache: {0}" -f $script:mavenCacheDir)
}

function NeedsAsciiPath([string]$path) {
  foreach ($ch in $path.ToCharArray()) {
    if ([int][char]$ch -gt 127) { return $true }
  }
  return $false
}

function PrepWorkspace() {
  $root = $PWD.Path
  if (-not (NeedsAsciiPath $root)) { return $root }

  $tmpRoot = Join-Path $env:TEMP ("taskboard-ci-" + [Guid]::NewGuid().ToString("N"))
  New-Item -ItemType Directory -Path $tmpRoot | Out-Null

  Info "Workspace path contains non-ASCII chars. Copying to temp: $tmpRoot"

  # Fast copy (skip heavy folders)
  $excludeDirs = @("node_modules", "dist", "logs", ".git", ".idea")
  $excludeArgs = $excludeDirs | ForEach-Object { "/XD `"$root\$_`"" }
  $cmd = "robocopy `"$root`" `"$tmpRoot`" /E /NFL /NDL /NJH /NJS /NP /R:1 /W:1 " + ($excludeArgs -join " ")
  iex $cmd | Out-Null

  return $tmpRoot
}

$workRoot = PrepWorkspace

function GetFreeTcpPort() {
  $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, 0)
  $listener.Start()
  $port = ($listener.LocalEndpoint).Port
  $listener.Stop()
  return $port
}

function EnsureEnvPort([string]$name) {
  if (-not (Test-Path ("env:" + $name))) {
    Set-Item -Path ("env:" + $name) -Value (GetFreeTcpPort).ToString()
  } else {
    $val = (Get-Item ("env:" + $name)).Value
    if ([string]::IsNullOrWhiteSpace($val)) {
      Set-Item -Path ("env:" + $name) -Value (GetFreeTcpPort).ToString()
    }
  }
}

if (-not $E2EOnly) {
  Info "Backend tests (H2, Spring profile: test) via Docker Maven"

  $mvnImage = "maven:3.9-eclipse-temurin-17-alpine"

  RunDockerMvnTest (Join-Path $workRoot "auth-service") $mvnImage
  RunDockerMvnTest (Join-Path $workRoot "tasks-service") $mvnImage
  RunDockerMvnTest (Join-Path $workRoot "analytics-service") $mvnImage
  PrintBackendSummary
  PrintBackendKpi
}

if ($BackendOnly) {
  Info "Backend-only mode done."
  exit 0
}

if (-not $E2EOnly) {
  Info "E2E (Playwright) preparation"
}

if (-not $BackendOnly) {
  # Bring up backend stack needed for e2e
  Push-Location $workRoot
  try {
    # Avoid port conflicts with already running local stack.
    EnsureEnvPort "POSTGRES_AUTH_PORT"
    EnsureEnvPort "POSTGRES_TASKS_PORT"
    EnsureEnvPort "POSTGRES_ANALYTICS_PORT"
    EnsureEnvPort "MINIO_PORT"
    EnsureEnvPort "MINIO_CONSOLE_PORT"
    EnsureEnvPort "AUTH_SERVICE_PORT"
    EnsureEnvPort "TASKS_SERVICE_PORT"
    EnsureEnvPort "ANALYTICS_SERVICE_PORT"
    EnsureEnvPort "FRONTEND_PORT"

    # Pre-pull MinIO image (helps avoid transient 'latest' fetch issues).
    RunWithRetry "docker pull minio/minio:latest" 3 5

    # Compose up with retry (Docker Desktop/Hub can be flaky).
    RunWithRetry "docker compose up -d --build" 3 5

    Push-Location "frontend"
    try {
      Run "npm install"
      Run "npx playwright install --with-deps chromium"

      # Use build+preview for stable e2e
      $env:VITE_AUTH_API = "http://localhost:$($env:AUTH_SERVICE_PORT)/api/auth"
      $env:VITE_USERS_API = "http://localhost:$($env:AUTH_SERVICE_PORT)/api/users"
      $env:VITE_TASKS_API = "http://localhost:$($env:TASKS_SERVICE_PORT)/api"
      $env:VITE_ANALYTICS_API = "http://localhost:$($env:ANALYTICS_SERVICE_PORT)/api"
      Run "npm run build"

      $frontendPort = (Get-Item "env:FRONTEND_PORT").Value
      Info "Starting frontend preview on http://127.0.0.1:$frontendPort"
      $npmCmd = (Get-Command npm.cmd -ErrorAction SilentlyContinue)
      if (-not $npmCmd) { $npmCmd = (Get-Command npm -ErrorAction SilentlyContinue) }
      if (-not $npmCmd) { throw "npm was not found in PATH." }

      $preview = Start-Process -FilePath $npmCmd.Source `
        -ArgumentList @("run","preview","--","--host","127.0.0.1","--port",$frontendPort) `
        -WorkingDirectory (Get-Location) `
        -PassThru `
        -NoNewWindow `
        -RedirectStandardOutput (Join-Path (Get-Location) "preview.out.log") `
        -RedirectStandardError (Join-Path (Get-Location) "preview.err.log")

      try {
        Info "Waiting for frontend to be ready..."
        $ok = $false
        for ($i = 0; $i -lt 60; $i++) {
          try {
            $resp = Invoke-WebRequest -UseBasicParsing -TimeoutSec 2 ("http://127.0.0.1:" + $frontendPort)
            if ($resp.StatusCode -ge 200 -and $resp.StatusCode -lt 500) { $ok = $true; break }
          } catch { }
          Start-Sleep -Seconds 1
        }
        if (-not $ok) { throw "Frontend preview did not start in time." }

        $env:E2E_BASE_URL = ("http://127.0.0.1:" + $frontendPort)
        $env:E2E_AUTH_API = $env:VITE_AUTH_API
        $env:E2E_TASKS_API = $env:VITE_TASKS_API
        Run "npm run test:e2e"
      } finally {
        if ($preview -and -not $preview.HasExited) {
          Info "Stopping frontend preview (pid $($preview.Id))"
          Stop-Process -Id $preview.Id -Force -ErrorAction SilentlyContinue
        }
      }
    } finally {
      Pop-Location
    }
  } finally {
    try {
      Info "Cleaning temporary e2e compose stack"
      Run "docker compose down -v"
    } catch {
      Info "compose down failed (ignored): $($_.Exception.Message)"
    }
    Pop-Location
  }
}

Info "All tests completed successfully."

