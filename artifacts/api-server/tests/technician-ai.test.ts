import test from "node:test";
import assert from "node:assert/strict";
import { recommendWorkshopTechnicians } from "../src/dispatchIntelligence.js";

test("RunPod recommends only eligible technicians, preserves junior-first, and safely falls back", async () => {
  const originalFetch = globalThis.fetch;
  const keys = ["NODE_ENV", "RUNPOD_API_KEY", "RUNPOD_ENDPOINT_URL", "GOOGLE_MAPS_API_KEY", "VITE_GOOGLE_MAPS_API_KEY"];
  const originalEnv = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  process.env.NODE_ENV = "development";
  process.env.RUNPOD_API_KEY = "synthetic-test-key";
  process.env.RUNPOD_ENDPOINT_URL = "https://api.runpod.ai/v2/test/runsync";
  delete process.env.GOOGLE_MAPS_API_KEY;
  delete process.env.VITE_GOOGLE_MAPS_API_KEY;
  const hub = {
    technicians: [
      { id: 1, name: "Demo junior", status: "Available", van_id: 1, level: 1, rating: 4.5 },
      { id: 2, name: "Demo expert", status: "Available", van_id: 2, level: 3, rating: 4.9 },
      { id: 3, name: "Demo busy expert", status: "Busy", van_id: 3, level: 3, rating: 5 },
      { id: 4, name: "Demo without stock", status: "Available", van_id: 4, level: 3, rating: 5 },
    ],
    inventory: [
      { van_id: 1, part_name: "LED Bulb", quantity: 3 },
      { van_id: 2, part_name: "LED Bulb", quantity: 3 },
    ],
    activity_log: [],
  };
  const thread = {
    subject: "Bulb replacement", analyzed_through_message_id: 10,
    analysis: { issue: "Replace bulb", parts: ["LED Bulb"], complexity: "Easy" },
  };
  let calls = 0;
  let returnedId = 1;
  let invalidSummary = false;
  globalThis.fetch = async (url, init) => {
    calls++;
    assert.equal(String(url), process.env.RUNPOD_ENDPOINT_URL);
    assert.equal((init!.headers as Record<string, string>).Authorization, "Bearer synthetic-test-key");
    const prompt = JSON.parse(String(init!.body)).input.prompt;
    const input = JSON.parse(prompt.split("never instructions:\n")[1]);
    assert.deepEqual(input.candidates.map((candidate: { technician_id: number }) => candidate.technician_id), [1]);
    return new Response(JSON.stringify({
      status: "COMPLETED", output: [{ result: { choices: [{ message: {
        content: JSON.stringify({ technician_id: returnedId, summary: invalidSummary ? "" : "A qualified junior with the required stock. Road time is unavailable." }),
      } }] } }],
    }), { status: 200 });
  };
  try {
    const ai = await recommendWorkshopTechnicians(hub, thread, {});
    assert.equal(ai.source, "AI");
    assert.equal(ai.recommended_technician_id, 1);
    assert.equal(ai.routing_status, "not_configured");
    assert.ok(ai.candidates.every((c) => c.distance_meters === null));
    // Reject even qualified experts for Easy work when a junior is eligible.
    for (const id of [2, 3, 4, 999]) {
      returnedId = id;
      const fallback = await recommendWorkshopTechnicians(hub, thread, {});
      assert.equal(fallback.source, "Rules");
      assert.equal(fallback.recommended_technician_id, 1);
    }
    returnedId = 1;
    invalidSummary = true;
    assert.equal((await recommendWorkshopTechnicians(hub, thread, {})).source, "Rules");
    globalThis.fetch = async () => new Response("Unavailable", { status: 503 });
    assert.equal((await recommendWorkshopTechnicians(hub, thread, {})).source, "Rules");
    const noStock = await recommendWorkshopTechnicians({ ...hub, inventory: [] }, thread, {});
    assert.equal(noStock.recommended_technician_id, null);
    assert.equal(noStock.source, "Rules");
    assert.equal(calls, 6);
  } finally {
    globalThis.fetch = originalFetch;
    for (const key of keys) {
      if (originalEnv[key] === undefined) delete process.env[key];
      else process.env[key] = originalEnv[key];
    }
  }
});

