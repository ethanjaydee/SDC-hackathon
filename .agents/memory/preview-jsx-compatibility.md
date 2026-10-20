---
name: Preview JSX compatibility
description: Why TypeScript generic JSX tags must rely on inference in this workspace
---

Avoid explicit generic type arguments in JSX component tags. Prefer inferred props or a typed wrapper.

**Why:** The development editor annotation step can insert HTML attributes between the component name and its generic arguments, producing invalid JSX. Type checking and production builds do not exercise this transformation, so they can pass while the workspace preview fails.

**How to apply:** After adding generic UI components, verify the running development preview as well as the build. Keep generic definitions in TypeScript; omit explicit type arguments at JSX call sites.
