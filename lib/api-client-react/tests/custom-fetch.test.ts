import assert from "node:assert/strict";
import { test } from "node:test";
import { customFetch } from "../src/custom-fetch.ts";

test("aborts a stalled API request after its configured timeout", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = ((_input: RequestInfo | URL, init?: RequestInit) => new Promise((_resolve, reject) => {
    const signal = init?.signal;
    if (signal?.aborted) reject(signal.reason);
    else signal?.addEventListener("abort", () => reject(signal.reason), { once: true });
  })) as typeof fetch;
  try {
    await assert.rejects(
      customFetch("/api/hub-data", { timeoutMs: 10 }),
      (error: unknown) => error instanceof Error && error.name === "TimeoutError",
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("preserves caller cancellation instead of waiting for the request timeout", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = ((_input: RequestInfo | URL, init?: RequestInit) => new Promise((_resolve, reject) => {
    const signal = init?.signal;
    if (signal?.aborted) reject(signal.reason);
    else signal?.addEventListener("abort", () => reject(signal.reason), { once: true });
  })) as typeof fetch;
  const controller = new AbortController();
  try {
    const request = customFetch("/api/hub-data", { signal: controller.signal, timeoutMs: 60_000 });
    controller.abort();
    await assert.rejects(request, (error: unknown) => error instanceof Error && error.name === "AbortError");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
