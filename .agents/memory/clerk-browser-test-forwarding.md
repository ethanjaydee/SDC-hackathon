---
name: Clerk browser test forwarding
description: Distinguish test-forwarding authorization failures from actual browser authentication failures.
---
With programmatic Clerk claim overrides, Playwright `route.fetch` or APIRequestContext may not receive the authorization applied to genuine browser network requests. Do not weaken app authentication to fix a 401 observed only through a forwarded test request.

**Why:** A forwarded conversation-list request returned 401 while native same-origin browser requests successfully authenticated against the list, hub, and messaging-status APIs.

**How to apply:** Remove response mocks and verify suspected authorization failures with native `page.evaluate` fetches using same-origin credentials. Compare safe status codes and response field names, never cookies, tokens, or authorization-header values. Keep response-mocked UI tests distinct from real delivery verification.
