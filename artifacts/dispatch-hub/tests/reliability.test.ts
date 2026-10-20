import assert from 'node:assert/strict';
import { test } from 'node:test';
import { retryAfterMs, retryDelay, shouldRetry, pollInterval, isOfferStale, canAutoRefresh } from '../src/lib/reliability';
import { intakeSchema, positiveQuantitySchema, supplierQuoteSchema } from '../src/lib/validation';
import { WriteGate, performHubWrite, optimisticAvailable, optimisticDispatch } from '../src/lib/hub-write';
import type { HubData } from '@workspace/api-client-react';

const sample = (): HubData => ({
  technicians: [{ id: 1, name: 'Tech A', status: 'Available', zone: 'North', van_id: 1 }],
  inventory: [{ id: 1, van_id: 1, part_name: '100uF Capacitor', quantity: 4 }],
  activity_log: [],
});
test('retry policy honors seconds and HTTP-date Retry-After, caps exponential delays, and avoids permanent 4xx retries', () => {
  const limited = { status: 429, headers: new Headers({ 'Retry-After': '120' }) };
  assert.equal(retryDelay(0, limited), 120000);
  assert.equal(retryDelay(20, new Error('offline')), 60000);
  assert.equal(retryAfterMs({ headers: new Headers({ 'Retry-After': 'Wed, 21 Oct 2026 00:02:00 GMT' }) }, Date.parse('2026-10-21T00:00:00Z')), 120000);
  assert.equal(retryAfterMs({ headers: new Headers({ 'Retry-After': 'invalid' }) }), 0);
  assert.equal(shouldRetry(0, { status: 400 }), false);
  assert.equal(shouldRetry(0, { status: 409 }), false);
  assert.equal(shouldRetry(2, limited), true);
  assert.equal(shouldRetry(3, limited), false);
  assert.equal(shouldRetry(0, new TypeError('offline')), true);
  assert.equal(pollInterval()({ state: { fetchStatus: 'fetching', error: limited, fetchFailureCount: 2 } }), false);
  assert.equal(pollInterval()({ state: { fetchStatus: 'idle', error: limited, fetchFailureCount: 2 } }), 120000);
  assert.equal(canAutoRefresh({ state: { error: limited, errorUpdatedAt: 1000 } }, 120000), false);
  assert.equal(canAutoRefresh({ state: { error: limited, errorUpdatedAt: 1000 } }, 121000), true);
});
test('intake, quantities and supplier forms reject invalid inputs before sending', () => {
  assert.equal(intakeSchema.safeParse({ text: '   ', customer_site_id: 'north' }).success, false);
  assert.equal(intakeSchema.safeParse({ text: 'Cluster is blank', customer_site_id: 'fictional' }).success, false);
  assert.equal(intakeSchema.safeParse({ text: 'Cluster is blank', customer_site_id: 'north' }).success, true);
  for (const input of ['', 0, -2, 1.5, 'abc', Infinity, 10001]) assert.equal(positiveQuantitySchema.safeParse(input).success, false);
  assert.equal(positiveQuantitySchema.parse('12'), 12);
  const valid = { search_term: 'Capacitor', part_name: 'Capacitor', product_name: 'Capacitor pack', supplier_name: 'Demo store', product_url: 'https://parts.example/capacitor', price_myr: 12, availability_note: 'In stock', quality_rating: 4, quality_evidence_note: 'Manufacturer datasheet' };
  assert.equal(supplierQuoteSchema.safeParse(valid).success, true);
  for (const change of [{ product_url: 'javascript:alert(1)' }, { product_url: 'https://user:pass@parts.example' }, { price_myr: 0 }, { quality_rating: 1.5 }, { package_quantity: 0 }, { supplier_name: ' ' }]) {
    assert.equal(supplierQuoteSchema.safeParse({ ...valid, ...change }).success, false);
  }
});
test('optimistic dispatch counts duplicate parts, never mutates original data or fabricates audit history', () => {
  const before = sample();
  const pending = optimisticDispatch(before, 1, 1, ['100uF Capacitor', '100uf capacitor']);
  assert.equal(pending.inventory[0].quantity, 2);
  assert.equal(pending.technicians[0].status, 'Busy');
  assert.equal(before.inventory[0].quantity, 4);
  assert.equal(before.technicians[0].status, 'Available');
  assert.deepEqual(pending.activity_log, []);
  assert.deepEqual(optimisticAvailable(pending, 1).inventory, pending.inventory);
});
test('write coordination rejects overlapping writes and rolls back failures before releasing the gate', async () => {
  const gate = new WriteGate();
  const original = sample();
  let cache = original;
  let release!: () => void;
  const wait = new Promise<void>((resolve) => { release = resolve; });
  const pending: boolean[] = [];
  const options = {
    cancel: async () => {},
    read: () => cache,
    write: (value: HubData) => { cache = value; },
    optimistic: (value: HubData) => optimisticDispatch(value, 1, 1, ['100uF Capacitor']),
    pending: (value: boolean) => { pending.push(value); },
    markStale: async () => {},
    request: async (): Promise<HubData> => { await wait; throw new Error('409 conflict'); },
  };
  const first = performHubWrite(gate, options);
  assert.equal(gate.busy, true);
  await Promise.resolve();
  assert.equal(cache.inventory[0].quantity, 3);
  assert.equal(await performHubWrite(gate, options), null);
  release();
  await assert.rejects(first, /409 conflict/);
  assert.equal(cache, original);
  assert.equal(gate.busy, false);
  assert.deepEqual(pending, [true, false]);
  const authoritative = { ...sample(), inventory: [] };
  assert.equal(await performHubWrite(gate, { ...options, request: async () => authoritative }), authoritative);
  assert.equal(cache, authoritative);
});
test('price freshness ages at review time and preserves supplier flagged staleness', () => {
  const now = Date.parse('2026-10-21T00:00:00Z');
  assert.equal(isOfferStale('2026-10-19T00:00:00Z', false, now), true);
  assert.equal(isOfferStale('2026-10-20T23:00:00Z', false, now), false);
  assert.equal(isOfferStale('2026-10-20T23:00:00Z', true, now), true);
  assert.equal(isOfferStale('bad-date', false, now), true);
  assert.equal(isOfferStale('2027-01-01T00:00:00Z', false, now), true);
});
