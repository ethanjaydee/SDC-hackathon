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

    const postSummary = (data: unknown) => fetch(`${base}/summary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const emptySummary = await postSummary({ source: 'saved' });
    assert.equal(emptySummary.status, 400);
    assert.match((await emptySummary.json()).error, /No low-rated reviews/);
    assert.equal((await postSummary({ source: 'sample' })).status, 400);

    const firstResponse = await postReview({ rating: 5, comment: 'Quick service and friendly team.' });
    assert.equal(firstResponse.status, 201);
    const first = await firstResponse.json();
    assert.equal(first.rating, 5);
    assert.equal(first.comment, 'Quick service and friendly team.');
    assert.equal(db.prepare('SELECT comment FROM customer_reviews WHERE id = ?').get(first.id).comment, first.comment);
    assert.equal((await postSummary({ source: 'saved' })).status, 400);

    const secondResponse = await postReview({ rating: 2, comment: 'The technician arrived later than expected.' });
    assert.equal(secondResponse.status, 201);
    const second = await secondResponse.json();
    const updated = await (await fetch(base)).json();
    assert.equal(updated.review_count, 2);
    assert.equal(updated.average_rating, 3.5);
    assert.deepEqual(updated.reviews.map((review: { id: number }) => review.id), [second.id, first.id]);

    const requestedSummary = await postSummary({ source: 'saved' });
    assert.equal(requestedSummary.status, 503);
    assert.match((await requestedSummary.json()).error, /AI review summary is unavailable/);

    const originalFetch = globalThis.fetch;
    const originalEnv = {
      NODE_ENV: process.env.NODE_ENV,
      RUNPOD_API_KEY: process.env.RUNPOD_API_KEY,
      RUNPOD_ENDPOINT_URL: process.env.RUNPOD_ENDPOINT_URL,
    };
    process.env.NODE_ENV = 'development';
    process.env.RUNPOD_API_KEY = 'test-runpod-key';
    process.env.RUNPOD_ENDPOINT_URL = 'https://example.test/runsync';
    globalThis.fetch = async (input, init) => {
      if (new URL(String(input)).hostname === '127.0.0.1') return originalFetch(input, init);
      assert.equal(new Headers(init?.headers).get('Authorization'), 'Bearer test-runpod-key');
      const body = JSON.parse(String(init?.body));
      assert.match(body.input.prompt, /The technician arrived later than expected|Synthetic sample review/);
      assert.doesNotMatch(body.input.prompt, /Quick service and friendly team|quick response and tidy work/);
      if (body.input.prompt.includes('Synthetic sample review')) {
        assert.match(body.input.prompt, /fictional demonstration reviews/i);
      }
      return new Response(JSON.stringify({
        status: 'COMPLETED',
        output: {
          overview: 'Low-rated feedback reports delayed appointments.',
          improvements: ['Reduce arrival delays.'],
          strengths: ['Friendly team.'],
        },
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    };
    try {
      const liveSummary = await postSummary({ source: 'saved' });
      assert.equal(liveSummary.status, 200);
      const summary = await liveSummary.json();
      assert.equal(summary.overview, 'Low-rated feedback reports delayed appointments.');
      assert.deepEqual(summary.improvements, ['Reduce arrival delays.']);
      assert.deepEqual(summary.strengths, []);
      assert.equal(summary.review_count, 1);
      assert.equal(summary.source, 'saved');
      assert.ok(Number.isFinite(Date.parse(summary.generated_at)));

      const sampleResponse = await postSummary({
        source: 'sample',
        sample_reviews: [
          { rating: 5, comment: 'Synthetic sample review: quick response and tidy work.' },
          { rating: 2, comment: 'Synthetic sample review: the appointment started late.' },
        ],
      });
      assert.equal(sampleResponse.status, 200);
      const sampleSummary = await sampleResponse.json();
      assert.equal(sampleSummary.source, 'sample');
      assert.equal(sampleSummary.review_count, 1);
      assert.equal(sampleSummary.overview, 'Low-rated feedback reports delayed appointments.');
      assert.deepEqual(sampleSummary.strengths, []);
      assert.equal((await postSummary({ source: 'sample', sample_reviews: [
        { rating: 5, comment: 'Positive sample only.' },
      ] })).status, 400);
    } finally {
      globalThis.fetch = originalFetch;
      for (const [key, value] of Object.entries(originalEnv)) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }
  } finally {
    process.chdir(cwd);
    if (server) await new Promise<void>((resolveClosed, reject) => server!.close((error) => error ? reject(error) : resolveClosed()));
    db?.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
