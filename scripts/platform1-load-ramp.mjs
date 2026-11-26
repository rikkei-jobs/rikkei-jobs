#!/usr/bin/env node
/**
 * Repeatable whole-system endpoint benchmark, C1b concurrency ramp,
 * and concurrency-safety verification harness for Rikkei Jobs.
 * Zero external dependencies (Node 25 built-ins only).
 * Not wired into check.sh, check.ps1, ci.yml, or package.json.
 */

import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const ALLOWED_MODES = new Set(['all', 'endpoints', 'ramp', 'concurrency']);

function parsePositiveInt(flag, raw) {
  if (raw === undefined || !/^\d+$/.test(raw)) {
    throw new Error(`Invalid integer for ${flag}: "${raw ?? ''}" (expected positive integer)`);
  }
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`Invalid value for ${flag}: "${raw}" (must be finite and > 0)`);
  }
  return value;
}

function parseArgs(argv) {
  const opts = {
    baseUrl: 'http://127.0.0.1:3000',
    mockUrl: 'http://127.0.0.1:9000',
    serviceKey: 'dev-key',
    mode: 'all',
    runs: 5,
    iters: 25,
    authIters: 10,
    writeIters: 10,
    warmupIters: 5,
    steps: [1, 5, 10, 25, 50, 100, 200],
    stepDurationMs: 3500,
    timeoutMs: 10000,
    dockerTelemetry: true,
    jsonOut: ''
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === '--base-url') {
      if (!next || next.startsWith('--')) throw new Error('Missing value for --base-url');
      opts.baseUrl = next.replace(/\/+$/, '');
      i += 1;
    } else if (arg === '--mock-url') {
      if (!next || next.startsWith('--')) throw new Error('Missing value for --mock-url');
      opts.mockUrl = next.replace(/\/+$/, '');
      i += 1;
    } else if (arg === '--service-key') {
      if (!next || next.startsWith('--')) throw new Error('Missing value for --service-key');
      opts.serviceKey = next;
      i += 1;
    } else if (arg === '--mode') {
      if (!next || !ALLOWED_MODES.has(next)) {
        throw new Error(
          `Invalid --mode "${next ?? ''}" (allowed: ${Array.from(ALLOWED_MODES).join(', ')})`
        );
      }
      opts.mode = next;
      i += 1;
    } else if (arg === '--runs') {
      opts.runs = parsePositiveInt('--runs', next);
      i += 1;
    } else if (arg === '--iters') {
      opts.iters = parsePositiveInt('--iters', next);
      i += 1;
    } else if (arg === '--auth-iters') {
      opts.authIters = parsePositiveInt('--auth-iters', next);
      i += 1;
    } else if (arg === '--write-iters') {
      opts.writeIters = parsePositiveInt('--write-iters', next);
      i += 1;
    } else if (arg === '--warmup-iters') {
      opts.warmupIters = parsePositiveInt('--warmup-iters', next);
      i += 1;
    } else if (arg === '--steps') {
      if (!next || next.startsWith('--')) throw new Error('Missing value for --steps');
      const parsedSteps = next.split(',').map((s) => parsePositiveInt('--steps', s.trim()));
      if (parsedSteps.length === 0) {
        throw new Error('Invalid --steps: must contain at least one positive integer');
      }
      opts.steps = parsedSteps;
      i += 1;
    } else if (arg === '--step-duration-ms' || arg === '--step-ms') {
      opts.stepDurationMs = parsePositiveInt(arg, next);
      i += 1;
    } else if (arg === '--timeout-ms') {
      opts.timeoutMs = parsePositiveInt('--timeout-ms', next);
      i += 1;
    } else if (arg === '--no-docker-telemetry') {
      opts.dockerTelemetry = false;
    } else if (arg === '--json-out') {
      if (!next || next.startsWith('--')) throw new Error('Missing value for --json-out');
      opts.jsonOut = next;
      i += 1;
    } else if (arg === '--help' || arg === '-h') {
      console.log(
        [
          'Usage: node scripts/platform1-load-ramp.mjs [options]',
          '  --base-url <url>          Default: http://127.0.0.1:3000',
          '  --mock-url <url>          Default: http://127.0.0.1:9000',
          '  --mode <all|endpoints|ramp|concurrency>',
          '  --runs <n>                Repeated runs per endpoint/step (default: 5)',
          '  --iters <n>               Read requests per endpoint run (default: 25)',
          '  --auth-iters <n>          Auth requests per run (default: 10)',
          '  --write-iters <n>         Write requests per run (default: 10)',
          '  --warmup-iters <n>        Warmup requests before measured runs (default: 5)',
          '  --steps <csv>             Ramp VUs (default: 1,5,10,25,50,100,200)',
          '  --step-duration-ms <ms>   Duration per ramp step run (alias: --step-ms, default: 3500)',
          '  --timeout-ms <ms>         Per-request timeout (default: 10000)',
          '  --no-docker-telemetry     Skip docker stats and psql probes',
          '  --json-out <file>         Write raw JSON report to file'
        ].join('\n')
      );
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return opts;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Nearest-rank percentile on a pre-sorted ascending array.
 * Note: For small sample sizes (e.g. n = 10 auth/write iterations),
 * Math.ceil(0.95 * 10) - 1 === 9 and Math.ceil(0.99 * 10) - 1 === 9,
 * so p95 === p99 === max by definition of nearest-rank on n <= 10.
 */
function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, idx))];
}

function median(values) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

