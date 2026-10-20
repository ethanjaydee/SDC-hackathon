# Dispatch Hub audit and overhaul

## Top three architectural anti-patterns

### 1. Competing presentation systems

The active TypeScript dashboard coexisted with an unused JSX dashboard and its own panels. Multiple global stylesheets expressed overlapping colors, layout rules and control styles. That made a change in one screen unreliable as a guide for another.

**Correction:** remove the unreferenced implementation; centralize theme tokens, semantic status colors and typography; use shared Tailwind/shadcn buttons and card surfaces, Radix confirmation dialogs and a mobile Sheet. Shared tables now provide filtering, sorting, pagination and mobile card rendering.

### 2. Uncoordinated server-state ownership

Periodic full-hub reads and separate action-specific locks could overlap dispatch approval, completion and availability reset. A delayed read could overwrite an optimistic result, while asymmetric locking left cross-action race windows.

**Correction:** acquire one synchronous write gate before awaiting anything, cancel older reads, snapshot the cache, apply a provisional stock/status change, and replace it with the server response. Failure restores the snapshot and revalidates. Polling is disabled during the write. Immutable audit events are never fabricated in the client.

### 3. Cross-cutting policies embedded in individual screens

Numeric coercion, generic retries, broad crash handling and saved freshness flags were treated locally rather than as application policies. A stored “fresh” price could remain fresh indefinitely; a route failure could replace the whole app.

**Correction:** add focused validation and reliability modules, bounded read retries with `Retry-After` support, route-level error isolation, inline retry controls, and freshness checks at both review and server response/approval time.

## Step-by-step changes implemented

1. **Define the visual foundation.** Replace conflicting CSS with light/dark tokens. Use neutral, amber, blue, emerald and crimson consistently; use JetBrains Mono for operational metadata. Respect reduced-motion preferences.
2. **Consolidate reusable controls.** Standardize buttons, card surfaces, badges, field errors, skeleton rows, confirmations, table controls and empty/error states. Remove unused legacy dashboard files only after checking references.
3. **Migrate the active routes.** Apply the shared controls to overview, intake, analysis, technician map, technicians, inventory, suppliers, reorder requests and dispatch history. Retain overview shortcuts and existing route behavior.
4. **Isolate rendering failures.** Keep navigation outside the route boundary, reset failed views on route changes, and provide retry/back-to-overview actions.
5. **Make reads resilient.** Add bounded exponential retry, rate-limit delays, reconnect behavior, slow-request feedback, last-update information and offline indicators. Mutations are never automatically replayed.
6. **Coordinate critical writes.** Serialize hub writes, pause competing reads, optimistically update only stock/technician state, restore failed snapshots and reconcile with the authoritative response.
7. **Validate before submission.** Validate intake/site selection, captured supplier offers and whole-number reorder quantities with field-linked errors. Keep generated server contract validation and transactional SQLite checks authoritative.
8. **Recalculate quote age.** Determine staleness using the current time when displaying/reviewing a draft and when the server reads or approves it. Preserve provider-declared stale flags.
9. **Verify the whole flow.** Run library/frontend/API type checks, frontend/API builds, focused unit and API integration tests, and one browser pass over failed/successful dispatch and completion.

## Preserved operational rules

- SQLite remains the datastore; all records remain synthetic.
- Dispatch stock deductions and job transitions remain atomic server transactions.
- Conflicting or already-applied actions still return `409`.
- Completion never replenishes used parts.
- Availability reset is not job completion.
- Unknown legacy assignments and historical customer locations remain unknown.
- Reorder approval records purchasing intent only; it does not receive goods or increase van stock.
- Polling remains the real-time transport. No fake WebSocket connectivity is presented.
- Workspace preview routing and the same-origin API proxy are preserved.

## Verification commands

```sh
pnpm run typecheck:libs
pnpm --filter @workspace/dispatch-hub run typecheck
pnpm --filter @workspace/api-server run typecheck
pnpm --filter @workspace/dispatch-hub run test
pnpm --filter @workspace/dispatch-hub exec tsx --test \
  ../api-server/tests/completion.test.ts \
  ../api-server/tests/saved-dispatch.test.ts \
  ../api-server/tests/supplier-quotes.test.ts \
  ../api-server/tests/reorder-drafts.test.ts
PORT=23464 BASE_PATH=/ pnpm --filter @workspace/dispatch-hub run build
pnpm --filter @workspace/api-server run build
```

## Remaining constraints

### Verification results

- Library, frontend and API type checks passed.
- Frontend and API production builds passed.
- Twelve frontend unit tests and six API integration tests passed.
- Browser verification confirmed failed-approval rollback, authoritative success reconciliation, saved customer-site data, completion without replenishment, mobile card layouts, no document overflow, Sheet focus restoration and dark-theme persistence.
- Rapid duplicate clicks were covered by the write-gate concurrency unit test, but the browser tester did not exercise the second click. The optional live `429` interception was not run; retry classification, delay parsing and cooldown behavior are unit-tested.
- A hot-reload-only Radix hook error appeared while the new dependency was introduced during the browser session. After restarting the preview, a fresh log-page load rendered correctly with no hook errors.
- The browser pass used normal synthetic APIs to add one dispatch approval and its completion. It consumed one capacitor and one transistor from Van 2; completion correctly did not replenish them. No records were directly edited or deleted.

This is still a synthetic-data MVP with mock AI and only configured supplier feeds. It does not add authentication, live GPS, supplier credentials or purchasing fulfillment. The frontend build currently warns about its eagerly loaded bundle size; route-level splitting is a separate performance improvement.

The editor's development annotation transform does not safely handle explicit generic arguments inside JSX tags. Typed component aliases preserve type checking without breaking the workspace preview.
