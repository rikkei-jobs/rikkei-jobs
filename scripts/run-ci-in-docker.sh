#!/usr/bin/env bash
# ==============================================================================
# Rikkei Jobs - Clean Docker CI Runner Harness (Defect D8)
# Executes all 6 jobs of .github/workflows/ci.yml inside an isolated container
# ==============================================================================

set -eo pipefail

check_port_conflicts() {
    local required_ports=(5433 8080 3000 9000 8025 1025)
    local conflict=false
    for port in "${required_ports[@]}"; do
        local is_open=false
        if (exec 3<>/dev/tcp/127.0.0.1/"$port") 2>/dev/null; then
            exec 3<&-
            exec 3>&-
            is_open=true
        elif (echo > /dev/tcp/127.0.0.1/"$port") 2>/dev/null; then
            is_open=true
        elif command -v nc >/dev/null 2>&1 && nc -z 127.0.0.1 "$port" 2>/dev/null; then
            is_open=true
        elif command -v python3 >/dev/null 2>&1 && python3 -c "import socket; s = socket.socket(); s.settimeout(0.1); exit(0 if s.connect_ex(('127.0.0.1', $port)) == 0 else 1)" 2>/dev/null; then
            is_open=true
        fi
        if [ "$is_open" = true ]; then
            echo "================================================================================" >&2
            echo "  FATAL ERROR: Port conflict detected on 127.0.0.1:${port}!" >&2
            conflict=true
        fi
    done
    if [ "$conflict" = true ]; then
        echo "  A development stack is already running on the host." >&2
        echo "  The CI harness will NOT stop or modify your running developer environment." >&2
        echo "  Please stop your dev stack or run in a clean environment." >&2
        echo "================================================================================" >&2
        return 1
    fi
    return 0
}

if [ ! -d "/host-repo" ]; then
    # --- HOST EXECUTION MODE ---
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
    cd "${REPO_ROOT}"

    # Isolate Docker Compose project name
    CI_PROJECT_NAME="rikkei-ci-$(date +%s)-$RANDOM"
    export COMPOSE_PROJECT_NAME="${CI_PROJECT_NAME}"

    # Pre-check port conflicts on host before allocating resources
    check_port_conflicts || exit 1

    # Check for stopped dev stack resources to display isolation notice
    check_dev_resources() {
        local has_dev=false
        if [ -n "$(docker volume ls -q --filter "name=^rikkei_postgres_data$")" ]; then
            has_dev=true
        elif [ -n "$(docker network ls -q --filter "name=^rikkei-network$")" ]; then
            has_dev=true
        elif [ -n "$(docker ps -aq --filter "name=^/rikkei-")" ]; then
            has_dev=true
        fi

        if [ "$has_dev" = true ]; then
            echo "--------------------------------------------------------------------------------"
            echo "[ISOLATION NOTICE] Developer resources detected on host (dev stack stopped)."
            echo "  Ports are free. Running harness with isolated Docker project: ${COMPOSE_PROJECT_NAME}"
            echo "  Developer volumes, networks, and containers are protected and will NOT be touched."
            echo "--------------------------------------------------------------------------------"
        fi
    }
    check_dev_resources

    IMAGE_TAG="${IMAGE_TAG:-rikkei-ci-runner}"

    echo "================================================================================"
    echo "  BUILDING CLEAN DOCKER CI RUNNER IMAGE: ${IMAGE_TAG}"
    echo "================================================================================"
    docker build -f scripts/ci-runner.Dockerfile -t "${IMAGE_TAG}" .

    VOL_NAME="rikkei-ci-vol-$(date +%s)-$RANDOM"
    echo "Creating isolated workspace volume: ${VOL_NAME}"
    docker volume create "${VOL_NAME}" >/dev/null

    cleanup_host() {
        echo "Cleaning up isolated CI resources for project: ${COMPOSE_PROJECT_NAME}"
        local ci_containers
        ci_containers=$(docker ps -aq --filter "label=com.docker.compose.project=${COMPOSE_PROJECT_NAME}" 2>/dev/null || true)
        if [ -n "$ci_containers" ]; then
            docker rm -f $ci_containers >/dev/null 2>&1 || true
        fi

        local ci_volumes
        ci_volumes=$(docker volume ls -q --filter "label=com.docker.compose.project=${COMPOSE_PROJECT_NAME}" 2>/dev/null || true)
        if [ -n "$ci_volumes" ]; then
            docker volume rm -f $ci_volumes >/dev/null 2>&1 || true
        fi

        local ci_networks
        ci_networks=$(docker network ls -q --filter "label=com.docker.compose.project=${COMPOSE_PROJECT_NAME}" 2>/dev/null || true)
        if [ -n "$ci_networks" ]; then
            docker network rm $ci_networks >/dev/null 2>&1 || true
        fi

        echo "Cleaning up workspace volume: ${VOL_NAME}"
        local removed=false
        for i in {1..5}; do
            if docker volume rm "${VOL_NAME}" >/dev/null 2>&1; then
                removed=true
                break
            fi
            sleep 0.5
        done
        if [ "$removed" = false ]; then
            docker volume rm -f "${VOL_NAME}" 2>/dev/null || true
        fi
    }
    trap cleanup_host EXIT INT TERM

    echo "================================================================================"
    echo "  LAUNCHING CLEAN DOCKER CI RUNNER HARNESS"
    echo "  Isolated Compose Project: ${COMPOSE_PROJECT_NAME}"
    echo "================================================================================"
    docker run --rm \
        --network host \
        -v /var/run/docker.sock:/var/run/docker.sock \
        -v "${REPO_ROOT}:/host-repo:ro" \
        -v "${VOL_NAME}:/ci-workspace" \
        -e "CI_VOLUME_NAME=${VOL_NAME}" \
        -e "COMPOSE_PROJECT_NAME=${COMPOSE_PROJECT_NAME}" \
        "${IMAGE_TAG}"
    exit $?
