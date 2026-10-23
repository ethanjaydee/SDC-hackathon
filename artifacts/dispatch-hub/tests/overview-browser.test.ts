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
  shop: { name: 'Dispatch Hub Workshop', label: 'Demo workshop · Puchong', area: 'Puchong', lat: 3.0431, lng: 101.6161 },
  vans: [
    { id: 2, name: 'Workshop Van 2', plate: 'DEMO-V02', status: 'Busy', technician_id: 2, technician_name: 'Mina Tan', dispatch_id: 7 },
  ],
  technicians: [
    { id: 1, name: 'Ari Lee', status: 'Available', zone: 'North', van_id: 1 },
    { id: 2, name: 'Mina Tan', status: 'Busy', zone: 'Central', van_id: 2, lat: 3.025, lng: 101.617 },
  ],
  inventory: [
    { id: 1, van_id: 1, part_name: 'Capacitor', quantity: 5 },
    { id: 2, van_id: 1, part_name: 'Fuse', quantity: 1 },
    { id: 3, van_id: 2, part_name: 'Relay', quantity: 3 },
  ],
  activity_log: [{
    id: 7,
    timestamp: '2026-10-23T10:00:00.000Z',
    completion_dispatch_id: null,
    action_details: 'Dispatch approved for Mina Tan',
    approved_by: 'Boss',
    dispatch: {
      status: 'Active', completed_at: null, tech_id: 2, technician_name: 'Mina Tan', van_id: 2,
      parts: ['Relay'],
      customer_site: { id: 'south', label: 'Demo customer · Cheras', area: 'Cheras', lat: 3.0993, lng: 101.7428 },
      shop_location: { name: 'Dispatch Hub Workshop', label: 'Demo workshop · Puchong', area: 'Puchong', lat: 3.0431, lng: 101.6161 },
      conversation_id: 1,
    },
  }],
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
  await page.getByTestId('button-role-boss').click();
  await page.getByTestId('overview-readiness').waitFor();
  await page.getByTestId('overview-availability-value').getByText('1').waitFor();
  return { context, page };
}

test('overview prioritizes technician availability with unfinished requests, sales, and sample customer rating', {
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
      assert.equal(await page.getByRole('button', { name: /sign out/i }).count(), 1, 'demo role can be switched back to the chooser');
      const circle = page.getByTestId('overview-availability-circle');
      assert.equal(await circle.getAttribute('role'), 'img');
      assert.match(await circle.getAttribute('aria-label') || '', /1 of 2 available/);
      assert.equal(await page.getByText('View readiness', { exact: true }).count(), 0);
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
      assert.equal(await page.getByTestId('link-overview-low-stock').getAttribute('href'), '/transport');
      assert.equal(await page.getByTestId('link-overview-log').getAttribute('href'), '/log');

      const circleBox = await circle.boundingBox();
      const stockBox = await page.getByTestId('overview-unfinished-requests').boundingBox();
      assert.ok(circleBox && stockBox);
      assert.ok(circleBox.width > 220, 'the availability circle remains the dominant visual element');
      assert.ok(stockBox.x > circleBox.x, 'stock summaries sit in the secondary right-side column');

      const dispatchedColors = await page.evaluate(() => {
        const theme = document.createElement('div');
        theme.className = 'dark';
        const card = document.createElement('div');
        card.className = 'dh-dispatched-glass';
        const text = document.createElement('span');
        text.className = 'text-foreground';
        card.append(text);
        theme.append(card);
        document.body.append(theme);
        const colors = { background: getComputedStyle(card).backgroundColor, text: getComputedStyle(text).color };
        theme.remove();
        return colors;
      });
      assert.equal(dispatchedColors.background, 'rgb(5, 46, 35)');
      assert.equal(dispatchedColors.text, 'rgb(236, 253, 245)');

      await page.getByRole('link', { name: /Transport/ }).click();
      await page.getByRole('heading', { name: 'Transport' }).waitFor();
      assert.equal(await page.getByText('Restock planning period', { exact: true }).count(), 0);
      assert.equal(await page.getByLabel('Restock sample year').count(), 0);
      assert.equal(await page.getByLabel('Restock sample month').count(), 0);

      let routeRequests = 0;
      page.on('request', (request) => {
        if (/\/api\/technicians\/\d+\/route\//.test(request.url())) routeRequests += 1;
      });
      await page.getByRole('link', { name: /Technician map/ }).click();
      await page.getByTestId('boss-busy-van-2').waitFor();
      await page.getByRole('heading', { name: 'Busy van locations' }).first().waitFor();
      assert.equal(await page.getByText('Shop to customer route', { exact: true }).count(), 0);
      assert.equal(routeRequests, 0, 'the Boss map does not request a shop-to-customer route');
      const mapPins = await page.locator('.leaflet-marker-pane .af-pin').allTextContents();
      assert.ok(mapPins.includes('S'), 'shop marker is shown');
      assert.ok(mapPins.includes('V2'), 'busy van marker is shown at its sample position');
      assert.ok(mapPins.includes('C2'), 'saved customer site marker is shown');
      assert.equal(await page.locator('.leaflet-overlay-pane path.leaflet-interactive').count(), 0, 'Boss map draws no route line');
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
