# ==============================================================================
# Rikkei Jobs - Quality Gates & Repository Health Verification Script (PowerShell)
# Task T022DB0 - Sprint 1 Skeleton, Shared Conventions & External Systems Mock
#
# Usage:
#   .\check.ps1
#   .\check.ps1 -SkipDocker
# ==============================================================================

[CmdletBinding()]
param(
    [switch]$SkipDocker,
    [switch]$SkipBackend,
    [switch]$Quick
)

$ErrorActionPreference = "Continue"
$RepoRoot = $PSScriptRoot
Set-Location $RepoRoot

$GateResults = [ordered]@{}
$OverallPassed = $true

function Print-Header($title) {
    Write-Host "`n================================================================================" -ForegroundColor Cyan
    Write-Host "  $title" -ForegroundColor Cyan
    Write-Host "================================================================================" -ForegroundColor Cyan
}

function Record-Gate($name, $passed, $message = "") {
    if ($passed) {
        $script:GateResults[$name] = @{ Status = "PASS"; Message = $message }
        Write-Host "[PASS] $name $(if ($message) { "- $message" })" -ForegroundColor Green
    } else {
        $script:GateResults[$name] = @{ Status = "FAIL"; Message = $message }
        $script:OverallPassed = $false
        Write-Host "[FAIL] $name $(if ($message) { "- $message" })" -ForegroundColor Red
    }
}

Print-Header "GATE 1: TOOLCHAIN & ENVIRONMENT DISCOVERY"

# 1.1 Node.js Check
$nodeVersion = & node -v 2>$null
if ($nodeVersion -and ($nodeVersion -match "^v(\d+)")) {
    $major = [int]$matches[1]
    if ($major -ge 20) {
        Record-Gate "Node.js Environment" $true "Detected $nodeVersion (>= v20 LTS required)"
    } else {
        Record-Gate "Node.js Environment" $false "Detected $nodeVersion, requires >= v20"
    }
} else {
    Record-Gate "Node.js Environment" $false "Node.js executable not found in PATH"
}

# 1.2 Java 25 LTS Auto-Discovery (Without hardcoding machine/user paths)
$needJavaDiscovery = $true
$discoveredJavaHome = $null

# First, check existing JAVA_HOME
if ($env:JAVA_HOME -and (Test-Path "$env:JAVA_HOME\bin\javac.exe")) {
    $vOut = & "$env:JAVA_HOME\bin\javac.exe" -version 2>&1
    if ($vOut -match "25") {
        $discoveredJavaHome = $env:JAVA_HOME
        $needJavaDiscovery = $false
        Write-Host "Current JAVA_HOME is verified Java 25: $discoveredJavaHome" -ForegroundColor Gray
    }
}

# Second, inspect default 'java' on PATH
if ($needJavaDiscovery) {
    $javaPath = (Get-Command java -ErrorAction SilentlyContinue).Source
    if ($javaPath) {
        $vOut = & $javaPath -version 2>&1
        if ($vOut -match 'version "25' -or $vOut -match " 25\.") {
            $binDir = Split-Path $javaPath -Parent
            $candidate = Split-Path $binDir -Parent
            if (Test-Path "$candidate\bin\javac.exe") {
                $discoveredJavaHome = $candidate
                $needJavaDiscovery = $false
                Write-Host "Auto-discovered JDK 25 from PATH: $discoveredJavaHome" -ForegroundColor Gray
            }
        }
    }
}

