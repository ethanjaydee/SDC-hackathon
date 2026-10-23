import assert from "node:assert/strict";
import { test } from "node:test";
import { generateSampleEInvoice } from "../src/sampleEInvoice.js";

const sample = {
  job_number: "SAMPLE-003-01",
  technician_name: "Ravi Kumar",
  completed_at: "2026-10-10T12:00:00.000Z",
  job_scope: "Air-conditioner capacitor assessment",
  amount_myr: 320,
};

test("sample e-invoice uses validated AI wording and server-controlled sample totals", async () => {
  let capturedPrompt = "";
  const result = await generateSampleEInvoice(sample, {
    requestJson: async (prompt, options) => {
      capturedPrompt = prompt;
      assert.equal(options.timeoutMs, 20_000);
      return { line_description: "Sample service visit and capacitor assessment" };
    },
  });

  assert.match(capturedPrompt, /untrusted data/);
  assert.equal(result.line_description, "Sample service visit and capacitor assessment");
  assert.equal(result.amount_myr, sample.amount_myr);
  assert.equal(result.currency, "MYR");
  assert.equal(result.invoice_number, "SAMPLE-SAMPLE-003-01");
  assert.match(result.sample_note, /not payable/i);
  assert.ok(!Number.isNaN(Date.parse(result.generated_at)));
});

test("sample e-invoice rejects empty or oversized AI wording", async () => {
  await assert.rejects(
    generateSampleEInvoice(sample, { requestJson: async () => ({ line_description: " " }) }),
    /invalid sample invoice wording/i,
  );
  await assert.rejects(
    generateSampleEInvoice(sample, { requestJson: async () => ({ line_description: "x".repeat(201) }) }),
    /invalid sample invoice wording/i,
  );
});