fi

# --- CONTAINER EXECUTION MODE ---
export COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-rikkei-ci-$(date +%s)-$RANDOM}"
echo "================================================================================"
echo "  CLEAN CONTAINER CI EXECUTION HARNESS INITIALIZING"
echo "  Isolated Compose Project: ${COMPOSE_PROJECT_NAME}"
echo "================================================================================"

# 1. Sync repository files from /host-repo (:ro) to /ci-workspace
# Strictly excluding host artifacts, node_modules, and cache
echo "[CI HARNESS] Copying source repository to isolated workspace (excluding host node_modules, target, cache)..."
rsync -a --delete \
    --exclude='node_modules' \
    --exclude='target' \
    --exclude='dist' \
    --exclude='.m2' \
    --exclude='.git' \
    --exclude='.agents' \
    /host-repo/ /ci-workspace/

cd /ci-workspace

# 2. Generate ephemeral docker-compose.override.yml to isolate containers, volumes, and network
echo "[CI HARNESS] Generating ephemeral isolated docker-compose.override.yml for project: ${COMPOSE_PROJECT_NAME}"
cat << OVERRIDE_EOF > /ci-workspace/docker-compose.override.yml
name: ${COMPOSE_PROJECT_NAME}

services:
  postgres:
    container_name: ${COMPOSE_PROJECT_NAME}-postgres
  mock:
    container_name: ${COMPOSE_PROJECT_NAME}-mock
  mailpit:
    container_name: ${COMPOSE_PROJECT_NAME}-mailpit
  backend:
    container_name: ${COMPOSE_PROJECT_NAME}-backend
  frontend:
    container_name: ${COMPOSE_PROJECT_NAME}-frontend

volumes:
  postgres_data:
    name: ${COMPOSE_PROJECT_NAME}_postgres_data

networks:
  rikkei-network:
    name: ${COMPOSE_PROJECT_NAME}_network
OVERRIDE_EOF

# 3. Configure Testcontainers and Docker wrapper for volume mounts in DooD environment
TC_HOST=""

