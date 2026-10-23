---
name: RunPod integration scope
description: Why Serverless repair-note analysis stays separate from conversation triage
---
The three prescribed vehicle-note fallback rules apply only to repair-note analysis, not conversation triage or technician selection. Technician recommendations use the same RunPod transport with a separate candidate-selection prompt and validator.

**Why:** Conversation triage has broader workshop catalog coverage and conservative technician-complexity checks. Replacing it with the vehicle-only fallback removes those safeguards.

**How to apply:** Preserve catalog-aware conversation analysis unless explicitly extending RunPod to that flow with equivalent safeguards.

Technician recommendations must choose only from the server-validated candidate pool, including junior-first selection for Easy work.

**Why:** The user requested working live AI recommendations, not replacement of skill, availability, or stock constraints. A valid AI response cannot authorize an ineligible dispatch.

**How to apply:** Keep task-specific validation and fallback behavior separate from the shared RunPod transport. Do not cache failed AI recommendations as fresh results; explicit retries should attempt recovery.

Synchronous repair-note analysis requires the Serverless `/runsync` route, not `/run`.

**Why:** `/run` acknowledges queued work without a completed diagnosis. Worker response envelopes also vary; a successful HTTP response alone does not establish usable diagnostic output.

**How to apply:** Check completion status and validate the worker payload before marking a response as live AI. Keep the five-second fallback deadline even when workers are queued or starting.
