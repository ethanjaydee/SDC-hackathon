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

const shortcuts = [
  { key: 'today', page: '/today' },
  { key: 'low-stock', page: '/stock/low' },
  { key: 'reorders', page: '/reorders' },
] as const;

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
    if (child.exitCode !== null) {
      throw new Error(`Vite exited before becoming ready:\n${logs}`);
    }
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
  await page.route('**/api/reorder-drafts', (route) => route.fulfill({ json: { reorders: [] } }));
}

async function openOverview(browser: Browser, width: number, height: number) {
  const context = await browser.newContext({ viewport: { width, height } });
  const page = await context.newPage();
  await mockOverviewApi(page);
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await page.getByTestId('overview-status-rings').waitFor();
  await page.getByRole('button', { name: /Available: 1 of 2/ }).waitFor();
  return { context, page };
}

async function assertRingMeasureKeyboardFlow(
  page: Page,
  label: string,
  detailTitle: string,
  fullPage: string,
  key: 'Enter' | 'Space',
) {
  const trigger = page.getByRole('button', { name: new RegExp(`^${label}:`) });
  await trigger.focus();
  await page.keyboard.press(key);
  await assert.equal(await trigger.getAttribute('aria-expanded'), 'true');

  const detail = page.getByRole('region', { name: detailTitle });
  await detail.waitFor({ state: 'visible' });
  await assert.equal(await detail.getByRole('link', { name: /Open (technicians|van stock)/ }).getAttribute('href'), fullPage);

  const close = page.getByRole('button', { name: `Close ${label} details` });
  await page.keyboard.press('Tab');
  await assert.equal(await close.evaluate((element) => element === document.activeElement), true);
  await page.keyboard.press('Enter');
  await assert.equal(await trigger.getAttribute('aria-expanded'), 'false');
  await assert.equal(await trigger.evaluate((element) => element === document.activeElement), true);
}

