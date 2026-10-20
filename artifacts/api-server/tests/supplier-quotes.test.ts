import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import Database from 'better-sqlite3';
import express from 'express';
import { createServer } from 'node:http';

test('supplier offers are validated, persisted, and compared only for the selected part', async () => {
  const cwd = process.cwd();
  const dir = mkdtempSync(resolve(tmpdir(), 'supplier-quotes-'));
  let server;
  let db;
  try {
    process.chdir(dir);
    const { default: router } = await import(`${new URL('../src/hub.js', import.meta.url).href}?supplier-quotes`);
    process.chdir(cwd);
    const app = express();
    app.use(express.json());
    app.use('/api', router);
    server = app.listen(0, '127.0.0.1');
    await new Promise<void>((resolve) => server!.once('listening', resolve));
    const address = server.address();
    assert.ok(address && typeof address !== 'string');
    const base = `http://127.0.0.1:${address.port}/api/supplier-quotes`;
    const post = (data: unknown) => fetch(base, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
    });
    const valid = {
      search_term: '100uF Capacitor',
      part_name: '100uF Capacitor',
      product_name: '100uF Capacitor 25V',
      supplier_name: 'Parts Shop A',
      product_url: 'https://shop-a.example/item/100uf',
      price_myr: 10,
      availability_note: 'In stock',
      package_quantity: 5,
      minimum_order_packs: 2,
      shipping_myr: 5,
      quality_rating: 5,
      quality_evidence_note: 'Datasheet lists the rated voltage.',
    };
    assert.equal((await fetch(`${base}?query=x`)).status, 400);
    assert.equal((await fetch(`${base}?query=Unknown`)).status, 200);
    assert.deepEqual((await (await fetch(`${base}?query=Unknown`)).json()).quotes, []);
    assert.equal((await post({ ...valid, quality_rating: 6 })).status, 400);
    assert.equal((await post({ ...valid, availability_note: 'Surely available' })).status, 400);
    assert.equal((await post({ ...valid, product_url: 'javascript:alert(1)' })).status, 400);

    const firstResponse = await post(valid);
    assert.equal(firstResponse.status, 201);
    const first = await firstResponse.json();
    assert.equal(first.quality_rating, 5);
    assert.equal(first.availability_note, 'In stock');
    assert.equal(first.checked_at.length > 0, true);
    assert.equal(first.package_quantity, 5);
    assert.equal(first.minimum_order_packs, 2);

    const secondResponse = await post({
      ...valid,
      supplier_name: 'Parts Shop B',
      product_name: 'Approved capacitor, warranty included',
      product_url: 'https://shop-b.example/product/123',
      price_myr: 7,
      quality_rating: 3,
      availability_note: 'Limited stock',
      quality_evidence_note: 'Three-star user reviews on listing.',
      shipping_myr: null,
    });
    assert.equal(secondResponse.status, 201);
    assert.equal((await post({ ...valid, part_name: 'NPN Transistor', search_term: 'NPN Transistor' })).status, 201);

    const comparisonResponse = await fetch(`${base}?query=${encodeURIComponent('100UF capacitor')}`);
    assert.equal(comparisonResponse.status, 200);
    const comparison = await comparisonResponse.json();
    assert.deepEqual(comparison.quotes.map((offer) => offer.supplier_name), ['Parts Shop A', 'Parts Shop B']);
    assert.equal(comparison.quotes[0].shop_url, 'https://shop-a.example');
    assert.equal(comparison.quotes[0].source_type, 'captured_quote');
    assert.equal(comparison.quotes[0].availability_note, 'In stock');

    db = new Database(resolve(dir, 'data/dispatch-hub.sqlite'), { readonly: true });
    assert.equal(db.prepare('SELECT count(*) AS n FROM supplier_quotes').get().n, 3);
  } finally {
    process.chdir(cwd);
    if (server) await new Promise<void>((resolve, reject) => server!.close((error) => error ? reject(error) : resolve()));
    db?.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test('supplier catalog returns validated live prices and isolates feed failures', async () => {
  const cwd = process.cwd();
  const dir = mkdtempSync(resolve(tmpdir(), 'supplier-catalog-'));
  const previousFeeds = process.env.SUPPLIER_CATALOG_FEEDS;
  let feedServer;
  let apiServer;
  try {
    const feed = createServer((req, res) => {
      if (req.url?.startsWith('/broken')) {
        res.writeHead(503).end();
        return;
      }
      const query = new URL(req.url ?? '/', 'http://localhost').searchParams.get('q');
      res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({
        offers: [{
          id: 'capacitor-25v',
          product_name: `Capacitor 25V matching ${query}`,
          product_url: 'https://parts.example/capacitor',
          price_myr: 12.5,
          availability_note: 'In stock',
          package_quantity: 10,
          unit_label: '10 pieces',
          source_updated_at: '2020-01-01T00:00:00.000Z',
        }],
      }));
    });
    feedServer = feed.listen(0, '127.0.0.1');
    await new Promise<void>((resolve) => feedServer!.once('listening', resolve));
    const feedAddress = feedServer.address();
    assert.ok(feedAddress && typeof feedAddress !== 'string');
    process.env.SUPPLIER_CATALOG_FEEDS = JSON.stringify([
      {
        id: 'supplier-alpha',
        name: 'Supplier Alpha',
        endpoint: `http://127.0.0.1:${feedAddress.port}/catalog`,
        query_param: 'q',
      },
      {
        id: 'supplier-broken',
        name: 'Supplier Broken',
        endpoint: `http://127.0.0.1:${feedAddress.port}/broken`,
        query_param: 'q',
      },
    ]);
    process.chdir(dir);
    const { default: router } = await import(`${new URL('../src/hub.js', import.meta.url).href}?supplier-catalog`);
    process.chdir(cwd);
    const app = express();
    app.use('/api', router);
    apiServer = app.listen(0, '127.0.0.1');
    await new Promise<void>((resolve) => apiServer!.once('listening', resolve));
    const apiAddress = apiServer.address();
    assert.ok(apiAddress && typeof apiAddress !== 'string');
    const base = `http://127.0.0.1:${apiAddress.port}/api/supplier-catalog`;

    const providers = await (await fetch(`${base}/providers`)).json();
    assert.deepEqual(providers.providers.map((provider) => provider.id), ['supplier-alpha', 'supplier-broken']);
    assert.equal((await fetch(`${base}?query=Capacitor`)).status, 400);
    assert.equal((await fetch(`${base}?query=Capacitor&supplier_ids=unknown`)).status, 400);

    const response = await fetch(
      `${base}?query=${encodeURIComponent('100uF Capacitor')}&supplier_ids=supplier-alpha&supplier_ids=supplier-broken`,
    );
    assert.equal(response.status, 200);
    const comparison = await response.json();
    assert.deepEqual(comparison.suppliers.map((supplier) => supplier.status), ['ok', 'error']);
    assert.match(comparison.suppliers[1].error, /HTTP 503/);
    const live = comparison.suppliers[0].offers[0];
    assert.equal(live.supplier_name, 'Supplier Alpha');
    assert.equal(live.price_myr, 12.5);
    assert.equal(live.availability_note, 'In stock');
    assert.equal(live.package_quantity, 10);
    assert.equal(live.unit_label, '10 pieces');
    assert.equal(live.is_stale, true);
    assert.ok(Math.abs(Date.now() - new Date(live.checked_at).getTime()) < 10_000);
  } finally {
    process.chdir(cwd);
    if (previousFeeds === undefined) delete process.env.SUPPLIER_CATALOG_FEEDS;
    else process.env.SUPPLIER_CATALOG_FEEDS = previousFeeds;
    if (apiServer) await new Promise<void>((resolve, reject) => apiServer!.close((error) => error ? reject(error) : resolve()));
    if (feedServer) await new Promise<void>((resolve, reject) => feedServer!.close((error) => error ? reject(error) : resolve()));
    rmSync(dir, { recursive: true, force: true });
  }
});