# Step 2a: Honor pre-configured TESTCONTAINERS_HOST_OVERRIDE from environment if present
if [ -n "${TESTCONTAINERS_HOST_OVERRIDE:-}" ]; then
    echo "[CI HARNESS] Using pre-configured TESTCONTAINERS_HOST_OVERRIDE: ${TESTCONTAINERS_HOST_OVERRIDE}"
    TC_HOST="${TESTCONTAINERS_HOST_OVERRIDE}"
fi

# Step 2b: Query host.docker.internal, strictly preferring valid IPv4 address
if [ -z "$TC_HOST" ] && getent hosts host.docker.internal >/dev/null 2>&1; then
    # When multiple records (e.g. IPv6 ULA fdc4:... and IPv4 192.168.65.254) are returned, filter for IPv4
    TC_HOST="$(getent hosts host.docker.internal 2>/dev/null | awk '{ print $1 }' | grep -E '^([0-9]{1,3}\.){3}[0-9]{1,3}$' | head -n 1 || true)"
    if [ -z "$TC_HOST" ]; then
        # Fallback to first entry under host.docker.internal if only IPv6 exists
        TC_HOST="$(getent hosts host.docker.internal 2>/dev/null | awk '{ print $1 }' | head -n 1 || true)"
    fi
fi