test('overview readiness layout, keyboard details, reduced motion, and independent shortcuts', { timeout: 120_000 }, async () => {
  assert.ok(existsSync(chromiumPath), `Chromium executable not found at ${chromiumPath}; set CHROMIUM_PATH to a local Chromium binary.`);
  const vite = await startVite();
  let browser: Browser | undefined;

  try {
    browser = await chromium.launch({ executablePath: chromiumPath, headless: true, args: ['--no-sandbox'] });

    const desktop = await openOverview(browser, 1440, 1000);
    try {
      const card = desktop.page.getByRole('region', { name: 'Readiness at a glance' });
      const group = desktop.page.getByTestId('overview-status-rings');
      const cardBox = await card.boundingBox();
      const groupBox = await group.boundingBox();
      assert.ok(cardBox && groupBox, 'readiness card and ring group should be laid out');
      assert.ok(Math.abs((cardBox.x + cardBox.width / 2) - (groupBox.x + groupBox.width / 2)) <= 2, 'ring group should be centered in its card');
      assert.equal(await group.evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(' ').length), 3, 'wide desktop should show three ring columns');
      const ringCenters = await Promise.all(['available', 'stock', 'healthy'].map(async (key) => {
        const box = await desktop.page.getByTestId(`overview-metric-card-${key}`).getByRole('button').boundingBox();
        assert.ok(box, `${key} readiness ring should be laid out on desktop`);
        return box.x + box.width / 2;
      }));
      assert.ok(Math.abs((ringCenters[0] + ringCenters[2]) / 2 - (groupBox.x + groupBox.width / 2)) <= 2, 'outer readiness rings should be symmetrically centered around the group');
      assert.ok(Math.abs(ringCenters[1] - (groupBox.x + groupBox.width / 2)) <= 2, 'middle readiness ring should align with the group center');

      await assertRingMeasureKeyboardFlow(desktop.page, 'Available', 'Technician roster', '/technicians', 'Enter');
      await assertRingMeasureKeyboardFlow(desktop.page, 'Stock on hand', 'Stock-positive inventory lines', '/stock', 'Space');
      await assertRingMeasureKeyboardFlow(desktop.page, 'Above threshold', 'Above the low-stock threshold', '/stock', 'Enter');

      for (const shortcut of shortcuts) {
        const trigger = desktop.page.getByTestId(`button-view-details-${shortcut.key}`);
        await trigger.focus();
        await desktop.page.keyboard.press('Space');
        await assert.equal(await trigger.getAttribute('aria-expanded'), 'true', `${shortcut.key} shortcut should open`);
        await assert.equal(await desktop.page.getByTestId(`link-open-overview-${shortcut.key}`).getAttribute('href'), shortcut.page);
        for (const other of shortcuts.filter(({ key }) => key !== shortcut.key)) {
          await assert.equal(await desktop.page.getByTestId(`button-view-details-${other.key}`).getAttribute('aria-expanded'), 'false', `${other.key} shortcut should stay closed`);
        }
        await desktop.page.keyboard.press('Space');
        await assert.equal(await trigger.getAttribute('aria-expanded'), 'false', `${shortcut.key} shortcut should close independently`);
      }

      const firstRing = desktop.page.getByRole('button', { name: /^Available:/ });
      await firstRing.focus();
      await desktop.page.keyboard.press('Enter');
      const todayShortcut = desktop.page.getByTestId('button-view-details-today');
      await todayShortcut.focus();
      await desktop.page.keyboard.press('Space');
      await assert.equal(await firstRing.getAttribute('aria-expanded'), 'true', 'opening a shortcut should not close readiness details');
      await assert.equal(await todayShortcut.getAttribute('aria-expanded'), 'true', 'shortcut detail should open while readiness detail remains open');
    } finally {
      await desktop.context.close();
    }

    const phone = await openOverview(browser, 390, 844);
    try {
      const group = phone.page.getByTestId('overview-status-rings');
      const groupBox = await group.boundingBox();
      assert.ok(groupBox, 'phone ring group should be laid out');
      assert.equal(await group.evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(' ').length), 1, 'phone viewport should stack rings in one column');
      const cardBoxes = await Promise.all(['available', 'stock', 'healthy'].map(async (key) => {
        const box = await phone.page.getByTestId(`overview-metric-card-${key}`).getByRole('button').boundingBox();
        assert.ok(box, `${key} ring card should be visible on phone`);
        assert.ok(box.x >= 0 && box.x + box.width <= 390, `${key} readiness control should fit within the phone viewport`);
        return box;
      }));
      assert.ok(cardBoxes[0].y < cardBoxes[1].y && cardBoxes[1].y < cardBoxes[2].y, 'phone ring cards should stack vertically');
      assert.ok(await phone.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'phone viewport should not overflow horizontally');

      await phone.page.emulateMedia({ reducedMotion: 'reduce' });
      const available = phone.page.getByRole('button', { name: /^Available:/ });
      const motion = await available.evaluate((element) => ({
        media: matchMedia('(prefers-reduced-motion: reduce)').matches,
        transition: getComputedStyle(element).transitionDuration,
      }));
      assert.equal(motion.media, true, 'browser should expose reduced-motion preference');
      const transitionSeconds = motion.transition.split(',').map((duration) => duration.trim()).map((duration) =>
        duration.endsWith('ms') ? parseFloat(duration) / 1000 : parseFloat(duration),
      );
      assert.ok(transitionSeconds.every((duration) => duration <= 0.00001), `reduced motion should minimize transitions (got ${motion.transition})`);
      await available.focus();
      await phone.page.keyboard.press('Enter');
      const reducedMotionDetail = phone.page.getByRole('region', { name: 'Technician roster' });
      await reducedMotionDetail.waitFor({ state: 'visible' });
      await assert.equal(await available.getAttribute('aria-expanded'), 'true', 'readiness details should remain usable with reduced motion');
      const animationDuration = await reducedMotionDetail.evaluate((element) => getComputedStyle(element).animationDuration);
      const animationSeconds = animationDuration.split(',').map((duration) => duration.trim()).map((duration) =>
        duration.endsWith('ms') ? parseFloat(duration) / 1000 : parseFloat(duration),
      );
      assert.ok(animationSeconds.every((duration) => duration <= 0.00001), `reduced motion should minimize detail animation (got ${animationDuration})`);
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
