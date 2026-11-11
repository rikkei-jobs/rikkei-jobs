# ==============================================================================
# Rikkei Jobs - Clean Docker CI Runner Harness (PowerShell Launcher)
# Task T022DB0 - Sprint 1 Quality Gates (Defect D8)
#
# Usage:
#   .\scripts\run-ci-in-docker.ps1
# ==============================================================================

[CmdletBinding()]
param(
    [string]$ImageTag = "rikkei-ci-runner"
)

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $RepoRoot

Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "  BUILDING CLEAN DOCKER CI RUNNER IMAGE: $ImageTag" -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor Cyan

docker build -f scripts/ci-runner.Dockerfile -t $ImageTag .
if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to build CI runner Docker image"
    exit 1
}

$rnd = [System.Guid]::NewGuid().ToString('N').Substring(0,8)
$VolName = "rikkei-ci-vol-$rnd"
Write-Host "Creating isolated workspace volume: $VolName" -ForegroundColor Cyan
docker volume create $VolName | Out-Null

$exitCode = 1
try {
    Write-Host "================================================================================" -ForegroundColor Cyan
    Write-Host "  LAUNCHING CLEAN DOCKER CI RUNNER HARNESS" -ForegroundColor Cyan
    Write-Host "================================================================================" -ForegroundColor Cyan

    docker run --rm `
        --network host `
        -v /var/run/docker.sock:/var/run/docker.sock `
        -v "${RepoRoot}:/host-repo:ro" `
        -v "${VolName}:/ci-workspace" `
        -e "CI_VOLUME_NAME=${VolName}" `
        $ImageTag
    $exitCode = $LASTEXITCODE
} finally {
    Write-Host "Cleaning up workspace volume: $VolName" -ForegroundColor Cyan
    docker volume rm $VolName 2>$null | Out-Null
}

exit $exitCode