# Step 2c: Query default gateway (via 'ip route' if available, or /proc/net/route)
if [ -z "$TC_HOST" ]; then
    if command -v ip >/dev/null 2>&1; then
        TC_HOST="$(ip -4 route show default 2>/dev/null | awk '{ for(i=1;i<=NF;i++) if($i=="via") print $(i+1) }' | head -n 1 || true)"
        if [ -z "$TC_HOST" ]; then
            TC_HOST="$(ip route show default 2>/dev/null | awk '{ for(i=1;i<=NF;i++) if($i=="via") print $(i+1) }' | grep -E '^([0-9]{1,3}\.){3}[0-9]{1,3}$' | head -n 1 || true)"
        fi
    elif [ -f /proc/net/route ]; then
        HEX_GW="$(awk '$2 == "00000000" && $3 != "00000000" { print $3; exit }' /proc/net/route 2>/dev/null || true)"
        if [ -n "$HEX_GW" ] && [ ${#HEX_GW} -eq 8 ]; then
            TC_HOST="$((0x${HEX_GW:6:2})).$((0x${HEX_GW:4:2})).$((0x${HEX_GW:2:2})).$((0x${HEX_GW:0:2}))"
        fi
    fi
fi

# Step 2d: Validate resolution with loud failure diagnostics
if [ -z "$TC_HOST" ]; then
    echo "================================================================================" >&2
    echo "  FATAL ERROR: [CI HARNESS] Could not resolve Testcontainers host IP (TC_HOST)!" >&2
    echo "================================================================================" >&2
    echo "Diagnostic information:" >&2
    echo "  - getent hosts host.docker.internal:" >&2
    getent hosts host.docker.internal 2>&1 | sed 's/^/      /' >&2 || echo "      (command failed or empty)" >&2
    echo "  - ip route show default:" >&2
    if command -v ip >/dev/null 2>&1; then
        ip route show default 2>&1 | sed 's/^/      /' >&2 || echo "      (command failed or empty)" >&2
    else
        echo "      (ip command not installed in container image)" >&2
    fi
    echo "  - /proc/net/route content:" >&2
    if [ -f /proc/net/route ]; then
        cat /proc/net/route | sed 's/^/      /' >&2
    else
        echo "      (/proc/net/route not available)" >&2
    fi
    echo "  - /etc/hosts content:" >&2
    cat /etc/hosts 2>&1 | sed 's/^/      /' >&2
    echo "================================================================================" >&2
    exit 1
fi
echo "[CI HARNESS] Configured Testcontainers Docker Host: ${TC_HOST}"
export TESTCONTAINERS_HOST_OVERRIDE="${TC_HOST}"
export TESTCONTAINERS_RYUK_DISABLED="true"
mkdir -p /root/.testcontainers
cat << TC_EOF > /root/.testcontainers.properties
docker.host=unix:///var/run/docker.sock
testcontainers.host.override=${TC_HOST}
ryuk.disabled=true
TC_EOF

if [ -n "$CI_VOLUME_NAME" ]; then
    echo "[CI HARNESS] Configuring Docker DooD volume mapping for volume: ${CI_VOLUME_NAME}"
    export CI_VOLUME_NAME
    REAL_DOCKER="$(which docker)"
    mkdir -p /opt/docker-wrapper
    cat << 'EOF' > /opt/docker-wrapper/docker
#!/usr/bin/env bash
REAL_DOCKER="/usr/bin/docker"
TARGET_VOL="${CI_VOLUME_NAME}"
PROJECT_PREFIX="${COMPOSE_PROJECT_NAME}"
NEW_ARGS=()
PREV_ARG=""
for arg in "$@"; do
    # 1. Translate container names for E2E tests and CLI invocations
    if [[ -n "$PROJECT_PREFIX" && "$arg" =~ ^rikkei-(postgres|mock|mailpit|backend|frontend)$ ]]; then
        arg="${PROJECT_PREFIX}-${BASH_REMATCH[1]}"
    fi

    # 2. Translate volume paths for DooD environment
    if [[ "$arg" == *"/ci-workspace:"* ]]; then
        arg="${arg/\/ci-workspace:/${TARGET_VOL}:}"
    elif [[ -n "$PWD" && "$arg" == *"$PWD:"* ]]; then
        arg="${arg/$PWD:/${TARGET_VOL}:}"
    elif [[ "$PREV_ARG" == "-v" || "$PREV_ARG" == "--volume" ]]; then
        if [[ "$arg" == "/ci-workspace"* ]]; then
            arg="${arg/\/ci-workspace/${TARGET_VOL}}"
        elif [[ -n "$PWD" && "$arg" == "$PWD"* ]]; then
            arg="${arg/$PWD/${TARGET_VOL}}"
        fi
    fi
    NEW_ARGS+=("$arg")
    PREV_ARG="$arg"
done
exec "$REAL_DOCKER" "${NEW_ARGS[@]}"
EOF
    chmod +x /opt/docker-wrapper/docker
    export PATH="/opt/docker-wrapper:$PATH"
fi

# Ensure clean Maven repository inside container
rm -rf /root/.m2/repository

# Initialize tracking
declare -A JOB_STATUS
declare -A JOB_DURATION
declare -A JOB_EXIT
JOBS_ORDER=("mock-test" "frontend-check" "backend-check" "docker-compose-check" "clean-code-and-linters" "smoke-test")
START_TOTAL=$(date +%s)
OVERALL_PASS=true

run_job() {
    local job_name="$1"
    local job_title="$2"
    shift 2

    echo ""
    echo "================================================================================"
    echo "  RUNNING JOB: ${job_name} (${job_title})"
    echo "================================================================================"
    local start_time=$(date +%s)
    local exit_code=0
    # Execute job functions in a subshell with set -e: ( set -e; "$@" ) || exit_code=$?
    # In POSIX bash, any command preceding || has set -e disabled, so we run under set +e without ||
    set +e
    ( set -e; "$@" )
    exit_code=$?
    set -e
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))

    JOB_DURATION["$job_name"]="${duration}s"
    JOB_EXIT["$job_name"]="$exit_code"

    if [ "$exit_code" -eq 0 ]; then
        JOB_STATUS["$job_name"]="PASS"
        echo ">>> [PASS] Job '${job_name}' completed successfully in ${duration}s (Exit code: 0)"
    else
        JOB_STATUS["$job_name"]="FAIL"
        OVERALL_PASS=false
        echo ">>> [FAIL] Job '${job_name}' failed in ${duration}s (Exit code: ${exit_code})"
    fi
}

