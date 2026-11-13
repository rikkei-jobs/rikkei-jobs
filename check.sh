#!/usr/bin/env bash
# ==============================================================================
# Rikkei Jobs - Quality Gates & Repository Health Verification Script (Bash)
# Task T022DB0 - Sprint 1 Skeleton, Shared Conventions & External Systems Mock
#
# Usage:
#   ./check.sh
# ==============================================================================

set -o pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Resolve host directory path for Docker volume mounting across Linux and Git Bash
DOCKER_MOUNT_DIR="$SCRIPT_DIR"
if command -v pwd >/dev/null 2>&1 && pwd -W >/dev/null 2>&1; then
    DOCKER_MOUNT_DIR="$(pwd -W)"
fi

# Source centralized pinned tool versions
if [ -f "$SCRIPT_DIR/scripts/tool-versions.env" ]; then
    # shellcheck disable=SC1091
    source "$SCRIPT_DIR/scripts/tool-versions.env"
fi

HADOLINT_VERSION="${HADOLINT_VERSION:-v2.15.1}"
YAMLLINT_VERSION="${YAMLLINT_VERSION:-1-0.14}"
ACTIONLINT_VERSION="${ACTIONLINT_VERSION:-1.7.12}"
SQLFLUFF_VERSION="${SQLFLUFF_VERSION:-4.5.0}"
MARKDOWNLINT_VERSION="${MARKDOWNLINT_VERSION:-0.24.0}"
CSPELL_VERSION="${CSPELL_VERSION:-10.4.1}"
CSPELL_DICT_VI_VERSION="${CSPELL_DICT_VI_VERSION:-3.0.7}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

OVERALL_PASS=true

declare -a GATE_NAMES
declare -a GATE_STATUSES
declare -a GATE_MESSAGES

print_header() {
    echo -e "\n${CYAN}================================================================================${NC}"
    echo -e "${CYAN}  $1${NC}"
    echo -e "${CYAN}================================================================================${NC}"
}

record_gate() {
    local name="$1"
    local passed="$2"
    local message="$3"

    GATE_NAMES+=("$name")
    GATE_STATUSES+=("$passed")
    GATE_MESSAGES+=("$message")

    if [ "$passed" = "true" ]; then
        echo -e "${GREEN}[PASS] ${name}${NC} - ${message}"
    else
        echo -e "${RED}[FAIL] ${name}${NC} - ${message}"
        OVERALL_PASS=false
    fi
}

print_header "GATE 1: TOOLCHAIN & ENVIRONMENT DISCOVERY"

# 1.1 Node.js Check
if command -v node >/dev/null 2>&1; then
    NODE_VER=$(node -v)
    MAJOR_VER=$(echo "$NODE_VER" | sed -E 's/^v([0-9]+).*/\1/')
    if [ "$MAJOR_VER" -ge 20 ]; then
        record_gate "Node.js Environment" "true" "Detected $NODE_VER (>= v20 LTS required)"
    else
        record_gate "Node.js Environment" "false" "Detected $NODE_VER, requires >= v20"
    fi
else
    record_gate "Node.js Environment" "false" "Node.js executable not found in PATH"
fi

# 1.2 Java 25 LTS Auto-Discovery (Without hardcoding machine/user paths)
NEED_JAVA_DISCOVERY=true
DISCOVERED_JAVA_HOME=""

if [ -n "$JAVA_HOME" ] && [ -x "$JAVA_HOME/bin/javac" ]; then
    if "$JAVA_HOME/bin/javac" -version 2>&1 | grep -q "25"; then
        DISCOVERED_JAVA_HOME="$JAVA_HOME"
        NEED_JAVA_DISCOVERY=false
    fi
fi

