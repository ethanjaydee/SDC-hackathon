import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import Database from 'better-sqlite3';
import express from 'express';

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