# ------------------------------------------------------------------------------
# JOB 1: mock-test
# ------------------------------------------------------------------------------
execute_mock_test() {
    cd /ci-workspace/mock
    echo "Running npm ci in mock/..."
    npm ci
    echo "Running npm test in mock/..."
    npm test
}
run_job "mock-test" "Mock Service Tests & Verification" execute_mock_test

# ------------------------------------------------------------------------------
# JOB 2: frontend-check
# ------------------------------------------------------------------------------
execute_frontend_check() {
    cd /ci-workspace/frontend
    echo "Running npm ci in frontend/..."
    npm ci
    echo "Running ESLint in frontend/..."
    npm run lint
    echo "Running TypeScript Typecheck in frontend/..."
    npm run typecheck
    echo "Running Vitest Unit Tests in frontend/..."
    npm run test -- --run
    echo "Running Vite Production Build in frontend/..."
    npm run build
}
run_job "frontend-check" "Frontend Quality Gates" execute_frontend_check

# ------------------------------------------------------------------------------
# JOB 3: backend-check
# ------------------------------------------------------------------------------
execute_backend_check() {
    cd /ci-workspace/backend
    echo "Ensuring mvnw is executable..."
    chmod +x mvnw
    echo "Checking code format with Spotless..."
    ./mvnw spotless:check
    echo "Running SpotBugs static analysis..."
    ./mvnw spotbugs:check
    echo "Running Maven compilation & tests with Testcontainers..."
    ./mvnw clean test -Dtestcontainers.host.override="${TC_HOST}" -Dtestcontainers.ryuk.disabled=true
}
run_job "backend-check" "Backend Quality Gates" execute_backend_check

# ------------------------------------------------------------------------------
# JOB 4: docker-compose-check
# ------------------------------------------------------------------------------
execute_docker_compose_check() {
    cd /ci-workspace
    echo "Preparing environment file..."
    cp .env.example .env
    echo "Validating Docker Compose configuration..."
    docker compose config
    echo "Building container images..."
    docker compose build
}
run_job "docker-compose-check" "Docker Compose Config & Build" execute_docker_compose_check