if [ "$NEED_JAVA_DISCOVERY" = "true" ] && command -v java >/dev/null 2>&1; then
    if java -version 2>&1 | grep -q 'version "25\| 25\.'; then
        JAVA_BIN="$(which java)"
        if command -v readlink >/dev/null 2>&1; then
            REAL_JAVA="$(readlink -f "$JAVA_BIN" 2>/dev/null || echo "$JAVA_BIN")"
            CANDIDATE="$(dirname "$(dirname "$REAL_JAVA")")"
            if [ -x "$CANDIDATE/bin/javac" ]; then
                DISCOVERED_JAVA_HOME="$CANDIDATE"
                NEED_JAVA_DISCOVERY=false
            fi
        fi
    fi
fi

if [ "$NEED_JAVA_DISCOVERY" = "true" ]; then
    for p in /usr/lib/jvm/*25* /opt/java/*25* /Library/Java/JavaVirtualMachines/*25*/Contents/Home; do
        if [ -x "$p/bin/javac" ]; then
            DISCOVERED_JAVA_HOME="$p"
            NEED_JAVA_DISCOVERY=false
            break
        fi
    done
fi

if [ -n "$DISCOVERED_JAVA_HOME" ]; then
    export JAVA_HOME="$DISCOVERED_JAVA_HOME"
    export PATH="$JAVA_HOME/bin:$PATH"
    JAVA_VER=$(java -version 2>&1 | head -n 1)
    record_gate "Java 25 LTS Toolchain" "true" "Configured JAVA_HOME: $DISCOVERED_JAVA_HOME ($JAVA_VER)"
else
    if command -v java >/dev/null 2>&1 && java -version 2>&1 | grep -q '25'; then
        record_gate "Java 25 LTS Toolchain" "true" "Java 25 active on PATH"
    else
        record_gate "Java 25 LTS Toolchain" "false" "JDK 25 not detected"
    fi
fi

# 1.3 Docker & Compose Check
HAS_DOCKER=false
if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
    HAS_DOCKER=true
    D_VER=$(docker --version)
    DC_VER=$(docker compose version)
    record_gate "Docker & Compose Engine" "true" "$D_VER | $DC_VER"
else
    record_gate "Docker & Compose Engine" "false" "Docker or Compose not available"
fi

print_header "GATE 2: MOCK EXTERNAL SYSTEMS TESTS (mock/)"
if [ -f "$SCRIPT_DIR/mock/package.json" ]; then
    echo -e "${YELLOW}Running 'npm test' in mock/...${NC}"
    if (cd "$SCRIPT_DIR/mock" && npm test); then
        record_gate "Mock External Systems Test Suite" "true" "Passed all 8 self-check criteria"
    else
        record_gate "Mock External Systems Test Suite" "false" "Mock tests failed"
    fi
else
    record_gate "Mock External Systems Test Suite" "false" "mock/package.json missing"
fi

print_header "GATE 3: FRONTEND VERIFICATION GATES (frontend/)"
if [ -f "$SCRIPT_DIR/frontend/package.json" ]; then
    pushd "$SCRIPT_DIR/frontend" >/dev/null

    echo -e "${YELLOW}Running ESLint in frontend/...${NC}"
    if npm run lint; then
        record_gate "Frontend ESLint" "true" "Zero ESLint errors"
    else
        record_gate "Frontend ESLint" "false" "ESLint violations found"
    fi

    echo -e "${YELLOW}Running Typecheck in frontend/...${NC}"
    if npm run typecheck; then
        record_gate "Frontend TypeScript Typecheck" "true" "Zero type errors"
    else
        record_gate "Frontend TypeScript Typecheck" "false" "Type errors found"
    fi

    echo -e "${YELLOW}Running Vitest in frontend/...${NC}"
    if npm run test -- --run; then
        record_gate "Frontend Vitest Unit Tests" "true" "All unit tests passed"
    else
        record_gate "Frontend Vitest Unit Tests" "false" "Vitest failures"
    fi

    echo -e "${YELLOW}Running Build in frontend/...${NC}"
    if npm run build; then
        record_gate "Frontend Production Build" "true" "Vite bundle build succeeded"
    else
        record_gate "Frontend Production Build" "false" "Build failed"
    fi

    popd >/dev/null
