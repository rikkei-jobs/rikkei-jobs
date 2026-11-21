// cspell:ignore spinbutton
/** Reproducible browser preview with synthetic API fixtures, not end-to-end backend evidence. */
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.AI05_PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.AI05_UI_BASE || 'http://127.0.0.1:5195';
const config = { id: 1, provider: 'MOCK', model: 'mock', temperature: 0.3, maxTokens: 150, dailyLimitPerUser: 2, enabled: true, updatedBy: 9, updatedAt: '2026-11-22T00:00:00Z', version: 1 };
const logs = ['OK', 'OK', 'BLOCKED'].map((status, i) => ({ id: 103 - i, userId: 1, feature: ['CHAT', 'CV', 'RECOMMEND'][i], provider: 'MOCK', model: 'mock', promptMasked: '[EMAIL], [PHONE], [ID]', response: status === 'BLOCKED' ? 'Đã đạt hạn mức AI trong ngày.' : 'Hãy làm rõ kinh nghiệm Java và bổ sung minh chứng dự án.', tokensIn: 0, tokensOut: 0, latencyMs: status === 'BLOCKED' ? 0 : 32, status, createdAt: `2026-11-22T00:0${3 - i}:00Z` }));
await mkdir('docs/ai05/screenshots', { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.AI05_BROWSER_PATH, headless: true });
const observations = [];
const contrast = [];
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, reducedMotion: 'reduce' });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/api/v1/**', route => {
    const url = new URL(route.request().url());
    let body;
    if (url.pathname.endsWith('/ai-config')) {
      if (route.request().method() === 'PUT') Object.assign(config, route.request().postDataJSON(), { version: config.version + 1 });
      body = config;
    } else if (url.pathname.endsWith('/ai-logs')) body = { items: logs, total: logs.length, page: 0, size: 20 };
    else if (url.pathname.endsWith('/ai-usage/summary')) {
      const from = url.searchParams.get('from');
      const to = url.searchParams.get('to');
      body = { timezone: 'UTC', from, to, daily: [{ date: to, feature: null, calls: 2, ok: 2, errors: 0, blocked: 1, tokensIn: 0, tokensOut: 0, unknownTokenCalls: 0 }], byFeature: [{ date: null, feature: 'CHAT', calls: 2, ok: 2, errors: 0, blocked: 1, tokensIn: 0, tokensOut: 0, unknownTokenCalls: 0 }] };
    } else body = { status: 'UP' };
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
  for (const view of ['ai-config', 'ai-logs']) {
    await page.goto(`${base}/admin/${view}?mockRole=ADMIN`);
    await page.getByRole('heading', { name: view === 'ai-config' ? 'Cấu hình AI' : 'Nhật ký AI', exact: true }).waitFor();
    if (view === 'ai-config') await page.getByRole('button', { name: 'Lưu cấu hình', exact: true }).waitFor();
    else await page.getByRole('button', { name: 'Xem chi tiết lượt gọi #103' }).waitFor();
    await page.evaluate(() => document.fonts.ready);
    for (const width of [375, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 1100 });
      const overflow = await page.evaluate(() => ({ width: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
      observations.push({ view, width, ...overflow });
      assert.ok(overflow.scroll <= overflow.width, `Unexpected page overflow ${view} at ${width}: ${JSON.stringify(overflow)}`);
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
      await page.screenshot({ path: `docs/ai05/screenshots/${view}-${width}.png`, fullPage: true });
    }
    if (view === 'ai-logs') {
      await page.getByRole('button', { name: 'Xem chi tiết lượt gọi #103' }).click();
      await page.getByRole('dialog').waitFor();
      await page.screenshot({ path: 'docs/ai05/screenshots/ai-log-detail-1440.png', fullPage: true });
      await page.keyboard.press('Escape');
      assert.equal(await page.getByRole('dialog').count(), 0);
      assert.equal(await page.getByRole('button', { name: 'Xem chi tiết lượt gọi #103' }).evaluate(element => element === document.activeElement), true);
    }
    await page.evaluate(() => { document.documentElement.setAttribute('data-theme', 'dark'); window.scrollTo({ top: 0, behavior: 'instant' }); });
    await page.screenshot({ path: `docs/ai05/screenshots/${view}-dark-1440.png`, fullPage: true });

    for (const theme of ['light', 'dark']) {
      await page.evaluate(theme => document.documentElement.setAttribute('data-theme', theme), theme);
      const pairs = await page.evaluate(() => {
        const parse = color => color.match(/[\d.]+/g)?.map(Number) || [];
        const luminance = color => {
          const channels = parse(color).slice(0, 3).map(value => { const x = value / 255; return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; });
          return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
        };
        const measured = new Map();
        for (const node of document.querySelectorAll('.ai-admin p, .ai-admin label, .ai-admin small, .ai-admin h1, .ai-admin h2, .ai-admin .ai-status, .ai-admin .rj-btn:not(:disabled)')) {
          if (!node.getClientRects().length) continue;
          const color = getComputedStyle(node).color;
          let parent = node;
          let background;
          while (parent) {
            const bg = getComputedStyle(parent).backgroundColor;
            const rgba = parse(bg);
            if (rgba.length === 3 || rgba[3] === 1) { background = bg; break; }
            parent = parent.parentElement;
          }
          if (!background) continue;
          const a = luminance(color), b = luminance(background);
          measured.set(color + '/' + background, { color, background, ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) });
        }
        return [...measured.values()];
      });
      for (const pair of pairs) assert.ok(pair.ratio >= 4.5, `Text contrast ${view}/${theme}: ${JSON.stringify(pair)}`);
      contrast.push({ view, theme, pairs });
    }
  }
  // Real browser form validation and the save payload, still against explicit synthetic fixtures.
  await page.goto(`${base}/admin/ai-config?mockRole=ADMIN`);
  await page.getByRole('spinbutton', { name: 'Hạn mức mỗi tài khoản / ngày', exact: true }).fill('2');
  await page.getByRole('checkbox', { name: 'Bật trợ lý AI' }).uncheck();
  await page.getByRole('button', { name: 'Lưu cấu hình', exact: true }).click();
  await page.getByText('Đã lưu cấu hình. Áp dụng từ lượt gọi AI tiếp theo.').waitFor();
  assert.equal(config.enabled, false);
  assert.equal(config.dailyLimitPerUser, 2);
  assert.deepEqual(errors, []);
  const report = { contrast, source: 'Synthetic HTTP fixtures; not backend end-to-end proof', observations, browserErrors: errors, savePayloadValidated: true, dialogEscapeValidated: true };
  await writeFile('docs/ai05/browser-observations.json', JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
} finally { await browser.close(); }