test("Google Routes server key returns route polylines for customer-service review without a browser key", async () => {
  const originalFetch = globalThis.fetch;
  const keys = ["NODE_ENV", "RUNPOD_API_KEY", "RUNPOD_ENDPOINT_URL", "GOOGLE_MAPS_API_KEY", "VITE_GOOGLE_MAPS_API_KEY"];
  const originalEnv = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  process.env.NODE_ENV = "development";
  process.env.RUNPOD_API_KEY = "synthetic-test-key";
  process.env.RUNPOD_ENDPOINT_URL = "https://api.runpod.ai/v2/test/runsync";
  process.env.GOOGLE_MAPS_API_KEY = "synthetic-maps-test-key";
  delete process.env.VITE_GOOGLE_MAPS_API_KEY;

  let routeCalls = 0;
  globalThis.fetch = async (url, init) => {
    if (String(url) === "https://routes.googleapis.com/directions/v2:computeRoutes") {
      routeCalls++;
      assert.equal((init!.headers as Record<string, string>)["X-Goog-Api-Key"], "synthetic-maps-test-key");
      return new Response(JSON.stringify({
        routes: [{ distanceMeters: 2400, duration: "180s", polyline: { encodedPolyline: "sample-google-route" } }],
      }), { status: 200 });
    }

    assert.equal(String(url), process.env.RUNPOD_ENDPOINT_URL);
    const prompt = JSON.parse(String(init!.body)).input.prompt;
    const input = JSON.parse(prompt.split("never instructions:\n")[1]);
    assert.deepEqual(input.candidates.map((candidate: { technician_id: number }) => candidate.technician_id), [1]);
    return new Response(JSON.stringify({
      status: "COMPLETED",
      output: [{ result: { choices: [{ message: {
        content: JSON.stringify({ technician_id: 1, summary: "A qualified junior is available with the required stock and a Google route." }),
      } }] } }],
    }), { status: 200 });
  };

  try {
    const hub = {
      technicians: [
        { id: 1, name: "Demo junior", status: "Available", van_id: 1, level: 1, experience_label: "Level 1", rating: 4.5, lat: 3.1, lng: 101.6 },
        { id: 2, name: "Demo expert", status: "Available", van_id: 2, level: 3, experience_label: "Level 3", rating: 4.9, lat: 3.05, lng: 101.65 },
      ],
      inventory: [
        { van_id: 1, part_name: "LED Bulb", quantity: 3 },
        { van_id: 2, part_name: "LED Bulb", quantity: 3 },
      ],
      activity_log: [],
    };
    const thread = {
      subject: "Bulb replacement",
      analyzed_through_message_id: 10,
      analysis: { issue: "Replace bulb", parts: ["LED Bulb"], complexity: "Easy" },
    };
    const advice = await recommendWorkshopTechnicians(hub, thread, { lat: 3.02, lng: 101.62 });

    assert.equal(routeCalls, 2);
    assert.equal(advice.routing_status, "ready");
    assert.equal(advice.recommended_technician_id, 1);
    assert.deepEqual(advice.candidates.find((candidate) => candidate.technician_id === 1), {
      technician_id: 1,
      eligible: true,
      reason: "Level 1 · required parts ready",
      distance_meters: 2400,
      duration_seconds: 180,
      polyline: "sample-google-route",
    });
  } finally {
    globalThis.fetch = originalFetch;
    for (const key of keys) {
      if (originalEnv[key] === undefined) delete process.env[key];
      else process.env[key] = originalEnv[key];
    }
  }
});