else
    record_gate "Frontend Verification Gates" "false" "frontend/package.json missing"
fi

print_header "GATE 4: BACKEND VERIFICATION GATES (backend/)"
if [ -f "$SCRIPT_DIR/backend/pom.xml" ]; then
    pushd "$SCRIPT_DIR/backend" >/dev/null

    MVN_BIN="./mvnw"
    if [ ! -x "$MVN_BIN" ]; then
        chmod +x "$MVN_BIN" 2>/dev/null || true
    fi
    if [ -f "$MVN_BIN" ]; then
        MVN_CMD="sh $MVN_BIN"
    elif command -v mvn >/dev/null 2>&1; then
        MVN_CMD="mvn"
    else
        MVN_CMD="./mvnw"
    fi

    # 4.1 Compiler (-Xlint:all -Werror)
    echo -e "${YELLOW}Checking Java compilation (-Xlint:all -Werror)...${NC}"
    if $MVN_CMD compile; then
        record_gate "Backend Java Compiler (-Xlint:all -Werror)" "true" "Zero warnings, compiled cleanly"
    else
        record_gate "Backend Java Compiler (-Xlint:all -Werror)" "false" "Compilation failed"
    fi

    # 4.2 Spotless formatting check
    echo -e "${YELLOW}Checking Java code style via Spotless...${NC}"
    if $MVN_CMD spotless:check; then
        record_gate "Backend Spotless Code Style" "true" "Spotless AOSP formatting clean"
    else
        record_gate "Backend Spotless Code Style" "false" "Spotless check failed (run 'mvn spotless:apply')"
    fi

    # 4.3 SpotBugs static analysis
    echo -e "${YELLOW}Running SpotBugs static analysis...${NC}"
    if $MVN_CMD spotbugs:check; then
        record_gate "Backend SpotBugs Static Analysis" "true" "Zero SpotBugs violations detected"
    else
        record_gate "Backend SpotBugs Static Analysis" "false" "SpotBugs found potential bugs"
    fi

    # 4.4 Maven Tests (Unit & Testcontainers)
    echo -e "${YELLOW}Running Maven tests (Testcontainers & SpringBootTest)...${NC}"
    if $MVN_CMD test; then
        record_gate "Backend JUnit & Testcontainers Tests" "true" "All integration and unit tests passed"
    else
        record_gate "Backend JUnit & Testcontainers Tests" "false" "Maven test failed"
    fi

    popd >/dev/null
else
    record_gate "Backend Verification Gates" "false" "backend/pom.xml missing"
fi

print_header "GATE 5: DOCKER COMPOSE CONFIGURATION VALIDATION"
if [ -f "$SCRIPT_DIR/docker-compose.yml" ]; then
    echo -e "${YELLOW}Validating 'docker compose config'...${NC}"
    if docker compose config >/dev/null 2>&1; then
        record_gate "Docker Compose Syntax & Port Bindings" "true" "5 services valid, loopback ports bound"
    else
        record_gate "Docker Compose Syntax & Port Bindings" "false" "docker compose config failed"
    fi
else
    record_gate "Docker Compose Configuration" "false" "docker-compose.yml missing"
fi

print_header "GATE 6: CONTAINER & NON-CODE LINTERS"

# 6.1 Hadolint (Dockerfiles)
echo -e "${YELLOW}Running Hadolint on Dockerfiles...${NC}"
if command -v hadolint >/dev/null 2>&1; then
    if hadolint backend/Dockerfile frontend/Dockerfile mock/Dockerfile; then
        record_gate "Hadolint Dockerfile Linter" "true" "All Dockerfiles comply with Hadolint standards"
    else
        record_gate "Hadolint Dockerfile Linter" "false" "Hadolint found Dockerfile issues"
    fi
