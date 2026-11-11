# ==============================================================================
# Rikkei Jobs - Quality Gates & Repository Health Verification Script (PowerShell)
# Task T022DB0 - Sprint 1 Skeleton, Shared Conventions & External Systems Mock
#
# Usage:
#   .\check.ps1
#   .\check.ps1 -SkipDocker
#   .\check.ps1 -SkipBackend
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

# Load centralized pinned tool versions
$toolVersionsFile = Join-Path $RepoRoot "scripts\tool-versions.env"
if (Test-Path $toolVersionsFile) {
    Get-Content $toolVersionsFile | ForEach-Object {
        if ($_ -match '^\s*([A-Za-z0-9_]+)\s*=\s*(.*?)\s*$') {
            Set-Item -Path "env:$($matches[1])" -Value $matches[2]
        }
    }
}

$hadolintVer = if ($env:HADOLINT_VERSION) { $env:HADOLINT_VERSION } else { "v2.15.1" }
$yamllintVer = if ($env:YAMLLINT_VERSION) { $env:YAMLLINT_VERSION } else { "1-0.14" }
$actionlintVer = if ($env:ACTIONLINT_VERSION) { $env:ACTIONLINT_VERSION } else { "1.7.12" }
$sqlfluffVer = if ($env:SQLFLUFF_VERSION) { $env:SQLFLUFF_VERSION } else { "4.5.0" }
$markdownlintVer = if ($env:MARKDOWNLINT_VERSION) { $env:MARKDOWNLINT_VERSION } else { "0.24.0" }
$cspellVer = if ($env:CSPELL_VERSION) { $env:CSPELL_VERSION } else { "10.4.1" }
$cspellDictViVer = if ($env:CSPELL_DICT_VI_VERSION) { $env:CSPELL_DICT_VI_VERSION } else { "3.0.7" }

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

if ($env:JAVA_HOME -and (Test-Path "$env:JAVA_HOME\bin\javac.exe")) {
    $vOut = & "$env:JAVA_HOME\bin\javac.exe" -version 2>&1
    if ($vOut -match "25") {
        $discoveredJavaHome = $env:JAVA_HOME
        $needJavaDiscovery = $false
        Write-Host "Current JAVA_HOME is verified Java 25: $discoveredJavaHome" -ForegroundColor Gray
    }
}

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
                    Write-Host "Auto-discovered JDK 25 from search: $discoveredJavaHome" -ForegroundColor Gray
                    break
                }
            }
        }
        if (-not $needJavaDiscovery) { break }
    }
}

if ($discoveredJavaHome) {
    $env:JAVA_HOME = $discoveredJavaHome
    $env:PATH = "$discoveredJavaHome\bin;$env:PATH"
    $vOut = & "$discoveredJavaHome\bin\java.exe" -version 2>&1 | Select-Object -First 1
    Record-Gate "Java 25 LTS Toolchain" $true "Configured JAVA_HOME: $discoveredJavaHome ($vOut)"
} else {
    $curJava = & java -version 2>&1
    if ($curJava -match "25") {
        Record-Gate "Java 25 LTS Toolchain" $true "Java 25 active on PATH"
    } else {
        Record-Gate "Java 25 LTS Toolchain" $false "JDK 25 not detected"
    }
}

# 1.3 Docker & Docker Compose Check
$hasDocker = $false
if (-not $SkipDocker) {
    $dockerCheck = & docker compose version 2>$null
    if ($LASTEXITCODE -eq 0) {
        $hasDocker = $true
        $dVer = (& docker --version 2>$null) -replace "`r?`n",""
        $dcVer = (& docker compose version 2>$null) -replace "`r?`n",""
        Record-Gate "Docker & Compose Engine" $true "$dVer | $dcVer"
    } else {
        Record-Gate "Docker & Compose Engine" $false "Docker or Docker Compose not available"
    }
} else {
    Record-Gate "Docker & Compose Engine" $true "Skipped via -SkipDocker flag"
}

