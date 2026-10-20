import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import Database from 'better-sqlite3';
import express from 'express';

test('reorder drafts snapshot a supplier quote, require approval, and never change van inventory', async () => {
  const cwd = process.cwd();
  const dir = mkdtempSync(resolve(tmpdir(), 'reorder-drafts-'));
  let server;
  let db;
  try {
    process.chdir(dir);
    const { default: router } = await import(`${new URL('../src/hub.js', import.meta.url).href}?reorder-drafts`);
    process.chdir(cwd);
    db = new Database(resolve(dir, 'data/dispatch-hub.sqlite'));
    const app = express();
    app.use(express.json());
    app.use('/api', router);
    app.use((error, _req, res, _next) => res.status(error.status || 500).json({ error: error.message }));
    server = app.listen(0, '127.0.0.1');
    await new Promise<void>((resolve) => server!.once('listening', resolve));
    const address = server.address();
    assert.ok(address && typeof address !== 'string');
    const base = `http://127.0.0.1:${address.port}/api`;
    const post = (path: string, data: unknown) => fetch(`${base}/${path}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
    });
    const stockBefore = (await (await fetch(`${base}/hub-data`)).json()).inventory;
    const quoteResponse = await post('supplier-quotes', {
      search_term: 'NPN Transistor',
      part_name: 'NPN Transistor',
      product_name: 'NPN Transistor pack of 5',
      supplier_name: 'Parts Shop',
      product_url: 'https://parts.example/npn',
      price_myr: 10,
      availability_note: 'In stock',
      package_quantity: 5,
      minimum_order_packs: 2,
      shipping_myr: 5,
      quality_rating: 4,
      quality_evidence_note: 'Manufacturer datasheet confirms the part.',
    });
    assert.equal(quoteResponse.status, 201);
    const quote = await quoteResponse.json();
    const stockLine = stockBefore.find((item) => item.part_name === 'NPN Transistor' && item.van_id === 2);
    const input = {
      inventory_id: stockLine.id,
      part_name: stockLine.part_name,
      source_type: 'captured_quote',
      source_offer_id: `quote-${quote.id}`,
      supplier_name: quote.supplier_name,
      product_name: quote.product_name,
      product_url: quote.product_url,
      unit_price_myr: 2.5,
      pack_price_myr: quote.price_myr,
      package_quantity: quote.package_quantity,
      minimum_order_packs: quote.minimum_order_packs,
      shipping_myr: quote.shipping_myr,
      availability_note: quote.availability_note,
      offer_checked_at: quote.checked_at,
      offer_stale: false,
      requested_quantity: 12,
    };
    for (const invalid of [
      { ...input, inventory_id: 0 },
      { ...input, requested_quantity: 0 },
      { ...input, source_type: 'unknown' },
      { ...input, product_url: 'javascript:alert(1)' },
    ]) assert.equal((await post('reorder-drafts', invalid)).status, 400);
    assert.equal((await post('reorder-drafts', { ...input, inventory_id: 99999 })).status, 404);
    assert.equal((await post('reorder-drafts', { ...input, source_offer_id: 'quote-99999' })).status, 409);
    assert.equal((await post('reorder-drafts', { ...input, source_offer_id: 'quote-1', availability_note: 'Out of stock' })).status, 409);

    const createdResponse = await post('reorder-drafts', input);
    assert.equal(createdResponse.status, 201);
    const draft = await createdResponse.json();
    assert.equal(draft.status, 'Draft');
    assert.equal(draft.inventory_id, stockLine.id);
    assert.equal(draft.quantity_on_hand, stockLine.quantity);
    assert.equal(draft.requested_quantity, 12);
    assert.equal(draft.supplier_name, 'Parts Shop');
    assert.equal(draft.unit_price_myr, 2.5);
    assert.equal(draft.pack_price_myr, 10);
    assert.equal(draft.created_by, 'Demo Dispatcher');

    const liveInput = {
      ...input,
      source_type: 'live_catalog',
      source_offer_id: 'live-supplier-alpha:npn-transistor:0',
      supplier_name: 'Supplier Alpha',
      product_name: 'Live NPN Transistor pack',
      product_url: 'https://supplier.example/npn-transistor',
      unit_price_myr: 3,
      pack_price_myr: 15,
      package_quantity: 5,
      minimum_order_packs: null,
      shipping_myr: null,
      offer_checked_at: new Date().toISOString(),
      offer_stale: true,
      requested_quantity: 5,
    };
    assert.equal((await post('reorder-drafts', { ...liveInput, part_name: '100uF Capacitor' })).status, 409);
    const liveDraftResponse = await post('reorder-drafts', liveInput);
    const liveDraft = await liveDraftResponse.json();
    assert.equal(liveDraftResponse.status, 201, JSON.stringify(liveDraft));
    assert.equal(liveDraft.source_type, 'live_catalog');
    assert.equal(liveDraft.offer_stale, true);
    assert.equal(liveDraft.unit_price_myr, 3);
    assert.equal(liveDraft.supplier_name, 'Supplier Alpha');

    const list = await (await fetch(`${base}/reorder-drafts`)).json();
    assert.equal(list.reorders.length, 2);
    assert.equal(list.reorders.find((item) => item.id === draft.id).offer_stale, false);
    assert.equal(list.reorders.find((item) => item.id === liveDraft.id).offer_stale, true);
    const beforeApproval = (await (await fetch(`${base}/hub-data`)).json()).inventory;
    assert.deepEqual(beforeApproval, stockBefore);

    assert.equal((await post(`reorder-drafts/${draft.id}/approve`, { approved_by: '  ' })).status, 400);
    assert.equal((await post('reorder-drafts/99999/approve', { approved_by: 'Demo Dispatcher' })).status, 404);
    const approvals = await Promise.all([
      post(`reorder-drafts/${draft.id}/approve`, { approved_by: 'Demo Dispatcher' }),
      post(`reorder-drafts/${draft.id}/approve`, { approved_by: 'Demo Dispatcher' }),
    ]);
    assert.deepEqual(approvals.map((response) => response.status).sort(), [200, 409]);
    const approvedResponse = approvals.find((response) => response.status === 200)!;
    const approved = await approvedResponse.json();
    assert.equal(approved.status, 'Approved');
    assert.equal(approved.approved_by, 'Demo Dispatcher');
    assert.ok(approved.approved_at);
    assert.deepEqual((await (await fetch(`${base}/hub-data`)).json()).inventory, stockBefore);

    const persisted = new Database(resolve(dir, 'data/dispatch-hub.sqlite'), { readonly: true });
    assert.equal(persisted.prepare("SELECT count(*) AS n FROM reorder_drafts WHERE status = 'Draft'").get().n, 1);
    assert.equal(persisted.prepare("SELECT count(*) AS n FROM reorder_drafts WHERE status = 'Approved'").get().n, 1);
    persisted.close();
  } finally {
    process.chdir(cwd);
    if (server) await new Promise<void>((resolve, reject) => server!.close((error) => error ? reject(error) : resolve()));
    db?.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
