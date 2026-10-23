import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import Database from 'better-sqlite3';
import express from 'express';

test('customer reviews validate and persist, aggregate safely, and only summarize on request', async () => {
  const cwd = process.cwd();
  const dir = mkdtempSync(resolve(tmpdir(), 'dispatch-reviews-'));
  let server;
  let db;
  try {
    process.chdir(dir);
    const { default: router } = await import(`${new URL('../src/hub.js', import.meta.url).href}?workshop-reviews`);
    process.chdir(cwd);
    db = new Database(resolve(dir, 'data/dispatch-hub.sqlite'));
    const app = express();
    app.use(express.json());
    app.use('/api', router);
    server = app.listen(0, '127.0.0.1');
    await new Promise<void>((resolveListening) => server!.once('listening', resolveListening));
    const address = server.address();
    assert.ok(address && typeof address !== 'string');
    const base = `http://127.0.0.1:${address.port}/api/workshop-reviews`;
    const postReview = (data: unknown) => fetch(base, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const initial = await (await fetch(base)).json();
    assert.deepEqual(initial, { reviews: [], review_count: 0, average_rating: null });
    assert.equal((await postReview({ rating: 6, comment: 'Invalid rating' })).status, 400);
    assert.equal((await postReview({ rating: 5, comment: '   ' })).status, 400);

    const emptySummary = await fetch(`${base}/summary`, { method: 'POST' });
    assert.equal(emptySummary.status, 400);
    assert.equal((await emptySummary.json()).error, 'Save at least one customer review before requesting an AI summary.');

    const firstResponse = await postReview({ rating: 5, comment: 'Quick service and friendly team.' });
    assert.equal(firstResponse.status, 201);
    const first = await firstResponse.json();
    assert.equal(first.rating, 5);
    assert.equal(first.comment, 'Quick service and friendly team.');
    assert.equal(db.prepare('SELECT comment FROM customer_reviews WHERE id = ?').get(first.id).comment, first.comment);

    const secondResponse = await postReview({ rating: 3, comment: 'The technician arrived later than expected.' });
    assert.equal(secondResponse.status, 201);
    const second = await secondResponse.json();
    const updated = await (await fetch(base)).json();
    assert.equal(updated.review_count, 2);
    assert.equal(updated.average_rating, 4);
    assert.deepEqual(updated.reviews.map((review: { id: number }) => review.id), [second.id, first.id]);

    const requestedSummary = await fetch(`${base}/summary`, { method: 'POST' });
    assert.equal(requestedSummary.status, 503);
    assert.match((await requestedSummary.json()).error, /AI review summary is unavailable/);
  } finally {
    process.chdir(cwd);
    if (server) await new Promise<void>((resolveClosed, reject) => server!.close((error) => error ? reject(error) : resolveClosed()));
    db?.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