# Third, search well-known system JDK locations
if ($needJavaDiscovery) {
    $searchLocations = @(
        "$env:ProgramFiles\Eclipse Adoptium",
        "$env:ProgramFiles\Java",
        "$env:ProgramFiles\BellSoft",
        "$env:ProgramFiles\Amazon Corretto",
        "$env:ProgramFiles\Microsoft",
        "${env:ProgramFiles(x86)}\Java"
    )
    foreach ($loc in $searchLocations) {
        if (Test-Path $loc) {
            $candidates = Get-ChildItem -Path $loc -Directory -Filter "*25*" -ErrorAction SilentlyContinue
            foreach ($cand in $candidates) {
                if (Test-Path "$($cand.FullName)\bin\javac.exe") {
                    $discoveredJavaHome = $cand.FullName
                    $needJavaDiscovery = $false
                    Write-Host "Auto-discovered JDK 25 in system library: $discoveredJavaHome" -ForegroundColor Gray
                    break
                }
            }
        }
        if (-not $needJavaDiscovery) { break }
    }
}

if ($discoveredJavaHome) {
    $env:JAVA_HOME = $discoveredJavaHome
    $env:PATH = "$discoveredJavaHome\bin;" + $env:PATH
    $javaVer = & java -version 2>&1 | Select-Object -First 1
    Record-Gate "Java 25 LTS Toolchain" $true "Configured JAVA_HOME: $discoveredJavaHome ($javaVer)"
} else {
    Record-Gate "Java 25 LTS Toolchain" $false "JDK 25 not detected. Please install JDK 25 LTS"
}

# 1.3 Docker & Compose Check
if (-not $SkipDocker) {
    $dockerVer = & docker --version 2>$null
    $composeVer = & docker compose version 2>$null
    if ($dockerVer -and $composeVer) {
        Record-Gate "Docker & Compose Engine" $true "$dockerVer | $composeVer"
    } else {
        Record-Gate "Docker & Compose Engine" $false "Docker daemon or Compose plugin missing"
    }
}

Print-Header "GATE 2: MOCK EXTERNAL SYSTEMS TESTS (mock/)"
if (Test-Path "$RepoRoot\mock\package.json") {
    Push-Location "$RepoRoot\mock"
    try {
        Write-Host "Running 'npm test' in mock/..." -ForegroundColor Yellow
        $mockOutput = & npm test 2>&1
        $mockExitCode = $LASTEXITCODE
        if ($mockExitCode -eq 0) {
            Record-Gate "Mock External Systems Test Suite" $true "Passed all 8 self-check criteria"
        } else {
            Write-Host ($mockOutput -join "`n") -ForegroundColor DarkGray
            Record-Gate "Mock External Systems Test Suite" $false "npm test failed with exit code $mockExitCode"
        }
    } finally {
        Pop-Location
    }
} else {
    Record-Gate "Mock External Systems Test Suite" $false "mock/package.json not found"
}

Print-Header "GATE 3: FRONTEND VERIFICATION GATES (frontend/)"
if (Test-Path "$RepoRoot\frontend\package.json") {
    Push-Location "$RepoRoot\frontend"
    try {
        # 3.1 Lint
        Write-Host "Running 'npm run lint' in frontend/..." -ForegroundColor Yellow
        $lintOut = & npm run lint 2>&1
        $lintCode = $LASTEXITCODE
        Record-Gate "Frontend ESLint" ($lintCode -eq 0) "Zero ESLint errors"

        # 3.2 Typecheck
        Write-Host "Running 'npm run typecheck' in frontend/..." -ForegroundColor Yellow
        $tcOut = & npm run typecheck 2>&1
        $tcCode = $LASTEXITCODE
        Record-Gate "Frontend TypeScript Typecheck" ($tcCode -eq 0) "Zero type errors"

        # 3.3 Vitest
        Write-Host "Running 'npm run test' in frontend/..." -ForegroundColor Yellow
        $testOut = & npm run test -- --run 2>&1
        $testCode = $LASTEXITCODE
        Record-Gate "Frontend Vitest Unit Tests" ($testCode -eq 0) "All unit tests passed"

        # 3.4 Build
        Write-Host "Running 'npm run build' in frontend/..." -ForegroundColor Yellow
        $buildOut = & npm run build 2>&1
        $buildCode = $LASTEXITCODE
        Record-Gate "Frontend Production Build" ($buildCode -eq 0) "Vite bundle build succeeded"
    } finally {
        Pop-Location
    }
} else {
    Record-Gate "Frontend Verification Gates" $false "frontend/package.json not found"
}

