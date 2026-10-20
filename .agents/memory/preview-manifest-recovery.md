---
name: Preview manifest recovery
description: Limitation encountered when restoring a preview whose existing artifact manifest is malformed.
---

The validated artifact replacement tool may parse the existing manifest first and reject it before examining a valid replacement candidate.

**Why:** A pulled version with duplicate TOML keys made the app disappear from artifact discovery, and the replacement tool rejected the original duplicate keys rather than accepting the corrected candidate.

**How to apply:** Do not keep retrying the same replacement or edit the real artifact manifest directly. A standalone preview workflow can start the frontend but may not preserve shared API routing; do not describe that as a fully restored app preview. Explain the registration blocker and obtain direction before recreating the artifact or changing the project's routing structure.
