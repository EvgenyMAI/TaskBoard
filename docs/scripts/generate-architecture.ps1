param(
    [string]$InputFile = ".\docs\diagrams\architecture\architecture.mmd",
    [string]$OutputFile = ".\docs\diagrams\architecture\architecture.png",
    [string]$BackgroundColor = "#F1F5F9",
    [int]$Width = 2200
)

$projectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$inputAbsolute = (Resolve-Path (Join-Path $projectRoot ($InputFile -replace '^[.\\\/]+', '')) -ErrorAction Stop).Path
$outputAbsolute = Join-Path $projectRoot ($OutputFile -replace '^[.\\\/]+', '')

$containerInput = "/data/" + ($inputAbsolute.Substring($projectRoot.Length).TrimStart('\').Replace('\', '/'))
$containerOutput = "/data/" + ($outputAbsolute.Substring($projectRoot.Length).TrimStart('\').Replace('\', '/'))

Write-Host "Generating architecture diagram..."

$dockerCmd = Get-Command docker -ErrorAction SilentlyContinue
$useDocker = $false
if ($dockerCmd) {
    & $dockerCmd.Source info *> $null
    if ($LASTEXITCODE -eq 0) { $useDocker = $true }
}

if ($useDocker) {
    & $dockerCmd.Source run --rm -v "${projectRoot}:/data" minlag/mermaid-cli -i $containerInput -o $containerOutput -b $BackgroundColor -w $Width
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to generate architecture image with Docker Mermaid CLI."
        exit $LASTEXITCODE
    }
} else {
    Write-Host "Docker not available, trying npx @mermaid-js/mermaid-cli..."
    npx -y @mermaid-js/mermaid-cli -i $inputAbsolute -o $outputAbsolute -b $BackgroundColor -w $Width
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to generate architecture image with npx Mermaid CLI."
        exit $LASTEXITCODE
    }
}

Write-Host "Done: $OutputFile"