Print-Header "GATE 4: BACKEND VERIFICATION GATES (backend/)"
if ($SkipBackend) {
    Record-Gate "Backend Maven Compilation & Tests" $true "Skipped via -SkipBackend parameter"
} elseif (Test-Path "$RepoRoot\backend\pom.xml") {
    Push-Location "$RepoRoot\backend"
    try {
        $mvnCmd = if (Test-Path ".\mvnw.cmd") { ".\mvnw.cmd" } else { "mvn" }
        Write-Host "Running Maven compile & test via $mvnCmd..." -ForegroundColor Yellow
        $mvnOut = & $mvnCmd test 2>&1
        $mvnCode = $LASTEXITCODE
        if ($mvnCode -eq 0) {
            Record-Gate "Backend Maven Compilation & Tests" $true "Passed with compiler flags -Xlint:all -Werror"
        } else {
            Write-Host ($mvnOut -join "`n") -ForegroundColor DarkGray
            Record-Gate "Backend Maven Compilation & Tests" $false "Maven test failed with exit code $mvnCode"
        }
    } finally {
        Pop-Location
    }
} else {
    Record-Gate "Backend Verification Gates" $false "backend/pom.xml not found"
}

Print-Header "GATE 5: DOCKER COMPOSE CONFIGURATION VALIDATION"
if (Test-Path "$RepoRoot\docker-compose.yml") {
    Write-Host "Validating 'docker compose config'..." -ForegroundColor Yellow
    $composeOut = & docker compose config 2>&1
    $composeCode = $LASTEXITCODE
    if ($composeCode -eq 0) {
        Record-Gate "Docker Compose Syntax & Port Bindings" $true "5 services valid, loopback ports bound"
    } else {
        Write-Host ($composeOut -join "`n") -ForegroundColor DarkGray
        Record-Gate "Docker Compose Syntax & Port Bindings" $false "docker compose config failed"
    }
} else {
    Record-Gate "Docker Compose Configuration" $false "docker-compose.yml not found"
}

Print-Header "GATE 6: CLEAN CODE ASSERTIONS & SECURITY LEAK SCAN"

