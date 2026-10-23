---
name: RunPod integration scope
description: Why Serverless repair-note analysis stays separate from conversation triage
---
The three prescribed vehicle-note fallback rules apply only to repair-note analysis; do not reuse them in conversation triage or technician selection. These flows may share RunPod transport, but retain separate prompts and task-specific validators.

**Why:** The user asked to route customer conversation triage through RunPod. It still needs the broader workshop catalog checks and conservative complexity safeguards; replacing those with vehicle-only rules would weaken them.

**How to apply:** Use the configured RunPod transport for conversation triage while requiring every suggested part to match the workshop catalog and preventing AI from lowering rule-based difficulty.

Technician recommendations must choose only from the server-validated candidate pool, including junior-first selection for Easy work.

**Why:** The user requested working live AI recommendations, not replacement of skill, availability, or stock constraints. A valid AI response cannot authorize an ineligible dispatch.

**How to apply:** Keep task-specific validation and fallback behavior separate from the shared RunPod transport. Do not cache failed AI recommendations as fresh results; explicit retries should attempt recovery.

Synchronous repair-note analysis requires the Serverless `/runsync` route, not `/run`.

**Why:** `/run` acknowledges queued work without a completed diagnosis. Worker response envelopes also vary; a successful HTTP response alone does not establish usable diagnostic output.

**How to apply:** Check completion status and validate the worker payload before marking a response as live AI. Keep the five-second fallback deadline even when workers are queued or starting.