function summarizeSeries(values) {
  if (values.length === 0) {
    return {
      min: 0,
      median: 0,
      max: 0,
      mean: 0,
      spreadPct: 0,
      cvPct: 0,
      highVariance: false
    };
  }
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const medVal = median(values);
  const meanVal = values.reduce((acc, v) => acc + v, 0) / values.length;
  const variance =
    values.reduce((acc, v) => acc + (v - meanVal) ** 2, 0) / values.length;
  const stdDev = Math.sqrt(variance);
  // Preserve visibility of non-zero spikes when median === 0 (e.g. intermittent errors or TBT)
  const spreadPct =
    medVal > 0
      ? ((maxVal - minVal) / medVal) * 100
      : maxVal > 0
        ? ((maxVal - minVal) / meanVal) * 100
        : 0;
  const cvPct = meanVal > 0 ? (stdDev / meanVal) * 100 : 0;
  const highVariance = medVal > 0 ? spreadPct > 10 : maxVal > 0;
  return {
    min: round2(minVal),
    median: round2(medVal),
    max: round2(maxVal),
    mean: round2(meanVal),
    spreadPct: round2(spreadPct),
    cvPct: round2(cvPct),
    highVariance
  };
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

const TIMEOUT_ERROR_CODES = new Set([
  'UND_ERR_CONNECT_TIMEOUT',
  'UND_ERR_HEADERS_TIMEOUT',
  'UND_ERR_BODY_TIMEOUT',
  'ETIMEDOUT'
]);

function classifyError(err) {
  if (!err) return 'connError';
  const name = err.name || '';
  const code = err.code || '';
  const causeCode = err.cause?.code || '';
  const msg = String(err.message || '').toLowerCase();
  if (
    name === 'TimeoutError' ||
    name === 'AbortError' ||
    TIMEOUT_ERROR_CODES.has(code) ||
    TIMEOUT_ERROR_CODES.has(causeCode) ||
    msg.includes('timeout') ||
    msg.includes('aborted')
  ) {
    return 'timeout';
  }
  return 'connError';
}

async function timedFetch(url, init, timeoutMs) {
  const start = performance.now();
  try {
    const res = await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(timeoutMs)
    });
    const text = await res.text();
    const latencyMs = performance.now() - start;
    return { ok: res.ok, status: res.status, latencyMs, text, errorKind: null };
  } catch (err) {
    const latencyMs = performance.now() - start;
    return {
      ok: false,
      status: 0,
      latencyMs,
      text: '',
      errorKind: classifyError(err)
    };
  }
}

function summarizeRun(records, elapsedMs) {
  const latencies = records.map((r) => r.latencyMs).sort((a, b) => a - b);
  let status2xx = 0;
  let status4xx = 0;
  let status5xx = 0;
  let s401 = 0;
  let s409 = 0;
  let s429 = 0;
  let other4xx = 0;
  let s502 = 0;
  let other5xx = 0;
  let timeouts = 0;
  let connErrors = 0;
  const statusMap = {};

  for (const rec of records) {
    if (rec.status > 0) {
      const key = String(rec.status);
      statusMap[key] = (statusMap[key] || 0) + 1;
      if (rec.status >= 200 && rec.status < 300) {
        status2xx += 1;
      } else if (rec.status >= 400 && rec.status < 500) {
        status4xx += 1;
        if (rec.status === 401) s401 += 1;
        else if (rec.status === 409) s409 += 1;
        else if (rec.status === 429) s429 += 1;
        else other4xx += 1;
      } else if (rec.status >= 500) {
        status5xx += 1;
        if (rec.status === 502) s502 += 1;
        else other5xx += 1;
      }
    } else if (rec.errorKind === 'timeout') {
      timeouts += 1;
    } else {
      connErrors += 1;
    }
  }

  const total = records.length;
  const errorCount = total - status2xx;
  const okRps = elapsedMs > 0 ? (status2xx / elapsedMs) * 1000 : 0;
  const totalRps = elapsedMs > 0 ? (total / elapsedMs) * 1000 : 0;

  return {
    total,
    elapsedMs: round2(elapsedMs),
    rps: round2(okRps),
    okRps: round2(okRps),
    totalRps: round2(totalRps),
    minMs: round2(latencies[0] ?? 0),
    p50Ms: round2(percentile(latencies, 50)),
    p95Ms: round2(percentile(latencies, 95)),
    p99Ms: round2(percentile(latencies, 99)),
    maxMs: round2(latencies[latencies.length - 1] ?? 0),
    status2xx,
    status4xx,
    status5xx,
    s401,
    s409,
    s429,
    other4xx,
    s502,
    other5xx,
    timeouts,
    connErrors,
    errorPct: total > 0 ? round2((errorCount / total) * 100) : 0,
    statusMap
  };
}

async function loginAccount(baseUrl, email, password, timeoutMs) {
  const res = await timedFetch(
    `${baseUrl}/api/v1/auth/login`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    },
    timeoutMs
  );
  if (res.status !== 200) {
    throw new Error(`Login failed for ${email}: HTTP ${res.status} ${res.text}`);
  }
  const body = JSON.parse(res.text);
  return {
    email,
    token: body.accessToken || body.token,
    userId: body.user?.id
  };
}

async function mintSsoTicket(mockUrl, serviceKey, lmsUserId, timeoutMs) {
  const res = await timedFetch(
    `${mockUrl}/lms/sso/tickets`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Service-Key': serviceKey
      },
      body: JSON.stringify({ lmsUserId })
    },
    timeoutMs
  );
  if (res.status !== 201) {
    throw new Error(`Mock SSO ticket mint failed: HTTP ${res.status} ${res.text}`);
  }
  return JSON.parse(res.text).ticket;
}

