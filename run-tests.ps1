param(
  [switch]$BackendOnly,
  [switch]$E2EOnly,
  [switch]$VerboseBackendLogs,
  # Запуск Maven на хосте (нужны JDK 17 и `mvn` в PATH). Быстрее, чем холодный Docker; кэш — `.cache/m2/repository`.
  [switch]$UseHostMaven
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
$script:vitestRan = $false
$script:e2eRan = $false

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

function Get-SurefireResultsTestCount([System.Collections.Generic.List[string]]$Lines) {
  $sum = 0
  for ($i = 0; $i -lt $Lines.Count; $i++) {
    if ($Lines[$i] -match '^\[INFO\] Results:\s*$') {
      for ($j = $i + 1; $j -lt [Math]::Min($i + 8, $Lines.Count); $j++) {
        if ($Lines[$j] -match '^\[INFO\] Tests run:\s*(\d+)') {
          $sum += [int]$Matches[1]
          break
        }
      }
    }
  }
  return $sum
}

function Complete-MavenBackendRun(
  [System.Collections.Generic.List[string]]$output,
  [int]$exitCode,
  [string]$serviceName,
  [string]$logPath,
  [DateTime]$serviceStart,
  [int]$MinResultsTestCount,
  [string]$sourceHint
) {
  foreach ($line in $output) {
    if ($VerboseBackendLogs) {
      Write-Host $line
    } else {
      if ($line -match "^\[INFO\] (Tests run:|BUILD SUCCESS|BUILD FAILURE|Total time:|Finished at:|Results:|Running )") {
        Write-Host $line
      }
    }
  }
  Write-Host ("   ... {0} finished in {1}s (output lines: {2})" -f $serviceName, [math]::Round(((Get-Date) - $serviceStart).TotalSeconds, 0), $output.Count)

  $output | Out-File -FilePath $logPath -Encoding utf8

  $elapsedSec = [math]::Round(((Get-Date) - $serviceStart).TotalSeconds, 1)
  $resultsSum = Get-SurefireResultsTestCount $output
  $testsLine = ($output | Where-Object { $_ -match "^\[INFO\] Tests run:" } | Select-Object -Last 1)
  $totalLine = ($output | Where-Object { $_ -match "^\[INFO\] Total time:" } | Select-Object -Last 1)
  $hasBuildFailure = ($output | Where-Object { $_ -match '^\[INFO\] BUILD FAILURE' } | Select-Object -First 1)

  $failReasons = New-Object System.Collections.Generic.List[string]
  if ($exitCode -ne 0) { [void]$failReasons.Add("mvn exit code $exitCode") }
  if ($hasBuildFailure) { [void]$failReasons.Add("log contains BUILD FAILURE") }
  if ($MinResultsTestCount -gt 0 -and $resultsSum -lt $MinResultsTestCount) {
    [void]$failReasons.Add(("sum of [INFO] Results test counts is {0} (expected >= {1})" -f $resultsSum, $MinResultsTestCount))
  }

  $status = if ($failReasons.Count -eq 0) { "PASS" } else { "FAIL" }

  $script:backendResults += [PSCustomObject]@{
    Service = $serviceName
    Status = $status
    Tests = ("Results-sum={0} | last line: {1}" -f $resultsSum, ($(if ($testsLine) { $testsLine.Trim() } else { "n/a" })))
    Time = if ($totalLine) { $totalLine.Trim() } else { "n/a" }
    ElapsedSec = $elapsedSec
    Elapsed = "$elapsedSec s"
    Log = $logPath
    ExitCode = $exitCode
    ResultsTestSum = $resultsSum
  }

  Write-Host ("   -> {0} | {1} | Results-sum={2} | exit={3}" -f $serviceName, $status, $resultsSum, $exitCode)
  if ($testsLine) { Write-Host ("   -> last Tests run line: {0}" -f $testsLine.Trim()) }
  Write-Host ("   -> Full log: {0}" -f $logPath)

  if ($failReasons.Count -gt 0) {
    throw ("mvn test failed for {0}: {1} (see {2})" -f $sourceHint, ($failReasons -join "; "), $logPath)
  }
}

function RunDockerMvnTest(
  [string]$servicePath,
  [string]$mvnImage,
  [string]$mvnCli = "mvn -B test",
  [string]$logLabel = $null,
  [int]$MinResultsTestCount = 0
) {
  $src = $servicePath
  $serviceName = if ($logLabel) { $logLabel } else { Split-Path -Leaf $servicePath }
  $serviceStart = Get-Date
  $logPath = Join-Path $script:runLogDir ($serviceName + ".log")

  # Do not pass shell redirection (2>&1) into the container: it becomes stray Maven args and breaks runs.
  $mvnSanitized = ($mvnCli -replace '(?i)\s+2>&1\s*$', '').Trim()

  Info ("docker run ({0}) bind={1}" -f $mvnSanitized, $src)

  $mvnArgs = @()
  foreach ($tok in ($mvnSanitized -split '\s+')) {
    if ([string]::IsNullOrWhiteSpace($tok)) { continue }
    $mvnArgs += $tok
  }

  # Forward slashes avoid "docker: invalid reference format" when bind paths contain "C:\..." (colon/backslash).
  $srcNorm = ($src -replace '\\', '/')
  $m2Norm = ($script:mavenCacheDir -replace '\\', '/')

  $dockerArgs = @(
    "run", "--rm",
    "--mount", ("type=bind,source={0},target=/work" -f $srcNorm),
    "--mount", ("type=bind,source={0},target=/root/.m2" -f $m2Norm),
    "-w", "/work",
    $mvnImage
  ) + $mvnArgs

  $outFile = Join-Path $env:TEMP ("taskboard-mvn-" + [Guid]::NewGuid().ToString("N") + ".log")
  Remove-Item -Path $outFile -ErrorAction SilentlyContinue
  $dockerExe = (Get-Command docker.exe -ErrorAction SilentlyContinue)
  if (-not $dockerExe) { $dockerExe = (Get-Command docker -ErrorAction Stop) }
  # JVM writes warnings to stderr; with $ErrorActionPreference=Stop PowerShell would abort unless we relax for this call.
  $prevEap = $ErrorActionPreference
  try {
    $ErrorActionPreference = "Continue"
    # Redirect without piping (pipeline would break $LASTEXITCODE on Windows PowerShell 5.1).
    & $dockerExe.Source @dockerArgs > $outFile 2>&1
    $exitCode = $LASTEXITCODE
  } finally {
    $ErrorActionPreference = $prevEap
  }

  $output = New-Object System.Collections.Generic.List[string]
  if (Test-Path $outFile) {
    Get-Content -Path $outFile -ErrorAction SilentlyContinue | ForEach-Object { [void]$output.Add($_) }
  }
  Remove-Item -Path $outFile -ErrorAction SilentlyContinue

  Complete-MavenBackendRun -output $output -exitCode $exitCode -serviceName $serviceName -logPath $logPath `
    -serviceStart $serviceStart -MinResultsTestCount $MinResultsTestCount -sourceHint $src
}

function RunHostMvnTest(
  [string]$workDir,
  [string]$mvnCli = "mvn -B test",
  [string]$logLabel = $null,
  [int]$MinResultsTestCount = 0
) {
  $mvnCmd = Get-Command mvn -ErrorAction SilentlyContinue
  if (-not $mvnCmd) { throw "UseHostMaven: Maven (mvn) not found in PATH." }

  $serviceName = if ($logLabel) { $logLabel } else { Split-Path -Leaf $workDir }
  $serviceStart = Get-Date
  $logPath = Join-Path $script:runLogDir ($serviceName + ".log")

  $mvnSanitized = ($mvnCli -replace '(?i)\s+2>&1\s*$', '').Trim()
  $toks = New-Object System.Collections.Generic.List[string]
  foreach ($tok in ($mvnSanitized -split '\s+')) {
    if ([string]::IsNullOrWhiteSpace($tok)) { continue }
    [void]$toks.Add($tok)
  }
  if ($toks.Count -gt 0 -and $toks[0] -match '(?i)^mvn$') {
    $toks.RemoveAt(0)
  }

  $repoLocal = Join-Path $script:mavenCacheDir "repository"
  New-Item -ItemType Directory -Path $repoLocal -Force | Out-Null
  $mvnArgs = New-Object System.Collections.Generic.List[string]
  [void]$mvnArgs.Add(("-Dmaven.repo.local={0}" -f $repoLocal))
  foreach ($t in $toks) { [void]$mvnArgs.Add($t) }

  Info ("host mvn ({0}) cwd={1}" -f (($mvnArgs | ForEach-Object { $_ }) -join ' '), $workDir)

  $javaVer = $null
  try {
    $javaVer = & java -version 2>&1 | Out-String
  } catch { }
  if ($javaVer -and $javaVer -notmatch 'version "17') {
    Info "Warning: `java -version` does not look like JDK 17; host Maven may fail or behave oddly."
  }

  $outFile = Join-Path $env:TEMP ("taskboard-mvn-" + [Guid]::NewGuid().ToString("N") + ".log")
  Remove-Item -Path $outFile -ErrorAction SilentlyContinue

  $prevEap = $ErrorActionPreference
  Push-Location $workDir
  try {
    $ErrorActionPreference = "Continue"
    & mvn @($mvnArgs.ToArray()) > $outFile 2>&1
    $exitCode = $LASTEXITCODE
  } finally {
    $ErrorActionPreference = $prevEap
    Pop-Location
  }

  $output = New-Object System.Collections.Generic.List[string]
  if (Test-Path $outFile) {
    Get-Content -Path $outFile -ErrorAction SilentlyContinue | ForEach-Object { [void]$output.Add($_) }
  }
  Remove-Item -Path $outFile -ErrorAction SilentlyContinue

  Complete-MavenBackendRun -output $output -exitCode $exitCode -serviceName $serviceName -logPath $logPath `
    -serviceStart $serviceStart -MinResultsTestCount $MinResultsTestCount -sourceHint $workDir
}

function PrintBackendSummary() {
  if ($script:backendResults.Count -eq 0) { return }
  Info "Backend summary"
  foreach ($r in $script:backendResults) {
    Write-Host ("[{0}] {1}" -f $r.Status, $r.Service)
    Write-Host ("  {0}" -f $r.Tests)
    if ($null -ne $r.ResultsTestSum) { Write-Host ("  Results-sum (Surefire modules): {0}" -f $r.ResultsTestSum) }
    if ($null -ne $r.ExitCode) { Write-Host ("  exit code: {0}" -f $r.ExitCode) }
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
  $testsSum = [math]::Round((($script:backendResults | Measure-Object -Property ResultsTestSum -Sum).Sum), 0)
  Info "Backend KPI"
  Write-Host ("maven runs: {0} | pass: {1} | fail: {2} | Results-sum total: {3} | wall elapsed: {4} s" -f $total, $passed, $failed, $testsSum, $elapsedSum)
  # ASCII only: Windows PowerShell 5.1 may mis-parse UTF-8 without BOM (typographic dash broke the line above).
  Write-Host '  (auth-service: separate run; tasks-service + analytics-service: one reactor run, see tasks-and-analytics.log)'
  Write-Host ("logs: {0}" -f $script:runLogDir)
  Write-Host ("maven cache: {0}" -f $script:mavenCacheDir)
}

function Print-OverallSummary() {
  Info "Run summary (this run)"
  if ($script:backendResults.Count -gt 0) {
    $testsSum = [math]::Round((($script:backendResults | Measure-Object -Property ResultsTestSum -Sum).Sum), 0)
    Write-Host ("  Backend (Maven / Surefire): {0} tests, {1} Maven run(s)" -f $testsSum, $script:backendResults.Count)
  }
  if ($script:vitestRan) {
    Write-Host "  Frontend unit (Vitest): passed"
  }
  if ($script:e2eRan) {
    Write-Host "  E2E (Playwright): passed"
  }
  Write-Host ("  Log directory: {0}" -f $script:runLogDir)
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

if (-not $E2EOnly) {
  if ($UseHostMaven) {
    Info 'Backend tests (H2, Spring profile test) via host Maven; .cache/m2/repository; JDK 17 + mvn on PATH'
    RunHostMvnTest (Join-Path $workRoot "auth-service") "mvn -B test" "auth-service" 1
    RunHostMvnTest $workRoot "mvn -B -pl tasks-service,analytics-service -am test" "tasks-and-analytics" 25
  } else {
    Info 'Backend tests (H2, Spring profile test) via Docker Maven'

    $mvnImage = "maven:3.9-eclipse-temurin-17-alpine"

    RunDockerMvnTest (Join-Path $workRoot "auth-service") $mvnImage "mvn -B test" $null 1
    RunDockerMvnTest $workRoot $mvnImage "mvn -B -pl tasks-service,analytics-service -am test" "tasks-and-analytics" 25
  }
  PrintBackendSummary
  PrintBackendKpi
}

if ($BackendOnly) {
  Info "Backend-only mode done."
  exit 0
}

if (-not $E2EOnly) {
  Info "Frontend unit tests (Vitest)"
  $script:vitestRan = $true
  Push-Location (Join-Path $workRoot "frontend")
  try {
    # --no-audit --no-fund: less noise; run npm audit manually when needed
    Run "npm install --no-audit --no-fund"
    Run "npm run test"
  } finally {
    Pop-Location
  }
}

if (-not $E2EOnly) {
  Info "E2E (Playwright) preparation"
}

if (-not $BackendOnly) {
  $script:e2eRan = $true
  # Bring up backend stack needed for e2e
  Push-Location $workRoot
  $savedComposePorts = @{}
  $composePortVarNames = @(
    "POSTGRES_AUTH_PORT", "POSTGRES_TASKS_PORT", "POSTGRES_ANALYTICS_PORT",
    "MINIO_PORT", "MINIO_CONSOLE_PORT", "AUTH_SERVICE_PORT", "TASKS_SERVICE_PORT", "ANALYTICS_SERVICE_PORT"
  )
  $e2eEnvFile = $null
  try {
    # Docker Compose prefers shell env over defaults: random ports from a previous run-tests session
    # would stick in process environment variables and break local npm run dev. Use a temp --env-file only.
    foreach ($name in $composePortVarNames) {
      if (Test-Path ("env:" + $name)) {
        $savedComposePorts[$name] = (Get-Item ("env:" + $name)).Value
        Remove-Item ("env:" + $name) -ErrorAction SilentlyContinue
      }
    }

    $e2eEnvFile = Join-Path $workRoot (".env.e2e." + [Guid]::NewGuid().ToString("N") + ".tmp")
    $e2eLines = New-Object System.Collections.Generic.List[string]
    foreach ($name in $composePortVarNames) {
      [void]$e2eLines.Add("${name}=$((GetFreeTcpPort).ToString())")
    }
    $e2eLines | Set-Content -Path $e2eEnvFile -Encoding ascii

    $portMap = @{}
    Get-Content $e2eEnvFile | ForEach-Object {
      if ($_ -match "^([^=]+)=(.+)$") { $portMap[$Matches[1].Trim()] = $Matches[2].Trim() }
    }
    $frontendPort = GetFreeTcpPort

    # Pre-pull MinIO image (helps avoid transient 'latest' fetch issues).
    RunWithRetry "docker pull minio/minio:latest" 3 5

    # Compose up with retry (Docker Desktop/Hub can be flaky).
    RunWithRetry "docker compose --env-file `"$e2eEnvFile`" up -d --build" 3 5

    Info "Verify tasks-service and analytics-service containers stay running (not Exited)"
    $deadline = (Get-Date).AddSeconds(120)
    while ((Get-Date) -lt $deadline) {
      $ts = (& docker compose ps tasks-service --format "{{.State}}" 2>$null).Trim()
      $an = (& docker compose ps analytics-service --format "{{.State}}" 2>$null).Trim()
      if ($ts -match '(?i)^running' -and $an -match '(?i)^running') { break }
      if ($ts -match '(?i)exited' -or $an -match '(?i)exited') {
        Info "tasks-service state: $ts | analytics-service state: $an"
        Run "docker compose logs tasks-service --tail 80"
        Run "docker compose logs analytics-service --tail 80"
        throw "tasks-service or analytics-service exited during startup. Rebuild images: docker compose build --no-cache tasks-service analytics-service"
      }
      Start-Sleep -Seconds 2
    }
    $tsFinal = (& docker compose ps tasks-service --format "{{.State}}" 2>$null).Trim()
    $anFinal = (& docker compose ps analytics-service --format "{{.State}}" 2>$null).Trim()
    if (-not ($tsFinal -match '(?i)^running' -and $anFinal -match '(?i)^running')) {
      throw "tasks-service/analytics-service did not reach running state within 120s (tasks='$tsFinal', analytics='$anFinal')."
    }

    Push-Location "frontend"
    try {
      Run "npm install --no-audit --no-fund"
      Run "npx playwright install --with-deps chromium"

      # Use build+preview for stable e2e (same host ports as compose file for this run)
      $pa = $portMap["AUTH_SERVICE_PORT"]
      $pt = $portMap["TASKS_SERVICE_PORT"]
      $pan = $portMap["ANALYTICS_SERVICE_PORT"]
      $env:VITE_AUTH_API = "http://127.0.0.1:${pa}/api/auth"
      $env:VITE_USERS_API = "http://127.0.0.1:${pa}/api/users"
      $env:VITE_TASKS_API = "http://127.0.0.1:${pt}/api"
      $env:VITE_ANALYTICS_API = "http://127.0.0.1:${pan}/api"
      Run "npm run build"

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
        $env:E2E_ANALYTICS_API = $env:VITE_ANALYTICS_API
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
    if ($e2eEnvFile -and (Test-Path $e2eEnvFile)) {
      Remove-Item $e2eEnvFile -Force -ErrorAction SilentlyContinue
    }
    foreach ($k in $savedComposePorts.Keys) {
      Set-Item -Path ("env:" + $k) -Value $savedComposePorts[$k]
    }
    Pop-Location
  }
}

Print-OverallSummary
Info "All tests completed successfully."

