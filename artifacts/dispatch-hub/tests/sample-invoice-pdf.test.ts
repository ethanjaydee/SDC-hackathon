import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { PDFDocument } from 'pdf-lib';
import type { SampleEInvoice } from '@workspace/api-client-react';
import { createSampleInvoicePdf } from '../src/components/dispatch/sampleInvoicePdf';

test('sample invoice generator returns a valid single-page PDF with the generated logo', async () => {
  const logo = new Uint8Array(await readFile(new URL('../src/assets/invoice-logo.png', import.meta.url)));
  const sample: SampleEInvoice = {
    invoice_number: 'SAMPLE-WO-1001',
    job_number: 'WO-1001',
    line_description: 'Air conditioning filter service and inspection',
    job_scope: 'Filter service',
    technician_name: 'Demo Technician',
    completed_at: '2026-10-20T09:00:00.000Z',
    amount_myr: 255,
    currency: 'MYR',
    sample_note: 'Illustrative sample only.',
    generated_at: '2026-10-24T12:00:00.000Z',
  };
  const bytes = await createSampleInvoicePdf(sample, logo);
  const pdf = await PDFDocument.load(bytes);
  assert.equal(pdf.getPageCount(), 1);
  assert.match(pdf.getTitle() ?? '', /SAMPLE-WO-1001/);
});