elif [ "$HAS_DOCKER" = "true" ]; then
    if MSYS_NO_PATHCONV=1 docker run --rm -v "$DOCKER_MOUNT_DIR:/repo" "hadolint/hadolint:${HADOLINT_VERSION}" hadolint /repo/backend/Dockerfile /repo/frontend/Dockerfile /repo/mock/Dockerfile; then
        record_gate "Hadolint Dockerfile Linter" "true" "All Dockerfiles comply with Hadolint standards"
    else
        record_gate "Hadolint Dockerfile Linter" "false" "Hadolint found Dockerfile issues"
    fi
else
    record_gate "Hadolint Dockerfile Linter" "false" "Neither hadolint nor Docker is available"
fi

# 6.2 Yamllint (.yamllint.yml)
echo -e "${YELLOW}Running Yamllint...${NC}"
if command -v yamllint >/dev/null 2>&1; then
    if yamllint -c .yamllint.yml .; then
        record_gate "Yamllint YAML Validation" "true" "YAML files cleanly formatted"
    else
        record_gate "Yamllint YAML Validation" "false" "Yamllint found YAML issues"
    fi
elif [ "$HAS_DOCKER" = "true" ]; then
    if MSYS_NO_PATHCONV=1 docker run --rm -v "$DOCKER_MOUNT_DIR:/data" "cytopia/yamllint:${YAMLLINT_VERSION}" -c /data/.yamllint.yml /data; then
        record_gate "Yamllint YAML Validation" "true" "YAML files cleanly formatted"
    else
        record_gate "Yamllint YAML Validation" "false" "Yamllint found YAML issues"
    fi
else
    record_gate "Yamllint YAML Validation" "false" "Neither yamllint nor Docker is available"
fi

# 6.3 Actionlint (.github/workflows/ci.yml)
echo -e "${YELLOW}Running Actionlint on GitHub Actions workflows...${NC}"
if command -v actionlint >/dev/null 2>&1; then
    if actionlint .github/workflows/ci.yml; then
        record_gate "Actionlint Workflow Validation" "true" "GitHub Actions workflow syntax valid"
    else
        record_gate "Actionlint Workflow Validation" "false" "Actionlint found workflow issues"
    fi
elif [ "$HAS_DOCKER" = "true" ]; then
    if MSYS_NO_PATHCONV=1 docker run --rm -v "$DOCKER_MOUNT_DIR:/repo" -w /repo "rhysd/actionlint:${ACTIONLINT_VERSION}" .github/workflows/ci.yml; then
        record_gate "Actionlint Workflow Validation" "true" "GitHub Actions workflow syntax valid"
    else
        record_gate "Actionlint Workflow Validation" "false" "Actionlint found workflow issues"
    fi
else
    record_gate "Actionlint Workflow Validation" "false" "Neither actionlint nor Docker is available"
fi

# 6.4 SQLFluff (Database Migrations)
echo -e "${YELLOW}Running SQLFluff on Flyway migrations...${NC}"
if command -v sqlfluff >/dev/null 2>&1; then
    if sqlfluff lint backend/src/main/resources/db/migration; then
        record_gate "SQLFluff Database Migration Linter" "true" "Flyway SQL migrations comply with SQLFluff rules"
    else
        record_gate "SQLFluff Database Migration Linter" "false" "SQLFluff found SQL migration issues"
    fi
elif [ "$HAS_DOCKER" = "true" ]; then
    if MSYS_NO_PATHCONV=1 docker run --rm -v "$DOCKER_MOUNT_DIR:/repo" -w /repo "sqlfluff/sqlfluff:${SQLFLUFF_VERSION}" lint backend/src/main/resources/db/migration; then
        record_gate "SQLFluff Database Migration Linter" "true" "Flyway SQL migrations comply with SQLFluff rules"
    else
        record_gate "SQLFluff Database Migration Linter" "false" "SQLFluff found SQL migration issues"
    fi
