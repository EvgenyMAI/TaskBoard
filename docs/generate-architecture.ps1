param(
    [string]$InputFile = ".\docs\architecture.mmd",
    [string]$OutputFile = ".\docs\architecture.png",
    [string]$BackgroundColor = "#F1F5F9",
    [int]$Width = 2200
)

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Error "Docker is not installed or not in PATH."
    exit 1
}

$projectRoot = Split-Path -Parent $PSScriptRoot
$inputAbsolute = (Resolve-Path (Join-Path $projectRoot ($InputFile -replace '^[.\\\/]+', '')) -ErrorAction Stop).Path
$outputAbsolute = Join-Path $projectRoot ($OutputFile -replace '^[.\\\/]+', '')

$containerInput = "/data/" + ($inputAbsolute.Substring($projectRoot.Length).TrimStart('\').Replace('\', '/'))
$containerOutput = "/data/" + ($outputAbsolute.Substring($projectRoot.Length).TrimStart('\').Replace('\', '/'))

Write-Host "Generating architecture diagram..."
docker run --rm -v "${projectRoot}:/data" minlag/mermaid-cli -i $containerInput -o $containerOutput -b $BackgroundColor -w $Width

if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to generate architecture image."
    exit $LASTEXITCODE
}

Write-Host "Done: $OutputFile"
