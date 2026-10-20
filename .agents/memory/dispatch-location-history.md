---
name: Dispatch location history
description: Preserve unknown legacy customer sites instead of inferring fictional historical locations.
---
Existing dispatch history without a saved customer site must stay explicitly unknown. Never infer its location from the current intake selection, technician zone, assignment text, or a default sample site.

**Why:** The user requires history to remain intact; none of those values proves which customer site a historical dispatch used.

**How to apply:** When extending dispatch persistence or map views, use only locations actually saved with an approval. Keep synthetic coordinates labeled and use additive SQLite migrations without a reset or database replacement.
