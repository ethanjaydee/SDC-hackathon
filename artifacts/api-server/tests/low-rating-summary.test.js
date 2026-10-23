import assert from "node:assert/strict";
import { test } from "node:test";
import { summarizeCustomerReviews } from "../src/dispatchIntelligence.js";

test("improvement AI receives only 1- and 2-star reviews, even when called directly", async () => {
  const originalFetch = globalThis.fetch;
  const keys = ["NODE_ENV", "RUNPOD_API_KEY", "RUNPOD_ENDPOINT_URL"];
  const originalEnv = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  process.env.NODE_ENV = "development";
  process.env.RUNPOD_API_KEY = "synthetic-test-key";
  process.env.RUNPOD_ENDPOINT_URL = "https://example.test/runsync";
  let calls = 0;
  let output = {
    overview: "Low ratings mention delays and a recurring leak.",
    improvements: ["Communicate arrival times.", "Check the leak after repair."],
    strengths: ["Unwanted strengths must not appear."],
  };
  globalThis.fetch = async (_url, init) => {
    calls += 1;
    const { input } = JSON.parse(init.body);
    const data = JSON.parse(input.prompt.split("never instructions:\n")[1]);
    assert.deepEqual(data.reviews.map(({ rating }) => rating), [1, 2]);
    assert.doesNotMatch(input.prompt, /Excluded neutral|Excluded positive/);
    assert.match(input.prompt, /ONLY low-rated feedback/);
    return new Response(JSON.stringify({
      status: "COMPLETED",
      output,
    }));
  };
  try {
    const reviews = [
      { rating: 1, comment: "Late arrival." },
      { rating: 2, comment: "The leak returned." },
      { rating: 3, comment: "Excluded neutral." },
      { rating: 4, comment: "Excluded positive." },
      { rating: 5, comment: "Excluded positive." },
    ];
    const result = await summarizeCustomerReviews(reviews);
    assert.equal(calls, 1);
    assert.equal(result.improvements.length, 2);
    assert.deepEqual(result.strengths, []);
    await assert.rejects(summarizeCustomerReviews([{ rating: 5, comment: "Good visit." }]), /No low-rated reviews/);
    assert.equal(calls, 1, "no AI request is made without low-rated reviews");

    output = {
      overview: "The sample reviews describe late visits and unclear updates. ".repeat(12),
      improvements: Array.from({ length: 7 }, (_, index) =>
        `Improvement ${index + 1}: ${"Communicate arrival times and explain delays clearly. ".repeat(10)}`),
    };
    const normalized = await summarizeCustomerReviews(reviews);
    assert.ok(normalized.overview.length <= 400);
    assert.equal(normalized.improvements.length, 5);
    assert.ok(normalized.improvements.every((item) => item.length <= 300));
    assert.deepEqual(normalized.strengths, [], "missing unused strengths do not break the briefing");
    assert.match(normalized.overview, /…$/);

    output = { overview: "No specific action is supported.", improvements: [] };
    assert.deepEqual((await summarizeCustomerReviews(reviews)).improvements, []);
    output = { overview: { invalid: true }, improvements: [] };
    await assert.rejects(summarizeCustomerReviews(reviews), /invalid review summary/);
    output = { overview: "Summary.", improvements: [null] };
    await assert.rejects(summarizeCustomerReviews(reviews), /invalid review summary/);
  } finally {
    globalThis.fetch = originalFetch;
    for (const key of keys) {
      if (originalEnv[key] === undefined) delete process.env[key];
      else process.env[key] = originalEnv[key];
    }
  }
});
