---
name: RunPod integration scope
description: Why Serverless repair-note analysis stays separate from conversation triage
---
The five-second RunPod Serverless integration and its three prescribed fallback rules apply to the repair-note analysis endpoint, not conversation triage.

**Why:** Conversation triage has broader workshop catalog coverage and conservative technician-complexity checks. Replacing it with the vehicle-only fallback removes those safeguards.

**How to apply:** Preserve catalog-aware conversation analysis unless explicitly extending RunPod to that flow with equivalent safeguards.