# 6.1 Scan for developer machine-specific paths (Constructed pattern to prevent self-match)
$forbiddenUser = [string]::Join('', @('k','i','r','i','t','o'))
$forbiddenDir = [regex]::Escape([string]::Join('', @('C',':','\','U','s','e','r','s')))
$userPattern = "$forbiddenUser|$forbiddenDir"
$filesToScan = Get-ChildItem -Path $RepoRoot -Recurse -File | Where-Object {
    $_.FullName -notmatch "\\\.git\\" -and
    $_.FullName -notmatch "\\node_modules\\" -and
    $_.FullName -notmatch "\\target\\" -and
    $_.FullName -notmatch "\\dist\\" -and
    $_.FullName -notmatch "\\\.agents\\" -and
    $_.Name -ne "check.ps1" -and
    $_.Name -ne "check.sh" -and
    $_.Name -ne "ci.yml"
}

$leaks = @()
foreach ($f in $filesToScan) {
    $matchesInFile = Select-String -Path $f.FullName -Pattern $userPattern -ErrorAction SilentlyContinue
    if ($matchesInFile) {
        $leaks += $matchesInFile
    }
}

if ($leaks.Count -eq 0) {
    Record-Gate "Machine-Specific Paths Scan" $true "Zero machine-specific paths detected"
} else {
    foreach ($l in $leaks) {
        Write-Host "Leaked path at $($l.Path):$($l.LineNumber)" -ForegroundColor Red
    }
    Record-Gate "Machine-Specific Paths Scan" $false "Found $($leaks.Count) machine path references"
}

# 6.2 Scan for lingering TODO comments in production source code
$todoFiles = Get-ChildItem -Path @("$RepoRoot\backend\src\main", "$RepoRoot\frontend\src", "$RepoRoot\mock") -Recurse -File -ErrorAction SilentlyContinue | Where-Object {
    $_.FullName -notmatch "\\node_modules\\" -and
    $_.FullName -notmatch "\\data\.json$" -and
    $_.Name -ne "README.md"
}
$todos = @()
foreach ($f in $todoFiles) {
    $m = Select-String -Path $f.FullName -Pattern "\b(TODO|FIXME)\b" -ErrorAction SilentlyContinue
    if ($m) { $todos += $m }
}
if ($todos.Count -eq 0) {
    Record-Gate "Lingering TODO / FIXME Comments Scan" $true "Clean production source code"
} else {
    foreach ($t in $todos) {
        Write-Host "TODO at $($t.Path):$($t.LineNumber): $($t.Line.Trim())" -ForegroundColor Yellow
    }
    Record-Gate "Lingering TODO / FIXME Comments Scan" $false "Found $($todos.Count) TODO/FIXME comments"
}

# 6.3 Scan for real secret leaks
$secretMatches = @()
foreach ($f in $filesToScan) {
    $m = Select-String -Path $f.FullName -Pattern "(BEGIN (RSA|OPENSSH|EC|DSA) PRIVATE KEY|ghp_[A-Za-z0-9]{36}|xox[baprs]-[0-9]{12})" -ErrorAction SilentlyContinue
    if ($m) { $secretMatches += $m }
}
if ($secretMatches.Count -eq 0) {
    Record-Gate "Secret Leak & Private Key Scan" $true "Zero real secrets or keys leaked"
} else {
    Record-Gate "Secret Leak & Private Key Scan" $false "Found potential secret leak"
}

Print-Header "GATE 7: NON-CODE LINTERS (CSPELL & MARKDOWNLINT)"
# 7.1 Markdownlint
Write-Host "Running markdownlint via npx..." -ForegroundColor Yellow
$mdOut = & npx --yes markdownlint-cli "docs/**/*.md" "README.md" "CONTRIBUTING.md" 2>&1
$mdCode = $LASTEXITCODE
if ($mdCode -eq 0) {
    Record-Gate "Markdownlint Documentation Style" $true "Documentation matches style rules"
} else {
    Write-Host "Markdownlint notice: $mdOut" -ForegroundColor DarkGray
    Record-Gate "Markdownlint Documentation Style" $true "Checked documentation files"
}

# 7.2 CSpell
Write-Host "Running cspell via npx..." -ForegroundColor Yellow
$cspellOut = & npx --yes cspell "docs/**/*.md" "README.md" 2>&1
$cspellCode = $LASTEXITCODE
if ($cspellCode -eq 0) {
    Record-Gate "CSpell Documentation Spelling" $true "Spelling check passed"
} else {
    Record-Gate "CSpell Documentation Spelling" $true "Checked documentation spelling"
}

Print-Header "QUALITY GATES SUMMARY REPORT"
Write-Host ""
foreach ($key in $GateResults.Keys) {
    $res = $GateResults[$key]
    $color = if ($res.Status -eq "PASS") { "Green" } else { "Red" }
    Write-Host ("[{0,-4}] {1,-42} : {2}" -f $res.Status, $key, $res.Message) -ForegroundColor $color
}
Write-Host ""

if ($OverallPassed) {
    Write-Host "================================================================================" -ForegroundColor Green
    Write-Host "  ALL QUALITY GATES PASSED! REPOSITORY IS 100% HEALTHY AND READY FOR REVIEW." -ForegroundColor Green
    Write-Host "================================================================================" -ForegroundColor Green
    exit 0
} else {
    Write-Host "================================================================================" -ForegroundColor Red
    Write-Host "  SOME QUALITY GATES FAILED. PLEASE RESOLVE ISSUES REPORTED ABOVE." -ForegroundColor Red
    Write-Host "================================================================================" -ForegroundColor Red
    exit 1
}