# ------------------------------------------------------------------------------
# JOB 5: clean-code-and-linters
# ------------------------------------------------------------------------------
execute_clean_code_and_linters() {
    cd /ci-workspace
    chmod +x backend/mvnw check.sh

    echo "1. Scanning for machine-specific path leaks..."
    FORBIDDEN_USER="$(printf '%s%s%s%s%s%s' 'k' 'i' 'r' 'i' 't' 'o')"
    FORBIDDEN_DIR="$(printf 'C:\x5cUsers')"
    FORBIDDEN_REGEX="${FORBIDDEN_USER}|${FORBIDDEN_DIR}"
    LEAKS=$(grep -rnE "$FORBIDDEN_REGEX" . \
      --exclude-dir=".git" \
      --exclude-dir="node_modules" \
      --exclude-dir="target" \
      --exclude-dir="dist" \
      --exclude-dir=".agents" \
      --exclude="check.sh" \
      --exclude="check.ps1" \
      --exclude=".github/workflows/ci.yml" 2>/dev/null || true)
    if [ -n "$LEAKS" ]; then
      echo "ERROR: Machine-specific paths leaked in repository:"
      echo "$LEAKS"
      return 1
    fi
    echo "Machine-specific path scan passed."

    echo "2. Scanning for lingering TODO or FIXME comments..."
    TODOS=$(grep -rnE "\b(TODO|FIXME)\b" backend/src/main frontend/src mock \
      --exclude-dir="node_modules" \
      --exclude="data.json" \
      --exclude="README.md" 2>/dev/null || true)
    if [ -n "$TODOS" ]; then
      echo "ERROR: Lingering TODO comments found in production code:"
      echo "$TODOS"
      return 1
    fi
    echo "Lingering TODO scan passed."

    echo "3. Scanning for secret leaks & private keys..."
    SECRETS=$(grep -rnE "(BEGIN (RSA|OPENSSH|EC|DSA) PRIVATE KEY|ghp_[A-Za-z0-9]{36}|xox[baprs]-[0-9]{12})" . \
      --exclude-dir=".git" \
      --exclude-dir="node_modules" \
      --exclude-dir="target" \
      --exclude-dir="dist" \
      --exclude-dir=".agents" \
      --exclude="check.sh" \
      --exclude="check.ps1" \
      --exclude=".github/workflows/ci.yml" 2>/dev/null || true)
    if [ -n "$SECRETS" ]; then
      echo "ERROR: Potential secrets or private keys leaked in repository:"
      echo "$SECRETS"
      return 1
    fi
    echo "Secret leak scan passed."

    echo "4. Running Markdownlint..."
    npx --yes markdownlint-cli2@0.24.0 "**/*.md" "#**/node_modules/**" "#**/target/**" "#**/dist/**" "#**/.agents/**"

    echo "5. Running CSpell with Vietnamese Dictionary..."
    npx --yes --package cspell@10.4.1 --package @cspell/dict-vi-vn@3.0.7 cspell "**/*.{md,java,ts,tsx,js,mjs,sql,yml,json,jsonc}"

    echo "6. Running Version Table Drift Check..."
    node scripts/check-version-drift.mjs

    echo "7. Running Contrast Table Verification..."
    node scripts/compute-contrast.mjs

    echo "8. Running Quality Gate Synchronization Check..."
    node scripts/check-gate-sync.mjs

    echo "9. Running Agent Configuration Sync & Validation Check..."
    node scripts/sync-agent-config.mjs --check
    node scripts/validate-agent-config.mjs

    echo "10. Running Yamllint..."
    docker run --rm -v "$PWD:/data" cytopia/yamllint:1-0.14 -c /data/.yamllint.yml /data

    echo "11. Running Hadolint..."
    docker run --rm -v "$PWD:/repo" hadolint/hadolint:v2.15.1 hadolint /repo/backend/Dockerfile /repo/frontend/Dockerfile /repo/mock/Dockerfile

    echo "12. Running Actionlint..."
    docker run --rm -v "$PWD:/repo" -w /repo rhysd/actionlint:1.7.12 .github/workflows/ci.yml

    echo "13. Running SQLFluff on Flyway Migrations..."
    docker run --rm -v "$PWD:/repo" -w /repo sqlfluff/sqlfluff:4.5.0 lint backend/src/main/resources/db/migration
}
run_job "clean-code-and-linters" "Code Hygiene & Security Leak Scan" execute_clean_code_and_linters

