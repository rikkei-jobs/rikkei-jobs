"""Supplemental integration tests on a disposable host PostgreSQL (not pinned container proof)."""
import os
from pathlib import Path
import shutil
import socket
import subprocess
import tempfile

repo = Path(__file__).resolve().parents[2]
for executable in ("initdb", "pg_ctl", "postgres"):
    if shutil.which(executable) is None:
        raise SystemExit(f"Missing local PostgreSQL executable: {executable}")

log = repo / "docs/ai05/backend-integration-local.log"
version = subprocess.check_output(["postgres", "--version"], text=True).strip()
with tempfile.TemporaryDirectory(prefix="rikkei-ai05-pg-") as temporary:
    data = Path(temporary) / "data"
    with socket.socket() as candidate:
        candidate.bind(("127.0.0.1", 0))
        port = candidate.getsockname()[1]
    subprocess.run(
        ["initdb", "-D", str(data), "--auth=trust", "--no-locale", "--username=ai05_test"],
        stdout=subprocess.DEVNULL, check=True,
    )
    started = False
    try:
        subprocess.run(
            ["pg_ctl", "-D", str(data), "-l", temporary + "/server.log", "-o",
             f"-p {port} -h 127.0.0.1 -k {temporary}", "-w", "start"],
            stdout=subprocess.DEVNULL, check=True,
        )
        started = True
        with log.open("w") as output:
            output.write(f"Supplemental integration on {version}; pinned Testcontainers 18.6 still required.\n")
            output.flush()
            result = subprocess.run(
                [str(repo / "backend/mvnw"), "-f", str(repo / "backend/pom.xml"),
                 "-Dtest=AiGovernanceIntegrationTest",
                 f"-Dai05.test.jdbcUrl=jdbc:postgresql://127.0.0.1:{port}/postgres",
                 "-Dai05.test.username=ai05_test", "test"],
                cwd=repo, env=os.environ.copy(), stdout=output, stderr=subprocess.STDOUT,
            )
        print("\n".join(log.read_text().splitlines()[-22:]))
    finally:
        if started:
            subprocess.run(["pg_ctl", "-D", str(data), "-m", "immediate", "stop"],
                           stdout=subprocess.DEVNULL, check=True)
raise SystemExit(result.returncode)
