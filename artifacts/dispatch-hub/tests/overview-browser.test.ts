import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { existsSync } from 'node:fs';
import { test } from 'node:test';
import { chromium, type Browser, type Page } from 'playwright-core';

const port = 5179;
const baseUrl = `http://127.0.0.1:${port}`;
const chromiumPath = process.env.CHROMIUM_PATH || '/repl/tools/bin/chromium';

const hubData = {
  technicians: [
    { id: 1, name: 'Ari Lee', status: 'Available', zone: 'North', van_id: 1 },
    { id: 2, name: 'Mina Tan', status: 'Busy', zone: 'Central', van_id: 2 },
  ],
  inventory: [
    { id: 1, van_id: 1, part_name: 'Capacitor', quantity: 5 },
    { id: 2, van_id: 1, part_name: 'Fuse', quantity: 1 },
    { id: 3, van_id: 2, part_name: 'Relay', quantity: 3 },
  ],
  activity_log: [],
};

async function startVite(): Promise<{ process: ChildProcess; output: () => string }> {
  const child = spawn('pnpm', ['exec', 'vite', '--config', 'vite.config.ts', '--host', '127.0.0.1'], {
    cwd: process.cwd(),
    env: { ...process.env, PORT: String(port), BASE_PATH: '/', NODE_ENV: 'test' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let logs = '';
  child.stdout?.on('data', (chunk: Buffer) => { logs += chunk.toString(); });
  child.stderr?.on('data', (chunk: Buffer) => { logs += chunk.toString(); });
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (child.exitCode !== null) throw new Error(`Vite exited before becoming ready:\n${logs}`);
    try {
      const response = await fetch(baseUrl);
      if (response.ok) return { process: child, output: () => logs };
    } catch {
      // Vite is still starting.
    }
    await delay(200);
  }
  child.kill('SIGTERM');
  throw new Error(`Vite did not become ready at ${baseUrl}:\n${logs}`);
}

async function mockOverviewApi(page: Page) {
  await page.route('**/api/hub-data', (route) => route.fulfill({ json: hubData }));
  await page.route('**/api/conversations', (route) => route.fulfill({ json: { conversations: [
    { id: 1, dispatch_activity_id: null }, { id: 2, dispatch_activity_id: null },
  ] } }));
}

async function openOverview(browser: Browser, width: number, height: number) {
  const context = await browser.newContext({ viewport: { width, height } });
  const page = await context.newPage();
  await mockOverviewApi(page);
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await page.getByTestId('overview-readiness').waitFor();
  await page.getByTestId('overview-availability-value').getByText('1').waitFor();
  return { context, page };
}

test('overview prioritizes technician readiness with unfinished requests, sales, and sample customer rating', {
  timeout: 120_000,
}, async () => {
  assert.ok(existsSync(chromiumPath), `Chromium executable not found at ${chromiumPath}; set CHROMIUM_PATH to a local Chromium binary.`);
  const vite = await startVite();
  let browser: Browser | undefined;

  try {
    browser = await chromium.launch({ executablePath: chromiumPath, headless: true, args: ['--no-sandbox'] });
    const desktop = await openOverview(browser, 1440, 960);
    try {
      const page = desktop.page;
      assert.equal(await page.getByRole('note', { name: 'Demo profile: Boss, Dispatch manager' }).count(), 1);
      assert.equal(await page.getByRole('button', { name: /sign out/i }).count(), 0, 'the mock profile is not an interactive login');
      const circle = page.getByTestId('overview-availability-circle');
      assert.equal(await circle.getAttribute('aria-expanded'), 'false');
      assert.match(await circle.getAttribute('aria-label') || '', /1 of 2 available/);
      assert.equal(await page.getByTestId('overview-availability-value').innerText(), '1/ 2');
      assert.equal(await page.getByTestId('overview-unfinished-count').innerText(), '2');
      assert.match(await page.getByTestId('overview-sales-ytd-value').innerText(), /^RM [\d,]+$/);
      assert.match(await page.getByTestId('overview-sales-ytd').innerText(), /Mock data/i);
      assert.equal(await page.getByTestId('overview-customer-rating-value').innerText(), '3.6/5');
      assert.match(await page.getByTestId('overview-customer-rating').innerText(), /Sample/i);
      assert.equal(await page.getByTestId('overview-low-stock-count-value').innerText(), '2', 'low stock includes only quantities strictly below five');

      const availableRow = page.getByTestId('overview-technician-1');
      const busyRow = page.getByTestId('overview-technician-2');
      assert.match(await availableRow.innerText(), /available/i);
      assert.match(await busyRow.innerText(), /busy/i);
      assert.match(await busyRow.innerText(), /unavailable/i);
      assert.equal(await busyRow.locator('svg').count(), 1, 'unavailable technicians retain an icon alongside their status label');
      assert.equal(await page.getByTestId('link-overview-technicians').getAttribute('href'), '/technicians');
      assert.equal(await page.getByTestId('link-overview-requests').getAttribute('href'), '/intake');
      assert.equal(await page.getByTestId('link-overview-sales').getAttribute('href'), '/workshop-analysis');
      assert.equal(await page.getByTestId('link-overview-customer-rating').getAttribute('href'), '/reviews');
      assert.equal(await page.getByTestId('link-overview-low-stock').getAttribute('href'), '/stock/low');
      assert.equal(await page.getByTestId('link-overview-log').getAttribute('href'), '/log');

      await circle.focus();
      await page.keyboard.press('Enter');
      await assert.equal(await circle.getAttribute('aria-expanded'), 'true', 'availability details are keyboard operable');
      await page.getByRole('region', { name: 'Technician readiness details' }).waitFor({ state: 'visible' });
      await page.keyboard.press('Enter');
      await assert.equal(await circle.getAttribute('aria-expanded'), 'false');

      const circleBox = await circle.boundingBox();
      const stockBox = await page.getByTestId('overview-unfinished-requests').boundingBox();
      assert.ok(circleBox && stockBox);
      assert.ok(circleBox.width > 220, 'the availability circle remains the dominant visual element');
      assert.ok(stockBox.x > circleBox.x, 'stock summaries sit in the secondary right-side column');
    } finally {
      await desktop.context.close();
    }

    const phone = await openOverview(browser, 390, 844);
    try {
      const page = phone.page;
      const circleBox = await page.getByTestId('overview-availability-circle').boundingBox();
      const stockBox = await page.getByTestId('overview-unfinished-requests').boundingBox();
      assert.ok(circleBox && stockBox, 'mobile readiness and stock are laid out');
      assert.ok(stockBox.y > circleBox.y, 'secondary stock summaries stack beneath the main circle');
      for (const id of ['overview-technician-1', 'overview-technician-2']) {
        const box = await page.getByTestId(id).boundingBox();
        assert.ok(box && box.x >= 0 && box.x + box.width <= 390, `${id} fits within the phone viewport`);
      }
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'mobile overview has no horizontal overflow');

      await page.emulateMedia({ reducedMotion: 'reduce' });
      const transition = await page.getByTestId('overview-availability-circle').evaluate((element) => getComputedStyle(element).transitionDuration);
      assert.ok(transition.split(',').map((value) => value.trim()).every((value) => parseFloat(value) <= 0.00001 || value === '0s'), `reduced motion minimizes transitions (got ${transition})`);
    } finally {
      await phone.context.close();
    }
  } finally {
    await browser?.close();
    vite.process.kill('SIGTERM');
    if (vite.process.exitCode === null) {
      await Promise.race([
        new Promise<void>((resolve) => vite.process.once('exit', () => resolve())),
        delay(3000),
      ]);
    }
  }
});