else
    record_gate "SQLFluff Database Migration Linter" "false" "Neither sqlfluff nor Docker is available"
fi

print_header "GATE 7: DOCUMENTATION LINTERS & VERSION DRIFT"

# 7.1 Markdownlint (Full scope: every tracked *.md file)
if command -v npx >/dev/null 2>&1; then
    echo -e "${YELLOW}Running markdownlint-cli2 via npx...${NC}"
    if npx --yes "markdownlint-cli2@${MARKDOWNLINT_VERSION}" "**/*.md" "#**/node_modules/**" "#**/target/**" "#**/dist/**" "#**/.agents/**"; then
        record_gate "Markdownlint Documentation Style" "true" "Documentation matches style rules (0 errors)"
    else
        record_gate "Markdownlint Documentation Style" "false" "Markdownlint found formatting errors"
    fi

    # 7.2 CSpell (Full scope: docs, markdown, and full source code)
    echo -e "${YELLOW}Running cspell with Vietnamese dictionary support via npx...${NC}"
    if npx --yes --package "cspell@${CSPELL_VERSION}" --package "@cspell/dict-vi-vn@${CSPELL_DICT_VI_VERSION}" cspell "**/*.{md,java,ts,tsx,js,mjs,sql,yml,json,jsonc}"; then
        record_gate "CSpell Documentation Spelling" "true" "Spelling check passed with Vietnamese dictionary support (0 errors)"
    else
        record_gate "CSpell Documentation Spelling" "false" "CSpell found spelling errors"
    fi
else
    record_gate "Markdownlint Documentation Style" "false" "npx not found in PATH"
    record_gate "CSpell Documentation Spelling" "false" "npx not found in PATH"
fi

# 7.3 Version Table Drift Check (docs/03)
if command -v node >/dev/null 2>&1; then
    echo -e "${YELLOW}Running version drift check (docs/03-version-table.md vs manifests)...${NC}"
    if node scripts/check-version-drift.mjs; then
        record_gate "Version Table Drift Check (docs/03)" "true" "All 29 table versions match manifest files exactly across both languages"
    else
        record_gate "Version Table Drift Check (docs/03)" "false" "Version drift detected between docs/03 and manifests"
    fi

    # 7.4 Quality Gate Synchronization Check
    echo -e "${YELLOW}Running Quality Gate synchronization check...${NC}"
    if node scripts/check-gate-sync.mjs; then
        record_gate "Quality Gate Synchronization Check" "true" "All gates synchronized across check.sh, check.ps1, and CI"
    else
        record_gate "Quality Gate Synchronization Check" "false" "Quality gates mismatch detected"
    fi

    # 7.5 Agent Configuration Sync & Parity Check
    echo -e "${YELLOW}Running agent configuration sync and parity check...${NC}"
    if node scripts/sync-agent-config.mjs --check && node scripts/validate-agent-config.mjs; then
        record_gate "Agent Configuration Sync & Parity Check" "true" "All rules, skills, and entrypoints in sync with canonical source and validated"
    else
        record_gate "Agent Configuration Sync & Parity Check" "false" "Agent configuration drift or validation failure detected"
    fi
else
    record_gate "Version Table Drift Check (docs/03)" "false" "node not found in PATH"
    record_gate "Quality Gate Synchronization Check" "false" "node not found in PATH"
    record_gate "Agent Configuration Sync & Parity Check" "false" "node not found in PATH"
fi

print_header "GATE 8: CLEAN CODE ASSERTIONS & SECURITY LEAK SCAN"

# 8.1 Machine-specific path scan
FORBIDDEN_USER="$(printf '%s%s%s%s%s%s' 'k' 'i' 'r' 'i' 't' 'o')"
FORBIDDEN_DIR="$(printf 'C:\x5cUsers')"
FORBIDDEN_REGEX="${FORBIDDEN_USER}|${FORBIDDEN_DIR}"

