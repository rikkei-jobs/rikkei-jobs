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

# Isolate Docker Compose project name
$rnd = [System.Guid]::NewGuid().ToString('N').Substring(0,8)
$CiProjectName = "rikkei-ci-$rnd"
$env:COMPOSE_PROJECT_NAME = $CiProjectName

# Pre-check port conflicts on host before starting any resources
$requiredPorts = @(5433, 8080, 3000, 9000, 8025, 1025)
$conflict = $false
foreach ($p in $requiredPorts) {
    try {
        $tcp = [System.Net.Sockets.TcpClient]::new()
        $ar = $tcp.BeginConnect('127.0.0.1', $p, $null, $null)
        $wait = $ar.AsyncWaitHandle.WaitOne(150)
        if ($wait -and $tcp.Connected) {
            Write-Host "================================================================================" -ForegroundColor Red
            Write-Host "  FATAL ERROR: Port conflict detected on 127.0.0.1:$p!" -ForegroundColor Red
            $conflict = $true
        }
        $tcp.Close()
    } catch {
        # port closed
    }
}
if ($conflict) {
    Write-Host "  A development stack is already running on the host." -ForegroundColor Red
    Write-Host "  The CI harness will NOT stop or modify your running developer environment." -ForegroundColor Red
    Write-Host "  Please stop your dev stack or run in a clean environment." -ForegroundColor Red
    Write-Host "================================================================================" -ForegroundColor Red
    exit 1
}

# Check for stopped dev stack resources to display isolation notice
function Check-DevResources {
    param([string]$ProjectName)
    $hasDev = $false
    $vol = docker volume ls -q --filter "name=^rikkei_postgres_data$"
    if ($vol) { $hasDev = $true }
    if (-not $hasDev) {
        $net = docker network ls -q --filter "name=^rikkei-network$"
        if ($net) { $hasDev = $true }
    }
    if (-not $hasDev) {
        $ct = docker ps -aq --filter "name=^/rikkei-"
        if ($ct) { $hasDev = $true }
    }
    if ($hasDev) {
        Write-Host "--------------------------------------------------------------------------------" -ForegroundColor Yellow
        Write-Host "[ISOLATION NOTICE] Developer resources detected on host (dev stack stopped)." -ForegroundColor Yellow
        Write-Host "  Ports are free. Running harness with isolated Docker project: $ProjectName" -ForegroundColor Yellow
        Write-Host "  Developer volumes, networks, and containers are protected and will NOT be touched." -ForegroundColor Yellow
        Write-Host "--------------------------------------------------------------------------------" -ForegroundColor Yellow
    }
}
Check-DevResources -ProjectName $CiProjectName

Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "  BUILDING CLEAN DOCKER CI RUNNER IMAGE: $ImageTag" -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor Cyan

docker build -f scripts/ci-runner.Dockerfile -t $ImageTag .
if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to build CI runner Docker image"
    exit 1
}

$VolName = "rikkei-ci-vol-$rnd"
Write-Host "Creating isolated workspace volume: $VolName" -ForegroundColor Cyan
docker volume create $VolName | Out-Null

$exitCode = 1
try {
    Write-Host "================================================================================" -ForegroundColor Cyan
    Write-Host "  LAUNCHING CLEAN DOCKER CI RUNNER HARNESS" -ForegroundColor Cyan
    Write-Host "  Isolated Project: $CiProjectName" -ForegroundColor Cyan
    Write-Host "================================================================================" -ForegroundColor Cyan

    $dockerArgs = @(
        "run", "--rm",
        "--network", "host",
        "-v", "/var/run/docker.sock:/var/run/docker.sock",
        "-v", "${RepoRoot}:/host-repo:ro",
        "-v", "${VolName}:/ci-workspace",
        "-e", "CI_VOLUME_NAME=${VolName}",
        "-e", "COMPOSE_PROJECT_NAME=${CiProjectName}"
    )
    if ($env:TESTCONTAINERS_HOST_OVERRIDE) {
        $dockerArgs += "-e"
        $dockerArgs += "TESTCONTAINERS_HOST_OVERRIDE=$($env:TESTCONTAINERS_HOST_OVERRIDE)"
    }
    $dockerArgs += $ImageTag

    & docker @dockerArgs
    $exitCode = $LASTEXITCODE
} finally {
    Write-Host "Cleaning up isolated CI resources for project: $CiProjectName" -ForegroundColor Cyan
    $oldEAP = $ErrorActionPreference
    $ErrorActionPreference = 'SilentlyContinue'
    try {
        # 1. Clean up containers by compose project label
        $ciContainers = docker ps -aq --filter "label=com.docker.compose.project=$CiProjectName" 2>$null
        if ($ciContainers) {
            docker rm -f $ciContainers 2>$null | Out-Null
        }

        # 2. Clean up volumes by compose project label
        $ciVolumes = docker volume ls -q --filter "label=com.docker.compose.project=$CiProjectName" 2>$null
        if ($ciVolumes) {
            docker volume rm -f $ciVolumes 2>$null | Out-Null
        }

        # 3. Clean up networks by compose project label
        $ciNetworks = docker network ls -q --filter "label=com.docker.compose.project=$CiProjectName" 2>$null
        if ($ciNetworks) {
            docker network rm $ciNetworks 2>$null | Out-Null
        }

        # 4. Clean up workspace volume
        Write-Host "Cleaning up workspace volume: $VolName" -ForegroundColor Cyan
        $removed = $false
        for ($i = 0; $i -lt 5; $i++) {
            docker volume rm $VolName 2>$null | Out-Null
            if ($LASTEXITCODE -eq 0) {
                $removed = $true
                break
            }
            Start-Sleep -Milliseconds 500
        }
        if (-not $removed) {
            docker volume rm -f $VolName 2>$null | Out-Null
        }
    } finally {
        $ErrorActionPreference = $oldEAP
    }
}

exit $exitCode