async function setupContext(opts) {
  const hr2 = await loginAccount(opts.baseUrl, 'hr2@rikkeijobs.test', 'Test@123', opts.timeoutMs);
  const cand1 = await loginAccount(opts.baseUrl, 'candidate1@rikkeijobs.test', 'Test@123', opts.timeoutMs);
  const cand2 = await loginAccount(opts.baseUrl, 'candidate2@rikkeijobs.test', 'Test@123', opts.timeoutMs);
  const cand3 = await loginAccount(opts.baseUrl, 'candidate3@rikkeijobs.test', 'Test@123', opts.timeoutMs);

  const candidates = [cand1, cand2, cand3];
  for (const cand of candidates) {
    const targetRes = await timedFetch(
      `${opts.baseUrl}/api/v1/me/target`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${cand.token}`
        },
        body: JSON.stringify({ positionId: 1 })
      },
      opts.timeoutMs
    );
    if (targetRes.status !== 200) {
      throw new Error(`Target setup failed for ${cand.email}: HTTP ${targetRes.status}`);
    }
    // Prime recommendations cache cleanly before steady-state measurements
    const recRes = await timedFetch(
      `${opts.baseUrl}/api/v1/me/job-recommendations?limit=6`,
      { headers: { Authorization: `Bearer ${cand.token}` } },
      opts.timeoutMs
    );
    if (!recRes.ok) {
      throw new Error(
        `Recommendations warmup failed for ${cand.email}: HTTP ${recRes.status} ${recRes.text}`
      );
    }
  }

  const companyRes = await timedFetch(
    `${opts.baseUrl}/api/v1/companies/me`,
    { headers: { Authorization: `Bearer ${hr2.token}` } },
    opts.timeoutMs
  );
  if (companyRes.status !== 200) {
    throw new Error(`Failed to fetch HR2 company: HTTP ${companyRes.status}`);
  }
  const company = JSON.parse(companyRes.text);

  return { hr2, candidates, company };
}

async function runEndpointScenario(opts, scenario) {
  const warmupCount = Math.min(opts.warmupIters, scenario.iters);
  if (warmupCount > 0) {
    const prepWarmup = scenario.prepare ? await scenario.prepare(warmupCount) : null;
    for (let i = 0; i < warmupCount; i += 1) {
      await scenario.exec(i, prepWarmup);
    }
  }

  const runs = [];
  for (let r = 0; r < opts.runs; r += 1) {
    const prep = scenario.prepare ? await scenario.prepare(scenario.iters) : null;
    const records = [];
    const runStart = performance.now();
    for (let i = 0; i < scenario.iters; i += 1) {
      const rec = await scenario.exec(i, prep);
      records.push(rec);
    }
    const elapsedMs = performance.now() - runStart;
    runs.push(summarizeRun(records, elapsedMs));
  }

  const okRpsSummary = summarizeSeries(runs.map((r) => r.okRps));
  const totalRpsSummary = summarizeSeries(runs.map((r) => r.totalRps));
  const p50Summary = summarizeSeries(runs.map((r) => r.p50Ms));
  const p95Summary = summarizeSeries(runs.map((r) => r.p95Ms));
  const p99Summary = summarizeSeries(runs.map((r) => r.p99Ms));
  const errSummary = summarizeSeries(runs.map((r) => r.errorPct));

  const statusTotals = runs.reduce(
    (acc, r) => {
      acc.s2xx += r.status2xx;
      acc.s401 += r.s401;
      acc.s409 += r.s409;
      acc.s429 += r.s429;
      acc.other4xx += r.other4xx;
      acc.s4xx += r.status4xx;
      acc.unexpected4xx += r.status4xx;
      acc.s502 += r.s502;
      acc.other5xx += r.other5xx;
      acc.s5xx += r.status5xx;
      acc.timeouts += r.timeouts;
      acc.connErrors += r.connErrors;
      for (const [code, cnt] of Object.entries(r.statusMap)) {
        acc.statusMap[code] = (acc.statusMap[code] || 0) + cnt;
      }
      return acc;
    },
    {
      s2xx: 0,
      s401: 0,
      s409: 0,
      s429: 0,
      other4xx: 0,
      s4xx: 0,
      unexpected4xx: 0,
      s502: 0,
      other5xx: 0,
      s5xx: 0,
      timeouts: 0,
      connErrors: 0,
      statusMap: {}
    }
  );

  return {
    name: scenario.name,
    itersPerRun: scenario.iters,
    runsCount: opts.runs,
    rps: okRpsSummary,
    okRps: okRpsSummary,
    totalRps: totalRpsSummary,
    p50Ms: p50Summary,
    p95Ms: p95Summary,
    p99Ms: p99Summary,
    errorPct: errSummary,
    statusTotals,
    rawRuns: runs
  };
}

async function runEndpointsSuite(opts, ctx) {
  let companyState = { ...ctx.company };
  let targetToggle = 1;
  const cand1 = ctx.candidates[0];
  const hr2 = ctx.hr2;

  const authHeadersCand = { Authorization: `Bearer ${cand1.token}` };
  const authHeadersHr = { Authorization: `Bearer ${hr2.token}` };

  const scenarios = [
    {
      name: 'GET /api/v1/health',
      iters: opts.iters,
      exec: () => timedFetch(`${opts.baseUrl}/api/v1/health`, {}, opts.timeoutMs)
    },
    {
      name: 'POST /api/v1/auth/login (hr2)',
      iters: opts.authIters,
      exec: () =>
        timedFetch(
          `${opts.baseUrl}/api/v1/auth/login`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'hr2@rikkeijobs.test', password: 'Test@123' })
          },
          opts.timeoutMs
        )
    },
    {
      name: 'POST /api/v1/auth/login (candidate1)',
      iters: opts.authIters,
      exec: () =>
        timedFetch(
          `${opts.baseUrl}/api/v1/auth/login`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'candidate1@rikkeijobs.test', password: 'Test@123' })
          },
          opts.timeoutMs
        )
    },
    {
      name: 'POST /api/v1/auth/sso (pre-minted ticket)',
      iters: opts.authIters,
      prepare: async (count) => {
        const tickets = [];
        for (let i = 0; i < count; i += 1) {
          tickets.push(
            await mintSsoTicket(opts.mockUrl, opts.serviceKey, 'lms-sv-001', opts.timeoutMs)
          );
        }
        return tickets;
      },
      exec: (i, tickets) =>
        timedFetch(
          `${opts.baseUrl}/api/v1/auth/sso`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ticket: tickets[i] })
          },
          opts.timeoutMs
        )
    },
    {
      name: 'GET /api/v1/jobs/1',
      iters: opts.iters,
      exec: () =>
        timedFetch(`${opts.baseUrl}/api/v1/jobs/1`, { headers: authHeadersCand }, opts.timeoutMs)
    },
    {
      name: 'GET /api/v1/me/job-recommendations?limit=6',
      iters: opts.iters,
      exec: () =>
        timedFetch(
          `${opts.baseUrl}/api/v1/me/job-recommendations?limit=6`,
          { headers: authHeadersCand },
          opts.timeoutMs
        )
    },
    {
      name: 'GET /api/v1/profiles/me/skills',
      iters: opts.iters,
      exec: () =>
        timedFetch(
          `${opts.baseUrl}/api/v1/profiles/me/skills`,
          { headers: authHeadersCand },
          opts.timeoutMs
        )
    },
    {
      name: 'GET /api/v1/me/gap-analysis',
      iters: opts.iters,
      exec: () =>
        timedFetch(
          `${opts.baseUrl}/api/v1/me/gap-analysis`,
          { headers: authHeadersCand },
          opts.timeoutMs
        )
    },
    {
      name: `GET /api/v1/profiles/${cand1.userId}/evaluations`,
      iters: opts.iters,
      exec: () =>
        timedFetch(
          `${opts.baseUrl}/api/v1/profiles/${cand1.userId}/evaluations`,
          { headers: authHeadersCand },
          opts.timeoutMs
        )
    },
    {
      name: 'GET /api/v1/profiles/me/internships',
      iters: opts.iters,
      exec: () =>
        timedFetch(
          `${opts.baseUrl}/api/v1/profiles/me/internships`,
          { headers: authHeadersCand },
          opts.timeoutMs
        )
    },
    {
      name: 'GET /api/v1/companies/me',
      iters: opts.iters,
      exec: () =>
        timedFetch(
          `${opts.baseUrl}/api/v1/companies/me`,
          { headers: authHeadersHr },
          opts.timeoutMs
        )
    },
    {
      name: 'PUT /api/v1/me/target',
      iters: opts.writeIters,
      exec: () => {
        targetToggle = targetToggle === 1 ? 2 : 1;
        return timedFetch(
          `${opts.baseUrl}/api/v1/me/target`,
          {
            method: 'PUT',
            headers: { ...authHeadersCand, 'Content-Type': 'application/json' },
            body: JSON.stringify({ positionId: targetToggle })
          },
          opts.timeoutMs
        );
      }
    },
    {
      name: 'PUT /api/v1/companies/me',
      iters: opts.writeIters,
      prepare: async () => {
        const latest = await timedFetch(
          `${opts.baseUrl}/api/v1/companies/me`,
          { headers: authHeadersHr },
          opts.timeoutMs
        );
        if (latest.status !== 200) {
          throw new Error(`Failed to refresh company state: HTTP ${latest.status} ${latest.text}`);
        }
        companyState = JSON.parse(latest.text);
        return null;
      },
      exec: async () => {
        const res = await timedFetch(
          `${opts.baseUrl}/api/v1/companies/me`,
          {
            method: 'PUT',
            headers: { ...authHeadersHr, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: companyState.name,
              industry: companyState.industry,
              size: companyState.size,
              address: companyState.address,
              city: companyState.city,
              website: companyState.website,
              description: companyState.description,
              version: companyState.version
            })
          },
          opts.timeoutMs
        );
        if (res.status === 200) {
          companyState = JSON.parse(res.text);
        }
        return res;
      }
    },
    {
      name: 'POST /api/v1/profiles/me/skills/recompute',
      iters: opts.writeIters,
      exec: () =>
        timedFetch(
          `${opts.baseUrl}/api/v1/profiles/me/skills/recompute`,
          { method: 'POST', headers: authHeadersCand },
          opts.timeoutMs
        )
    }
  ];

  const results = [];
  for (const scenario of scenarios) {
    console.log(`[ENDPOINTS] Measuring ${scenario.name} (${opts.runs} runs x ${scenario.iters} requests)...`);
    const summary = await runEndpointScenario(opts, scenario);
    results.push(summary);
    const flag = summary.p95Ms.highVariance || summary.okRps.highVariance ? ' [VARIANCE > 10%]' : '';
    const st = summary.statusTotals;
    console.log(
      `  median okRPS=${summary.okRps.median} (totalRPS=${summary.totalRps.median}, spread ${summary.okRps.spreadPct}%), p50=${summary.p50Ms.median}ms, p95=${summary.p95Ms.median}ms (spread ${summary.p95Ms.spreadPct}%), p99=${summary.p99Ms.median}ms, errMed=${summary.errorPct.median}% (errMax=${summary.errorPct.max}%, 401=${st.s401}, 409=${st.s409}, 429=${st.s429}, 502=${st.s502}, other4xx=${st.other4xx}, other5xx=${st.other5xx}, to=${st.timeouts}, conn=${st.connErrors})${flag}`
    );
  }

  // Restore candidate1 target back to positionId=1 cleanly
  await timedFetch(
    `${opts.baseUrl}/api/v1/me/target`,
    {
      method: 'PUT',
      headers: { ...authHeadersCand, 'Content-Type': 'application/json' },
      body: JSON.stringify({ positionId: 1 })
    },
    opts.timeoutMs
  );

  return results;
}

async function capturePgActivitySample() {
  const { stdout } = await execFileAsync(
    'docker',
    [
      'exec',
      'rikkei-postgres',
      'psql',
      '-U',
      'rikkei_app',
      '-d',
      'rikkeijobs',
      '-t',
      '-A',
      '-c',
      "SELECT count(*) FILTER (WHERE state = 'active') || '|' || count(*) FILTER (WHERE state = 'idle') || '|' || count(*) FILTER (WHERE state LIKE 'idle in transaction%') || '|' || count(*) FILTER (WHERE wait_event IS NOT NULL AND state = 'active') FROM pg_stat_activity WHERE backend_type = 'client backend' AND pid <> pg_backend_pid();"
    ],
    { timeout: 5000 }
  );
  const [active, idle, idleInTx, waiting] = stdout
    .trim()
    .split('|')
    .map((n) => Number.parseInt(n, 10) || 0);
  return { active, idle, idleInTx, waiting };
}

async function captureDockerStats() {
  const { stdout } = await execFileAsync(
    'docker',
    [
      'stats',
      '--no-stream',
      'rikkei-backend',
      'rikkei-postgres',
      'rikkei-frontend',
      'rikkei-mock'
    ],
    { timeout: 8000 }
  );
  return stdout
    .trim()
    .split(/\r?\n/)
    .slice(1)
    .filter(Boolean)
    .map((line) => {
      const [, name, cpu, memUsage, memShare, , , processCount] = line.trim().split(/\s{2,}/);
      return { name, cpu, memUsage, memShare, processCount };
    });
}

async function captureBurstTelemetry(stopAt) {
  const telemetry = {
    stats: [],
    pgActivitySamples: [],
    pgActivityPeak: { active: 0, idle: 0, idleInTx: 0, waiting: 0 },
    pgActivityMedian: { active: 0, idle: 0, idleInTx: 0, waiting: 0 }
  };

  let statsCaptured = false;
  await sleep(300);
  while (performance.now() < stopAt - 150) {
    try {
      const sample = await capturePgActivitySample();
      telemetry.pgActivitySamples.push(sample);
    } catch (err) {
      telemetry.pgError = err.message;
    }

    if (!statsCaptured && performance.now() >= stopAt - 2200) {
      statsCaptured = true;
      try {
        telemetry.stats = await captureDockerStats();
      } catch (err) {
        telemetry.statsError = err.message;
      }
    }

    const remainingMs = stopAt - 150 - performance.now();
    if (remainingMs <= 0) break;
    await sleep(Math.min(700, remainingMs));
  }

  if (!statsCaptured) {
    try {
      telemetry.stats = await captureDockerStats();
    } catch (err) {
      telemetry.statsError = err.message;
    }
  }

  if (telemetry.pgActivitySamples.length > 0) {
    const samples = telemetry.pgActivitySamples;
    telemetry.pgActivityPeak = {
      active: Math.max(...samples.map((s) => s.active)),
      idle: Math.max(...samples.map((s) => s.idle)),
      idleInTx: Math.max(...samples.map((s) => s.idleInTx)),
      waiting: Math.max(...samples.map((s) => s.waiting))
    };
    telemetry.pgActivityMedian = {
      active: round2(median(samples.map((s) => s.active))),
      idle: round2(median(samples.map((s) => s.idle))),
      idleInTx: round2(median(samples.map((s) => s.idleInTx))),
      waiting: round2(median(samples.map((s) => s.waiting)))
    };
  }
  return telemetry;
}

function buildMixedStepOp(opts, ctx, vuIdx, seq) {
  const cand = ctx.candidates[vuIdx % ctx.candidates.length];
  const slot = (vuIdx + seq) % 20;
  if (slot < 3) {
    return timedFetch(
      `${opts.baseUrl}/api/v1/jobs/1`,
      { headers: { Authorization: `Bearer ${cand.token}` } },
      opts.timeoutMs
    );
  }
  if (slot < 6) {
    return timedFetch(
      `${opts.baseUrl}/api/v1/me/job-recommendations?limit=6`,
      { headers: { Authorization: `Bearer ${cand.token}` } },
      opts.timeoutMs
    );
  }
  if (slot < 9) {
    return timedFetch(
      `${opts.baseUrl}/api/v1/profiles/me/skills`,
      { headers: { Authorization: `Bearer ${cand.token}` } },
      opts.timeoutMs
    );
  }
  if (slot < 12) {
    return timedFetch(
      `${opts.baseUrl}/api/v1/me/gap-analysis`,
      { headers: { Authorization: `Bearer ${cand.token}` } },
      opts.timeoutMs
    );
  }
  if (slot < 14) {
    return timedFetch(
      `${opts.baseUrl}/api/v1/profiles/${cand.userId}/evaluations`,
      { headers: { Authorization: `Bearer ${cand.token}` } },
      opts.timeoutMs
    );
  }
  if (slot < 16) {
    return timedFetch(
      `${opts.baseUrl}/api/v1/profiles/me/internships`,
      { headers: { Authorization: `Bearer ${cand.token}` } },
      opts.timeoutMs
    );
  }
  if (slot < 18) {
    return timedFetch(
      `${opts.baseUrl}/api/v1/companies/me`,
      { headers: { Authorization: `Bearer ${ctx.hr2.token}` } },
      opts.timeoutMs
    );
  }
  if (slot === 18) {
    const posId = seq % 2 === 0 ? 1 : 2;
    return timedFetch(
      `${opts.baseUrl}/api/v1/me/target`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${cand.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ positionId: posId })
      },
      opts.timeoutMs
    );
  }
  return timedFetch(
    `${opts.baseUrl}/api/v1/auth/login`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cand.email, password: 'Test@123' })
    },
    opts.timeoutMs
  );
}

function evaluateRampThresholds(stepResults) {
  const baseP95 = stepResults[0]?.p95Ms.median || 1;
  const p95KneeThreshold = Math.max(baseP95 * 2.5, 500);
  let maxZeroErrStep = null;
  let maxUnder1PctStep = null;
  let kneeStep = null;
  let kneeSeen = false;

  for (const step of stepResults) {
    const okRpsMed = step.okRps?.median ?? step.rps?.median ?? 0;
    const isErrorKnee =
      step.errorPct.median > 0 ||
      step.errorPct.max > 0 ||
      step.totals.s5xx > 0 ||
      step.totals.timeouts > 0 ||
      step.totals.connErrors > 0 ||
      (step.totals.unexpected4xx ?? step.totals.s4xx ?? 0) > 0;
    const isLatencyKnee = step.vus > 1 && step.p95Ms.median >= p95KneeThreshold;

    const cleanZero = !isErrorKnee;
    const underOnePct =
      step.errorPct.median < 1 &&
      step.errorPct.max < 1 &&
      step.totals.s5xx === 0 &&
      step.totals.timeouts === 0 &&
      step.totals.connErrors === 0;

    if (!kneeSeen) {
      if (
        cleanZero &&
        (!maxZeroErrStep || okRpsMed >= (maxZeroErrStep.okRps?.median ?? maxZeroErrStep.rps.median))
      ) {
        maxZeroErrStep = step;
      }
      if (
        underOnePct &&
        (!maxUnder1PctStep ||
          okRpsMed >= (maxUnder1PctStep.okRps?.median ?? maxUnder1PctStep.rps.median))
      ) {
        maxUnder1PctStep = step;
      }
    }

    if (!kneeSeen && (isErrorKnee || isLatencyKnee)) {
      kneeStep = step;
      kneeSeen = true;
    }
  }

  return {
    p95KneeThreshold: round2(p95KneeThreshold),
    maxZeroErrorThroughput: maxZeroErrStep
      ? {
          vus: maxZeroErrStep.vus,
          medianOkRps: maxZeroErrStep.okRps?.median ?? maxZeroErrStep.rps.median,
          medianTotalRps: maxZeroErrStep.totalRps?.median ?? maxZeroErrStep.rps.median,
          medianP95Ms: maxZeroErrStep.p95Ms.median
        }
      : null,
    maxUnder1PctThroughput: maxUnder1PctStep
      ? {
          vus: maxUnder1PctStep.vus,
          medianOkRps: maxUnder1PctStep.okRps?.median ?? maxUnder1PctStep.rps.median,
          medianTotalRps: maxUnder1PctStep.totalRps?.median ?? maxUnder1PctStep.rps.median,
          medianP95Ms: maxUnder1PctStep.p95Ms.median
        }
      : null,
    detectedKnee: kneeStep
      ? {
          vus: kneeStep.vus,
          medianOkRps: kneeStep.okRps?.median ?? kneeStep.rps.median,
          medianTotalRps: kneeStep.totalRps?.median ?? kneeStep.rps.median,
          medianP95Ms: kneeStep.p95Ms.median,
          medianErrPct: kneeStep.errorPct.median,
          maxErrPct: kneeStep.errorPct.max,
          s5xx: kneeStep.totals.s5xx,
          s502: kneeStep.totals.s502 ?? 0,
          timeouts: kneeStep.totals.timeouts,
          connErrors: kneeStep.totals.connErrors
        }
      : null
  };
}

async function runSingleLoadBurst(opts, ctx, vus, durationMs, collectTelemetry) {
  const records = [];
  const start = performance.now();
  const stopAt = start + durationMs;
  let telemetryPromise = null;

  if (collectTelemetry && opts.dockerTelemetry) {
    telemetryPromise = captureBurstTelemetry(stopAt);
  }

  const workers = Array.from({ length: vus }, (_, vuIdx) =>
    (async () => {
      let seq = 0;
      while (performance.now() < stopAt) {
        const rec = await buildMixedStepOp(opts, ctx, vuIdx, seq);
        records.push(rec);
        seq += 1;
      }
    })()
  );

  await Promise.all(workers);
  const elapsedMs = performance.now() - start;
  const telemetry = telemetryPromise ? await telemetryPromise : null;
  return { summary: summarizeRun(records, elapsedMs), telemetry };
}

async function runRampSuite(opts, ctx) {
  console.log('[RAMP] Warmup burst: 5 VUs for 3000ms (excluded from metrics)...');
  await runSingleLoadBurst(opts, ctx, 5, 3000, false);

  const stepResults = [];
  for (const vus of opts.steps) {
    const runSummaries = [];
    let stepTelemetry = null;
    console.log(`[RAMP] Stepping ${vus} VUs (${opts.runs} runs x ${opts.stepDurationMs}ms)...`);

    for (let r = 0; r < opts.runs; r += 1) {
      const collectTel = r === opts.runs - 1;
      const { summary, telemetry } = await runSingleLoadBurst(
        opts,
        ctx,
        vus,
        opts.stepDurationMs,
        collectTel
      );
      runSummaries.push(summary);
      if (telemetry) {
        stepTelemetry = telemetry;
      }
      if (vus >= 50) {
        await sleep(1000);
      }
    }

    const okRps = summarizeSeries(runSummaries.map((r) => r.okRps));
    const totalRps = summarizeSeries(runSummaries.map((r) => r.totalRps));
    const p50Ms = summarizeSeries(runSummaries.map((r) => r.p50Ms));
    const p95Ms = summarizeSeries(runSummaries.map((r) => r.p95Ms));
    const p99Ms = summarizeSeries(runSummaries.map((r) => r.p99Ms));
    const errorPct = summarizeSeries(runSummaries.map((r) => r.errorPct));
    const totals = runSummaries.reduce(
      (acc, r) => {
        acc.total += r.total;
        acc.s2xx += r.status2xx;
        acc.s401 += r.s401;
        acc.s409 += r.s409;
        acc.s429 += r.s429;
        acc.other4xx += r.other4xx;
        acc.s4xx += r.status4xx;
        acc.unexpected4xx += r.status4xx;
        acc.s502 += r.s502;
        acc.other5xx += r.other5xx;
        acc.s5xx += r.status5xx;
        acc.timeouts += r.timeouts;
        acc.connErrors += r.connErrors;
        for (const [code, cnt] of Object.entries(r.statusMap)) {
          acc.statusMap[code] = (acc.statusMap[code] || 0) + cnt;
        }
        return acc;
      },
      {
        total: 0,
        s2xx: 0,
        s401: 0,
        s409: 0,
        s429: 0,
        other4xx: 0,
        s4xx: 0,
        unexpected4xx: 0,
        s502: 0,
        other5xx: 0,
        s5xx: 0,
        timeouts: 0,
        connErrors: 0,
        statusMap: {}
      }
    );

    stepResults.push({
      vus,
      rps: okRps,
      okRps,
      totalRps,
      p50Ms,
      p95Ms,
      p99Ms,
      errorPct,
      totals,
      telemetry: stepTelemetry,
      rawRuns: runSummaries
    });

    const pgPeak = stepTelemetry?.pgActivityPeak;
    const pgStr = pgPeak
      ? `, pgActivePeak=${pgPeak.active}/idle=${pgPeak.idle}/wait=${pgPeak.waiting} (${stepTelemetry.pgActivitySamples.length} samples)`
      : '';
    console.log(
      `  VUs=${vus} -> median okRPS=${okRps.median} (totalRPS=${totalRps.median}, spread ${okRps.spreadPct}%), p50=${p50Ms.median}ms, p95=${p95Ms.median}ms (spread ${p95Ms.spreadPct}%), p99=${p99Ms.median}ms, errMed=${errorPct.median}% (errMax=${errorPct.max}%, 5xx=${totals.s5xx} [502=${totals.s502}], 4xx=${totals.s4xx} [401=${totals.s401},409=${totals.s409},429=${totals.s429}], timeout=${totals.timeouts}, conn=${totals.connErrors}${pgStr})`
    );
  }

  // Recovery probe after peak load stops
  await sleep(2000);
  const recovery = {
    health: await timedFetch(`${opts.baseUrl}/api/v1/health`, {}, opts.timeoutMs),
    jobs: await timedFetch(
      `${opts.baseUrl}/api/v1/jobs/1`,
      { headers: { Authorization: `Bearer ${ctx.candidates[0].token}` } },
      opts.timeoutMs
    ),
    gap: await timedFetch(
      `${opts.baseUrl}/api/v1/me/gap-analysis`,
      { headers: { Authorization: `Bearer ${ctx.candidates[0].token}` } },
      opts.timeoutMs
    )
  };

  const thresholdSummary = evaluateRampThresholds(stepResults);

  return {
    steps: stepResults,
    ...thresholdSummary,
    recovery: {
      healthStatus: recovery.health.status,
      healthMs: round2(recovery.health.latencyMs),
      jobsStatus: recovery.jobs.status,
      jobsMs: round2(recovery.jobs.latencyMs),
      gapStatus: recovery.gap.status,
      gapMs: round2(recovery.gap.latencyMs)
    }
  };
}

function validateConcurrencyResult(result, checkDbRows = true) {
  const failures = [];
  const expectedCompany = JSON.stringify([200, 409, 409, 409, 409]);
  const expectedSso = JSON.stringify([200, 401, 401, 401, 401]);
  const companySorted = [...(result.companyOptimisticLockStatuses || [])].sort((a, b) => a - b);
  const ssoSorted = [...(result.ssoReplayRaceStatuses || [])].sort((a, b) => a - b);
  const targetStatuses = result.targetUpsertRaceStatuses || [];

  if (JSON.stringify(companySorted) !== expectedCompany) {
    failures.push(
      `companyOptimisticLockStatuses expected ${expectedCompany}, got ${JSON.stringify(companySorted)}`
    );
  }
  if (JSON.stringify(ssoSorted) !== expectedSso) {
    failures.push(
      `ssoReplayRaceStatuses expected ${expectedSso}, got ${JSON.stringify(ssoSorted)}`
    );
  }
  if (targetStatuses.length !== 10 || !targetStatuses.every((s) => s === 200)) {
    failures.push(
      `targetUpsertRaceStatuses expected 10x HTTP 200, got ${JSON.stringify(targetStatuses)}`
    );
  }
  if (checkDbRows && result.candidate1TargetRows !== 1) {
    failures.push(
      `candidate1TargetRows expected 1, got ${String(result.candidate1TargetRows)}`
    );
  }
  return {
    passed: failures.length === 0,
    failures
  };
}

async function runConcurrencySafetySuite(opts, ctx) {
  console.log('[CONCURRENCY] Running optimistic locking, SSO replay, and target-write race checks...');

  // 1. Parallel identical PUT /api/v1/companies/me with same version
  const freshCompanyRes = await timedFetch(
    `${opts.baseUrl}/api/v1/companies/me`,
    { headers: { Authorization: `Bearer ${ctx.hr2.token}` } },
    opts.timeoutMs
  );
  if (freshCompanyRes.status !== 200) {
    throw new Error(
      `Failed to fetch fresh company before concurrency burst: HTTP ${freshCompanyRes.status} ${freshCompanyRes.text}`
    );
  }
  const freshCompany = JSON.parse(freshCompanyRes.text);
  const companyBurst = await Promise.all(
    Array.from({ length: 5 }, () =>
      timedFetch(
        `${opts.baseUrl}/api/v1/companies/me`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${ctx.hr2.token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: freshCompany.name,
            industry: freshCompany.industry,
            size: freshCompany.size,
            address: freshCompany.address,
            city: freshCompany.city,
            website: freshCompany.website,
            description: freshCompany.description,
            version: freshCompany.version
          })
        },
        opts.timeoutMs
      )
    )
  );
  const companyStatuses = companyBurst.map((r) => r.status).sort((a, b) => a - b);

  // 2. Parallel identical POST /api/v1/auth/sso with the same single-use ticket
  const sharedTicket = await mintSsoTicket(opts.mockUrl, opts.serviceKey, 'lms-sv-001', opts.timeoutMs);
  const ssoBurst = await Promise.all(
    Array.from({ length: 5 }, () =>
      timedFetch(
        `${opts.baseUrl}/api/v1/auth/sso`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ticket: sharedTicket })
        },
        opts.timeoutMs
      )
    )
  );
  const ssoStatuses = ssoBurst.map((r) => r.status).sort((a, b) => a - b);

  // 3. Parallel PUT /api/v1/me/target for candidate1
  const targetBurst = await Promise.all(
    Array.from({ length: 10 }, () =>
      timedFetch(
        `${opts.baseUrl}/api/v1/me/target`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${ctx.candidates[0].token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ positionId: 1 })
        },
        opts.timeoutMs
      )
    )
  );
  const targetStatuses = targetBurst.map((r) => r.status).sort((a, b) => a - b);

  let targetRowCount = null;
  if (opts.dockerTelemetry) {
    try {
      const { stdout } = await execFileAsync(
        'docker',
        [
          'exec',
          'rikkei-postgres',
          'psql',
          '-U',
          'rikkei_app',
          '-d',
          'rikkeijobs',
          '-t',
          '-A',
          '-c',
          `SELECT COUNT(*) FROM candidate_targets WHERE user_id = ${ctx.candidates[0].userId};`
        ],
        { timeout: 5000 }
      );
      targetRowCount = Number.parseInt(stdout.trim(), 10);
    } catch {
      targetRowCount = null;
    }
  }

  const baseResult = {
    companyOptimisticLockStatuses: companyStatuses,
    ssoReplayRaceStatuses: ssoStatuses,
    targetUpsertRaceStatuses: targetStatuses,
    candidate1TargetRows: targetRowCount
  };
  const check = validateConcurrencyResult(baseResult, opts.dockerTelemetry);
  const result = { ...baseResult, ...check };
  console.log('  Concurrency results:', JSON.stringify(result));
  if (!result.passed) {
    console.error(`[CONCURRENCY FAIL] ${result.failures.join('; ')}`);
  }
  return result;
}

const CLEAN_SEED_NOTICE =
  "[NOTICE] This harness mutates 7 dynamic tables (candidate_targets, gap_results, internships, internship_tasks, job_recommendations, used_sso_tickets, companies.version). Reset the stack with 'docker compose down -v && docker compose up -d --build --wait' afterwards when a pristine seed database is required.";

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  console.log(CLEAN_SEED_NOTICE);
  const ctx = await setupContext(opts);
  const report = {
    timestampUtc: new Date().toISOString(),
    config: {
      baseUrl: opts.baseUrl,
      mockUrl: opts.mockUrl,
      mode: opts.mode,
      runs: opts.runs,
      iters: opts.iters,
      authIters: opts.authIters,
      writeIters: opts.writeIters,
      steps: opts.steps,
      stepDurationMs: opts.stepDurationMs,
      timeoutMs: opts.timeoutMs
    }
  };

  if (opts.mode === 'all' || opts.mode === 'endpoints') {
    report.endpoints = await runEndpointsSuite(opts, ctx);
  }
  if (opts.mode === 'all' || opts.mode === 'ramp') {
    report.ramp = await runRampSuite(opts, ctx);
  }
  if (opts.mode === 'all' || opts.mode === 'concurrency') {
    report.concurrency = await runConcurrencySafetySuite(opts, ctx);
  }

  if (opts.jsonOut) {
    fs.writeFileSync(opts.jsonOut, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    console.log(`Saved JSON report to ${opts.jsonOut}`);
  } else {
    console.log('\n=== RAW JSON SUMMARY ===');
    console.log(JSON.stringify(report, null, 2));
  }

  console.log(CLEAN_SEED_NOTICE);
  if (report.concurrency && !report.concurrency.passed) {
    process.exitCode = 1;
  }
}

export {
  parseArgs,
  classifyError,
  summarizeSeries,
  percentile,
  summarizeRun,
  evaluateRampThresholds,
  validateConcurrencyResult
};

const isDirectRun =
  process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isDirectRun) {
  main().catch((err) => {
    console.error(`Fatal error: ${err.stack || err.message}`);
    process.exit(1);
  });
}