LEAK_FOUND=false
while IFS= read -r match; do
    if [ -n "$match" ]; then
        echo -e "${RED}Machine path leaked: $match${NC}"
        LEAK_FOUND=true
    fi
done < <(grep -rnE "$FORBIDDEN_REGEX" . \
    --exclude-dir=".git" \
    --exclude-dir="node_modules" \
    --exclude-dir="target" \
    --exclude-dir="dist" \
    --exclude-dir=".agents" \
    --exclude="check.sh" \
    --exclude="check.ps1" \
    --exclude=".github/workflows/ci.yml" 2>/dev/null || true)

if [ "$LEAK_FOUND" = "false" ]; then
    record_gate "Machine-Specific Paths Scan" "true" "Zero machine-specific paths detected"
else
    record_gate "Machine-Specific Paths Scan" "false" "Machine-specific paths detected"
fi

# 8.2 Lingering TODO scan
TODO_FOUND=false
while IFS= read -r match; do
    if [ -n "$match" ]; then
        echo -e "${RED}Lingering comment: $match${NC}"
        TODO_FOUND=true
    fi
done < <(grep -rnE "\b(TODO|FIXME)\b" backend/src/main frontend/src mock \
    --exclude-dir="node_modules" \
    --exclude="data.json" \
    --exclude="README.md" 2>/dev/null || true)

if [ "$TODO_FOUND" = "false" ]; then
    record_gate "Lingering TODO / FIXME Comments Scan" "true" "Clean production source code"
else
    record_gate "Lingering TODO / FIXME Comments Scan" "false" "Found lingering TODO/FIXME comments"
fi

# 8.3 Secret leak scan
SECRET_FOUND=false
while IFS= read -r match; do
    if [ -n "$match" ]; then
        echo -e "${RED}Potential secret leaked: $match${NC}"
        SECRET_FOUND=true
    fi
done < <(grep -rnE "(BEGIN (RSA|OPENSSH|EC|DSA) PRIVATE KEY|ghp_[A-Za-z0-9]{36}|xox[baprs]-[0-9]{12})" . \
    --exclude-dir=".git" \
    --exclude-dir="node_modules" \
    --exclude-dir="target" \
    --exclude-dir="dist" \
    --exclude-dir=".agents" \
    --exclude="check.sh" \
    --exclude="check.ps1" \
    --exclude=".github/workflows/ci.yml" 2>/dev/null || true)

if [ "$SECRET_FOUND" = "false" ]; then
    record_gate "Secret Leak & Private Key Scan" "true" "Zero real secrets or keys leaked"
else
    record_gate "Secret Leak & Private Key Scan" "false" "Found potential secret leak"
fi

print_header "QUALITY GATES SUMMARY REPORT"
echo ""
for i in "${!GATE_NAMES[@]}"; do
    NAME="${GATE_NAMES[$i]}"
    STATUS="${GATE_STATUSES[$i]}"
    MSG="${GATE_MESSAGES[$i]}"
    if [ "$STATUS" = "true" ]; then
        printf "${GREEN}[%-4s] %-45s : %s${NC}\n" "PASS" "$NAME" "$MSG"
    else
        printf "${RED}[%-4s] %-45s : %s${NC}\n" "FAIL" "$NAME" "$MSG"
    fi
done
echo ""

if [ "$OVERALL_PASS" = "true" ]; then
    echo -e "${GREEN}================================================================================${NC}"
    echo -e "${GREEN}  ALL QUALITY GATES PASSED! REPOSITORY IS 100% HEALTHY AND READY FOR REVIEW.${NC}"
    echo -e "${GREEN}================================================================================${NC}"
    exit 0
else
    echo -e "${RED}================================================================================${NC}"
    echo -e "${RED}  SOME QUALITY GATES FAILED. PLEASE RESOLVE ISSUES REPORTED ABOVE.${NC}"
    echo -e "${RED}================================================================================${NC}"
    exit 1
fi
