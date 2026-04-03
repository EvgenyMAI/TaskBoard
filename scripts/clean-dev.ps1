# Удаляет локальные артефакты сборки/кэшей/логов (без node_modules и без образов Docker).
# Запуск:  .\scripts\clean-dev.ps1
# С флагом -DockerBuildCache:  docker buildx prune -f
# С флагом -ClearComposePortEnv: сбросить в текущей сессии PowerShell переменные портов compose
#   (если после run-tests.ps1 фронт стучится не в те порты).

param([switch]$DockerBuildCache, [switch]$ClearComposePortEnv)

$ErrorActionPreference = "Stop"
$root = if ($PSScriptRoot) { (Resolve-Path (Join-Path $PSScriptRoot "..")).Path } else { Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path) }
Set-Location $root

if ($ClearComposePortEnv) {
  $names = @(
    "POSTGRES_AUTH_PORT", "POSTGRES_TASKS_PORT", "POSTGRES_ANALYTICS_PORT",
    "MINIO_PORT", "MINIO_CONSOLE_PORT", "AUTH_SERVICE_PORT", "TASKS_SERVICE_PORT", "ANALYTICS_SERVICE_PORT", "FRONTEND_PORT"
  )
  foreach ($n in $names) {
    if (Test-Path ("env:" + $n)) { Remove-Item ("env:" + $n) -ErrorAction SilentlyContinue; Write-Host "Cleared env:$n" }
  }
}

$dirs = @(
  (Join-Path $root "frontend\dist"),
  (Join-Path $root "frontend\node_modules\.vite"),
  (Join-Path $root "frontend\node_modules\.cache"),
  (Join-Path $root ".cache")
)
foreach ($d in $dirs) {
  if (Test-Path $d) {
    Write-Host "Remove $d"
    Remove-Item -Recurse -Force $d
  }
}

$logRoot = Join-Path $root "logs"
if (Test-Path $logRoot) {
  Get-ChildItem $logRoot -Recurse -File -ErrorAction SilentlyContinue | Remove-Item -Force -ErrorAction SilentlyContinue
  Get-ChildItem $logRoot -Recurse -Directory -ErrorAction SilentlyContinue | Where-Object { (Get-ChildItem $_.FullName -Force -ErrorAction SilentlyContinue).Count -eq 0 } | Remove-Item -Force -ErrorAction SilentlyContinue
  Write-Host "Cleared files under logs\"
}

Get-ChildItem $root -Filter ".env.e2e.*.tmp" -File -ErrorAction SilentlyContinue | Remove-Item -Force -ErrorAction SilentlyContinue

$fe = Join-Path $root "frontend"
@("preview.out.log", "preview.err.log") | ForEach-Object {
  $p = Join-Path $fe $_
  if (Test-Path $p) { Remove-Item -Force $p }
}

if ($DockerBuildCache) {
  Write-Host "docker buildx prune -f"
  docker buildx prune -f
}

Write-Host "Done. Перезапуск стека: docker compose --env-file docker.defaults.env up -d --build"