# ------------------------------------------------------------------------------
# JOB 6: smoke-test
# ------------------------------------------------------------------------------
execute_smoke_test() {
    cd /ci-workspace
    cp .env.example .env

    cleanup_compose() {
        echo "Tearing down Docker Compose environment..."
        docker compose -p "${COMPOSE_PROJECT_NAME}" down -v 2>/dev/null || true
    }
    trap cleanup_compose EXIT INT TERM

    # Check port conflicts before spinning up compose services
    check_port_conflicts || return 1

    echo "1. Spinning up multi-container stack with health gates..."
    docker compose up -d --build --wait

    echo "2. Asserting Flyway migrations applied via psql..."
    MIGRATIONS=$(docker compose exec -T postgres psql -U rikkei_app -d rikkeijobs -t -A -c "SELECT count(*) FROM flyway_schema_history WHERE success = true;")
    if [ "$MIGRATIONS" -lt 2 ]; then
      echo "ERROR: Expected at least 2 successful Flyway migrations, found $MIGRATIONS"
      return 1
    fi
    echo "Flyway migrations verified: $MIGRATIONS applied."

    echo "3. Asserting seed data in Dev profile (8 users, 20 skills)..."
    USERS_COUNT=$(docker compose exec -T postgres psql -U rikkei_app -d rikkeijobs -t -A -c "SELECT count(*) FROM users;")
    if [ "$USERS_COUNT" -ne 8 ]; then
      echo "ERROR: Expected exactly 8 seed users, got $USERS_COUNT"
      return 1
    fi
    SKILLS_COUNT=$(docker compose exec -T postgres psql -U rikkei_app -d rikkeijobs -t -A -c "SELECT count(*) FROM skills;")
    if [ "$SKILLS_COUNT" -ne 20 ]; then
      echo "ERROR: Expected exactly 20 skills, got $SKILLS_COUNT"
      return 1
    fi
    echo "Database seed asserted: 8 users and 20 skills verified."

    echo "4. Asserting Backend Health endpoint (UP)..."
    HEALTH_STATUS=$(curl -s -f http://127.0.0.1:8080/api/v1/health | grep -o '"status":"UP"' || true)
    if [ -z "$HEALTH_STATUS" ]; then
      echo "ERROR: Backend health endpoint did not return UP"
      curl -i http://127.0.0.1:8080/api/v1/health || true
      return 1
    fi
    echo "Backend health status verified: UP"

    echo "5. Asserting Frontend HTTP Accessibility (200 OK)..."
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/)
    if [ "$HTTP_CODE" -ne 200 ]; then
      echo "ERROR: Frontend returned HTTP $HTTP_CODE, expected 200"
      return 1
    fi
    echo "Frontend asserted: HTTP 200 OK"

    echo "6. Asserting Mock External Authentication Security Gate..."
    UNAUTH_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:9000/lms/courses)
    if [ "$UNAUTH_CODE" -ne 401 ]; then
      echo "ERROR: Mock request without X-Service-Key expected 401, got $UNAUTH_CODE"
      return 1
    fi
    AUTH_CODE=$(curl -s -o /dev/null -w "%{http_code}" -H "X-Service-Key: dev-key" http://127.0.0.1:9000/lms/courses)
    if [ "$AUTH_CODE" -ne 200 ]; then
      echo "ERROR: Mock request with valid key expected 200, got $AUTH_CODE"
      return 1
    fi
    echo "Mock service authentication gates asserted: 401 on missing key, 200 on valid key."

    echo "7. Executing End-to-End Test Suite (9/9 suites)..."
    local e2e_exit=0
    node e2e/run-all.mjs || e2e_exit=$?

    cleanup_compose
    trap - EXIT INT TERM

    if [ "$e2e_exit" -ne 0 ]; then
        echo "ERROR: End-to-End test suite failed with exit code $e2e_exit"
        return "$e2e_exit"
    fi
}

# If any previous job failed, smoke-test should be SKIPPED as per CI graph!
if [ "$OVERALL_PASS" = true ]; then
    run_job "smoke-test" "Docker Compose Full Stack Smoke & E2E Verification" execute_smoke_test
else
    echo ""
    echo "================================================================================"
    echo "  SKIPPING JOB: smoke-test (upstream job failed, mimicking CI needs graph)"
    echo "================================================================================"
    JOB_STATUS["smoke-test"]="SKIPPED"
    JOB_DURATION["smoke-test"]="0s"
    JOB_EXIT["smoke-test"]="0"
fi

END_TOTAL=$(date +%s)
TOTAL_DURATION=$((END_TOTAL - START_TOTAL))

# ------------------------------------------------------------------------------
# FINAL SUMMARY REPORT
# ------------------------------------------------------------------------------
echo ""
echo "================================================================================"
echo "  CLEAN DOCKER CI EXECUTION SUMMARY (ALL 6 JOBS)"
echo "================================================================================"
for job in "${JOBS_ORDER[@]}"; do
    printf "  %-30s [%-7s]  Duration: %-6s Exit: %s\n" "$job" "${JOB_STATUS[$job]}" "${JOB_DURATION[$job]}" "${JOB_EXIT[$job]}"
done
echo "================================================================================"
if [ "$OVERALL_PASS" = true ]; then
    echo "  OVERALL CI STATUS: PASS (Total Duration: ${TOTAL_DURATION}s, Exit Code: 0)"
    echo "================================================================================"
    exit 0
else
    echo "  OVERALL CI STATUS: FAIL (Total Duration: ${TOTAL_DURATION}s, Exit Code: 1)"
    echo "================================================================================"
    exit 1
fi
