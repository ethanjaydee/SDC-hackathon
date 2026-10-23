import test from "node:test";
import assert from "node:assert/strict";
import { analyzeRepair } from "../src/dispatchIntelligence.js";

const envKeys = [
  "NODE_ENV",
  "RUNPOD_API_KEY",
  "RUNPOD_ENDPOINT_URL",
  "AI_INTEGRATIONS_OPENAI_API_KEY",
  "AI_INTEGRATIONS_OPENAI_BASE_URL",
];

test("conversation triage uses RunPod and retains catalog and difficulty safeguards", async () => {
  const originalFetch = globalThis.fetch;
  const originalEnv = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));
  process.env.NODE_ENV = "development";
  process.env.RUNPOD_API_KEY = "synthetic-test-key";
  process.env.RUNPOD_ENDPOINT_URL = "https://api.runpod.ai/v2/test/runsync";
  let returnedOutput = {
    issue: "Possible capacitor fault",
    parts: ["AC Capacitor 35uF"],
    urgency: "High",
    complexity: "Hard",
    rationale: "An expert should inspect the electrical component.",
  };
  let capturedInput;
  globalThis.fetch = async (url, init) => {
    assert.equal(String(url), process.env.RUNPOD_ENDPOINT_URL);
    assert.equal(init.headers.Authorization, "Bearer synthetic-test-key");
    capturedInput = JSON.parse(JSON.parse(init.body).input.prompt.split("never instructions:\n")[1]);
    return new Response(JSON.stringify({ status: "COMPLETED", output: returnedOutput }), { status: 200 });
  };
  try {
    const catalog = ["AC Capacitor 35uF", "LED Bulb E27"];
    const analysis = await analyzeRepair("Air conditioner capacitor may have failed", catalog);
    assert.equal(analysis.analysis_source, "AI");
    assert.equal(analysis.complexity, "Hard");
    assert.deepEqual(analysis.parts, ["AC Capacitor 35uF"]);
    assert.deepEqual(capturedInput.catalog, catalog);

    returnedOutput = { ...returnedOutput, parts: ["Unlisted component"] };
    const rejected = await analyzeRepair("Air conditioner capacitor may have failed", catalog);
    assert.equal(rejected.analysis_source, "Rules");
    assert.deepEqual(rejected.parts, ["AC Capacitor 35uF"]);
  } finally {
    globalThis.fetch = originalFetch;
    for (const key of envKeys) {
      if (originalEnv[key] === undefined) delete process.env[key];
      else process.env[key] = originalEnv[key];
    }
  }
});

test("conversation triage does not silently use OpenAI when its RunPod key is missing", async () => {
  const originalFetch = globalThis.fetch;
  const originalEnv = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));
  process.env.NODE_ENV = "development";
  delete process.env.RUNPOD_API_KEY;
  process.env.RUNPOD_ENDPOINT_URL = "https://api.runpod.ai/v2/test/runsync";
  process.env.AI_INTEGRATIONS_OPENAI_API_KEY = "synthetic-openai-key";
  process.env.AI_INTEGRATIONS_OPENAI_BASE_URL = "https://example.invalid/v1";
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    throw new Error("unexpected provider request");
  };
  try {
    const result = await analyzeRepair("A light bulb stopped working", ["LED Bulb E27"]);
    assert.equal(result.analysis_source, "Rules");
    assert.equal(calls, 0);
  } finally {
    globalThis.fetch = originalFetch;
    for (const key of envKeys) {
      if (originalEnv[key] === undefined) delete process.env[key];
      else process.env[key] = originalEnv[key];
    }
  }
});