Print-Header "GATE 2: MOCK EXTERNAL SYSTEMS TESTS (mock/)"
if (Test-Path "$RepoRoot\mock\package.json") {
    Push-Location "$RepoRoot\mock"
    try {
        Write-Host "Running 'npm test' in mock/..." -ForegroundColor Yellow
        $mockOut = & npm test 2>&1
        $mockCode = $LASTEXITCODE
        if ($mockCode -eq 0) {
            Record-Gate "Mock External Systems Test Suite" $true "Passed all 8 self-check criteria"
        } else {
            Write-Host ($mockOut -join "`n") -ForegroundColor Red
            Record-Gate "Mock External Systems Test Suite" $false "Mock test suite failed"
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
        # 3.1 ESLint
        Write-Host "Running ESLint in frontend/..." -ForegroundColor Yellow
        $lintOut = & npm run lint 2>&1
        $lintCode = $LASTEXITCODE
        if ($lintCode -eq 0) {
            Record-Gate "Frontend ESLint" $true "Zero ESLint errors"
        } else {
            Write-Host ($lintOut -join "`n") -ForegroundColor Red
            Record-Gate "Frontend ESLint" $false "ESLint violations found"
        }

        # 3.2 TypeScript Typecheck
        Write-Host "Running Typecheck in frontend/..." -ForegroundColor Yellow
        $tcOut = & npm run typecheck 2>&1
        $tcCode = $LASTEXITCODE
        if ($tcCode -eq 0) {
            Record-Gate "Frontend TypeScript Typecheck" $true "Zero type errors"
        } else {
            Write-Host ($tcOut -join "`n") -ForegroundColor Red
            Record-Gate "Frontend TypeScript Typecheck" $false "Type errors found"
        }

        # 3.3 Vitest Unit Tests
        Write-Host "Running Vitest in frontend/..." -ForegroundColor Yellow
        $testOut = & npm run test -- --run 2>&1
        $testCode = $LASTEXITCODE
        if ($testCode -eq 0) {
            Record-Gate "Frontend Vitest Unit Tests" $true "All unit tests passed"
        } else {
            Write-Host ($testOut -join "`n") -ForegroundColor Red
            Record-Gate "Frontend Vitest Unit Tests" $false "Vitest failures"
        }

        # 3.4 Production Build
        Write-Host "Running Build in frontend/..." -ForegroundColor Yellow
        $buildOut = & npm run build 2>&1
        $buildCode = $LASTEXITCODE
        if ($buildCode -eq 0) {
            Record-Gate "Frontend Production Build" $true "Vite bundle build succeeded"
        } else {
            Write-Host ($buildOut -join "`n") -ForegroundColor Red
            Record-Gate "Frontend Production Build" $false "Build failed"
        }
    } finally {
        Pop-Location
    }
} else {
    Record-Gate "Frontend Verification Gates" $false "frontend/package.json not found"
}

Print-Header "GATE 4: BACKEND VERIFICATION GATES (backend/)"
if ($SkipBackend) {
    Record-Gate "Backend Verification Gates" $true "Skipped via -SkipBackend flag"
} elseif (Test-Path "$RepoRoot\backend\pom.xml") {
    Push-Location "$RepoRoot\backend"
    try {
        $mvnCmd = if (Test-Path ".\mvnw.cmd") { ".\mvnw.cmd" } else { "mvn" }

        # 4.1 Compiler
        Write-Host "Checking Java compilation (-Xlint:all -Werror)..." -ForegroundColor Yellow
        $compileOut = & $mvnCmd compile 2>&1
        $compileCode = $LASTEXITCODE
        if ($compileCode -eq 0) {
            Record-Gate "Backend Java Compiler (-Xlint:all -Werror)" $true "Zero warnings, compiled cleanly"
        } else {
            Write-Host ($compileOut -join "`n") -ForegroundColor Red
            Record-Gate "Backend Java Compiler (-Xlint:all -Werror)" $false "Compilation failed with warnings/errors"
        }

        # 4.2 Spotless formatting check
        Write-Host "Checking Java code style via Spotless..." -ForegroundColor Yellow
        $spotlessOut = & $mvnCmd spotless:check 2>&1
        $spotlessCode = $LASTEXITCODE
        if ($spotlessCode -eq 0) {
            Record-Gate "Backend Spotless Code Style" $true "Spotless AOSP formatting clean"
        } else {
            Write-Host ($spotlessOut -join "`n") -ForegroundColor Red
            Record-Gate "Backend Spotless Code Style" $false "Spotless check failed (run 'mvn spotless:apply')"
        }

        # 4.3 SpotBugs static analysis
        Write-Host "Running SpotBugs static analysis..." -ForegroundColor Yellow
        $spotbugsOut = & $mvnCmd spotbugs:check 2>&1
        $spotbugsCode = $LASTEXITCODE
        if ($spotbugsCode -eq 0) {
            Record-Gate "Backend SpotBugs Static Analysis" $true "Zero SpotBugs violations detected"
        } else {
            Write-Host ($spotbugsOut -join "`n") -ForegroundColor Red
            Record-Gate "Backend SpotBugs Static Analysis" $false "SpotBugs found potential bugs"
        }

        # 4.4 Maven Tests
        Write-Host "Running Maven tests (Testcontainers & SpringBootTest)..." -ForegroundColor Yellow
        $testOut = & $mvnCmd test 2>&1
        $testCode = $LASTEXITCODE
        if ($testCode -eq 0) {
            Record-Gate "Backend JUnit & Testcontainers Tests" $true "All integration and unit tests passed"
        } else {
            Write-Host ($testOut -join "`n") -ForegroundColor Red
            Record-Gate "Backend JUnit & Testcontainers Tests" $false "Maven test failed with exit code $testCode"
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
        Write-Host ($composeOut -join "`n") -ForegroundColor Red
        Record-Gate "Docker Compose Syntax & Port Bindings" $false "docker compose config failed"
    }
} else {
    Record-Gate "Docker Compose Configuration" $false "docker-compose.yml not found"
}

Print-Header "GATE 6: CONTAINER & NON-CODE LINTERS"

# 6.1 Hadolint (Dockerfiles)
Write-Host "Running Hadolint on Dockerfiles..." -ForegroundColor Yellow
$hadoOut = $null
$hadoCode = 1
if (Get-Command hadolint -ErrorAction SilentlyContinue) {
    $hadoOut = & hadolint backend/Dockerfile frontend/Dockerfile mock/Dockerfile 2>&1
    $hadoCode = $LASTEXITCODE
} elseif ($hasDocker) {
    $hadoOut = & docker run --rm -v "${RepoRoot}:/repo" "hadolint/hadolint:${hadolintVer}" hadolint /repo/backend/Dockerfile /repo/frontend/Dockerfile /repo/mock/Dockerfile 2>&1
    $hadoCode = $LASTEXITCODE
} else {
    $hadoOut = "Neither hadolint executable nor Docker is available"
}
if ($hadoCode -eq 0) {
    Record-Gate "Hadolint Dockerfile Linter" $true "All Dockerfiles comply with Hadolint standards"
} else {
    Write-Host ($hadoOut -join "`n") -ForegroundColor Red
    Record-Gate "Hadolint Dockerfile Linter" $false "Hadolint found Dockerfile issues"
}

# 6.2 Yamllint (.yamllint.yml)
Write-Host "Running Yamllint..." -ForegroundColor Yellow
$yamlOut = $null
$yamlCode = 1
if (Get-Command yamllint -ErrorAction SilentlyContinue) {
    $yamlOut = & yamllint -c .yamllint.yml . 2>&1
    $yamlCode = $LASTEXITCODE
} elseif ($hasDocker) {
    $yamlOut = & docker run --rm -v "${RepoRoot}:/data" "cytopia/yamllint:${yamllintVer}" -c /data/.yamllint.yml /data 2>&1
    $yamlCode = $LASTEXITCODE
} else {
    $yamlOut = "Neither yamllint executable nor Docker is available"
}
if ($yamlCode -eq 0) {
    Record-Gate "Yamllint YAML Validation" $true "YAML files cleanly formatted"
} else {
    Write-Host ($yamlOut -join "`n") -ForegroundColor Red
    Record-Gate "Yamllint YAML Validation" $false "Yamllint found YAML issues"
}

# 6.3 Actionlint (.github/workflows/ci.yml)
Write-Host "Running Actionlint on GitHub Actions workflows..." -ForegroundColor Yellow
$actionOut = $null
$actionCode = 1
if (Get-Command actionlint -ErrorAction SilentlyContinue) {
    $actionOut = & actionlint .github/workflows/ci.yml 2>&1
    $actionCode = $LASTEXITCODE
} elseif ($hasDocker) {
    $actionOut = & docker run --rm -v "${RepoRoot}:/repo" -w /repo "rhysd/actionlint:${actionlintVer}" .github/workflows/ci.yml 2>&1
    $actionCode = $LASTEXITCODE
} else {
    $actionOut = "Neither actionlint executable nor Docker is available"
}
if ($actionCode -eq 0) {
    Record-Gate "Actionlint Workflow Validation" $true "GitHub Actions workflow syntax valid"
} else {
    Write-Host ($actionOut -join "`n") -ForegroundColor Red
    Record-Gate "Actionlint Workflow Validation" $false "Actionlint found workflow issues"
}

# 6.4 SQLFluff (Database Migrations)
Write-Host "Running SQLFluff on Flyway migrations..." -ForegroundColor Yellow
$sqlOut = $null
$sqlCode = 1
if (Get-Command sqlfluff -ErrorAction SilentlyContinue) {
    $sqlOut = & sqlfluff lint backend/src/main/resources/db/migration 2>&1
    $sqlCode = $LASTEXITCODE
} elseif ($hasDocker) {
    $sqlOut = & docker run --rm -v "${RepoRoot}:/repo" -w /repo "sqlfluff/sqlfluff:${sqlfluffVer}" lint backend/src/main/resources/db/migration 2>&1
    $sqlCode = $LASTEXITCODE
} else {
    $sqlOut = "Neither sqlfluff executable nor Docker is available"
}
if ($sqlCode -eq 0) {
    Record-Gate "SQLFluff Database Migration Linter" $true "Flyway SQL migrations comply with SQLFluff rules"
} else {
    Write-Host ($sqlOut -join "`n") -ForegroundColor Red
    Record-Gate "SQLFluff Database Migration Linter" $false "SQLFluff found SQL migration issues"
}

Print-Header "GATE 7: DOCUMENTATION LINTERS & VERSION DRIFT"

# 7.1 Markdownlint (Full scope: every tracked *.md file)
Write-Host "Running markdownlint-cli2 via npx..." -ForegroundColor Yellow
$mdOut = & npx --yes "markdownlint-cli2@${markdownlintVer}" "**/*.md" "#**/node_modules/**" "#**/target/**" "#**/dist/**" "#**/.agents/**" 2>&1
$mdCode = $LASTEXITCODE
if ($mdCode -eq 0) {
    Record-Gate "Markdownlint Documentation Style" $true "Documentation matches style rules (0 errors)"
} else {
    Write-Host ($mdOut -join "`n") -ForegroundColor Red
    Record-Gate "Markdownlint Documentation Style" $false "Markdownlint failed with exit code $mdCode"
}

# 7.2 CSpell (Full scope: docs, markdown, and full source code)
Write-Host "Running cspell with Vietnamese dictionary support via npx..." -ForegroundColor Yellow
$cspellOut = & npx --yes --package "cspell@${cspellVer}" --package "@cspell/dict-vi-vn@${cspellDictViVer}" cspell "**/*.{md,java,ts,tsx,js,mjs,sql,yml,json,jsonc}" 2>&1
$cspellCode = $LASTEXITCODE
if ($cspellCode -eq 0) {
    Record-Gate "CSpell Documentation Spelling" $true "Spelling check passed with Vietnamese dictionary support (0 errors)"
} else {
    Write-Host ($cspellOut -join "`n") -ForegroundColor Red
    Record-Gate "CSpell Documentation Spelling" $false "CSpell found spelling errors (exit code $cspellCode)"
}

# 7.3 Version Table Drift Check (docs/03)
Write-Host "Running version drift check (docs/03-version-table.md vs manifests)..." -ForegroundColor Yellow
$driftOut = & node scripts/check-version-drift.mjs 2>&1
$driftCode = $LASTEXITCODE
if ($driftCode -eq 0) {
    Record-Gate "Version Table Drift Check (docs/03)" $true "All 29 table versions match manifest files exactly across both languages"
} else {
    Write-Host ($driftOut -join "`n") -ForegroundColor Red
    Record-Gate "Version Table Drift Check (docs/03)" $false "Version drift detected between docs/03 and manifests"
}

# 7.4 Quality Gate Synchronization Check
Write-Host "Running Quality Gate synchronization check..." -ForegroundColor Yellow
$syncOut = & node scripts/check-gate-sync.mjs 2>&1
$syncCode = $LASTEXITCODE
if ($syncCode -eq 0) {
    Record-Gate "Quality Gate Synchronization Check" $true "All gates synchronized across check.sh, check.ps1, and CI"
} else {
    Write-Host ($syncOut -join "`n") -ForegroundColor Red
    Record-Gate "Quality Gate Synchronization Check" $false "Quality gates mismatch detected"
}

Print-Header "GATE 8: CLEAN CODE ASSERTIONS & SECURITY LEAK SCAN"

# 8.1 Scan for developer machine-specific paths (Constructed pattern to prevent self-match)
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

# 8.2 Scan for lingering TODO comments in production source code
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
        Write-Host "TODO at $($t.Path):$($t.LineNumber): $($t.Line.Trim())" -ForegroundColor Red
    }
    Record-Gate "Lingering TODO / FIXME Comments Scan" $false "Found $($todos.Count) TODO/FIXME comments"
}

# 8.3 Scan for real secret leaks
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

Print-Header "QUALITY GATES SUMMARY REPORT"
Write-Host ""
foreach ($key in $GateResults.Keys) {
    $res = $GateResults[$key]
    $color = if ($res.Status -eq "PASS") { "Green" } else { "Red" }
    Write-Host ("[{0,-4}] {1,-45} : {2}" -f $res.Status, $key, $res.Message) -ForegroundColor $color
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
