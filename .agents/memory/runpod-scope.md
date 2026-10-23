---
name: RunPod integration scope
description: Why Serverless repair-note analysis stays separate from conversation triage
---
The five-second RunPod Serverless integration and its three prescribed fallback rules apply to the repair-note analysis endpoint, not conversation triage.

**Why:** Conversation triage has broader workshop catalog coverage and conservative technician-complexity checks. Replacing it with the vehicle-only fallback removes those safeguards.

**How to apply:** Preserve catalog-aware conversation analysis unless explicitly extending RunPod to that flow with equivalent safeguards.

Synchronous repair-note analysis requires the Serverless `/runsync` route, not `/run`.

**Why:** `/run` acknowledges queued work without a completed diagnosis. Worker response envelopes also vary; a successful HTTP response alone does not establish usable diagnostic output.

**How to apply:** Check completion status and validate the worker payload before marking a response as live AI. Keep the five-second fallback deadline even when workers are queued or starting.
