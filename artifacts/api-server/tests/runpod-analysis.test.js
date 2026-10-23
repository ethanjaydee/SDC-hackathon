import test from "node:test";
import assert from "node:assert/strict";
import { callRunPodModel } from "../src/runpodAnalysis.js";

const options = { apiKey: "synthetic-test-key", endpoint: "https://api.runpod.ai/v2/test/runsync" };
test("posts the authenticated prompt and parses fenced Serverless output", async () => {
  const result = await callRunPodModel("blank meter", {
    ...options,
    fetchImpl: async (_url, init) => {
      assert.equal(init.headers.Authorization, "Bearer synthetic-test-key");
      assert.match(JSON.parse(init.body).input.prompt, /blank meter/);
      assert.ok(init.signal instanceof AbortSignal);
      return { ok: true, json: async () => ({ status: "COMPLETED", output: '```json\n{"issue":"Cluster fault","parts":["100uF Capacitor"],"urgency":"High"}\n```' }) };
    },
  });
  assert.deepEqual(result, { issue: "Cluster fault", parts: ["100uF Capacitor"], urgency: "High", is_fallback: false });
});
test("accepts direct JSON worker output", async () => {
  const result = await callRunPodModel("engine", { ...options, fetchImpl: async () => ({
    ok: true, json: async () => ({ output: { issue: "Oil service", parts: ["Wix 57356 Filter"], urgency: "Medium" } }),
  }) });
  assert.equal(result.is_fallback, false);
});
test("falls back for HTTP errors, invalid JSON, invalid schema, and unfinished jobs", async () => {
  for (const response of [
    { ok: false },
    { ok: true, json: async () => { throw new SyntaxError(); } },
    { ok: true, json: async () => ({ output: { issue: "bad", parts: [42], urgency: "High" } }) },
    { ok: true, json: async () => ({ status: "IN_QUEUE", id: "test" }) },
  ]) {
    assert.equal((await callRunPodModel("oil filter", { ...options, fetchImpl: async () => response })).is_fallback, true);
  }
});
test("deadline aborts stalled requests and returns local rules", async () => {
  let signal;
  const result = await callRunPodModel("blank meter", { ...options, timeoutMs: 10, fetchImpl: (_url, init) => {
    signal = init.signal;
    return new Promise(() => {});
  } });
  assert.equal(signal.aborted, true);
  assert.equal(result.issue, "Dashboard Cluster Malfunction");
});
test("missing configuration uses the three specified fallback branches", async () => {
  for (const [text, issue, urgency] of [
    ["speedo engine", "Dashboard Cluster Malfunction", "High"],
    ["oil service", "Routine Engine Servicing", "Medium"],
    ["unknown noise", "General Repair Assessment", "Low"],
  ]) {
    assert.deepEqual((await callRunPodModel(text, { apiKey: "", endpoint: "" })), {
      issue, urgency, is_fallback: true,
      parts: urgency === "High" ? ["100uF Capacitor", "NPN Transistor"] : [urgency === "Medium" ? "Wix 57356 Filter" : "100uF Capacitor"],
    });
  }
});
