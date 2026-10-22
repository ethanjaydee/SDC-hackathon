# Field Service Dispatch & Spare-Part Matching Hub

A synthetic-data SME dispatch demo that matches repair notes to available technicians and van spare parts, with human-approved inventory allocation and an immutable audit log.

## Run & Operate

- Replit runtime: Node.js 24 (configured in `.replit`). After importing or pulling dependencies, run `pnpm install --frozen-lockfile` from the workspace root.
- Start both managed workflows: `artifacts/api-server: API Server` and `artifacts/dispatch-preview: web`. Open the **Dispatch Hub** preview at `/`; the API is routed separately under `/api`.
- Health check through the shared proxy: `curl -fsS http://localhost:80/api/healthz`.
- `pnpm --filter @workspace/api-server run dev` — run the API server (use its managed workflow)
- Dashboard preview: use managed workflow `artifacts/dispatch-preview: web`, which runs the existing `@workspace/dispatch-hub` source.
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm --filter @workspace/dispatch-hub exec tsx --test ../api-server/tests/*.test.ts` — isolated SQLite migration, dispatch, completion, and availability-reset API regressions (does not modify workspace data)
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Clerk sign-in is provisioned through Replit with managed environment secrets. RunPod analysis is intentionally mocked and requires no external credentials.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- Hub DB: SQLite via better-sqlite3. The unused shared PostgreSQL library remains available for unrelated future work.
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/dispatch-hub/` — React/Tailwind dashboard
- `artifacts/dispatch-preview/` — replacement managed preview registration; delegates to the existing dashboard rather than maintaining a second product.
- `artifacts/api-server/src/hub.js` — SQLite schema, synthetic seeds, RunPod placeholder and hub API router
- `artifacts/api-server/src/server.js` — older router retained for reference; do not mount it ahead of the current lifecycle-aware hub router.
- `lib/api-spec/openapi.yaml` — API contract; regenerate hooks/schemas after changes

## Architecture decisions

- The replacement preview registration preserves the pulled frontend source and SQLite data. **Why:** the original manifest contained duplicate TOML keys, and validated replacement rejected the malformed original before reading a corrected candidate. Its original metadata is archived unchanged under `.local/preview-recovery/`.

- SQLite was explicitly requested for this MVP; do not silently replace it with PostgreSQL.
- RunPod is a dummy helper by request, not a live AI integration. Keep mock mode explicit.
- The approval name is a demo audit label, not verified authentication.
- SQLite files are local runtime data and excluded from Git/deployment inputs. Before real operational deployment, decide on durable storage, backups and multi-instance behavior.

## Product

Separate screens for overview, repair intake, post-intake analysis, technician map, technicians, van stock, and append-only dispatch history. Keep the desktop sidebar fixed instead of scrolling the entire dashboard between sections. Keep the interface focused on clear information technicians need in the field; omit store comparison and reorder screens.

Clerk sign-in is required for all dispatch API routes except the health check. Authenticated accounts share the same synthetic demo workspace; there is no per-technician data isolation or role-based authorization.

Completion-proof examples may use illustrative stock photos and synthetic customer signatures, but must remain separate from actual audit records. Never imply that example evidence proves an existing or legacy dispatch was completed. Customer conversations no longer expose a manual customer/technician message simulator.

Telegram uses a server-only BotFather token and outbound long polling. The bot identity/link is verified before exposure, and any existing webhook is left untouched. Run only one receiver per bot; set `TELEGRAM_RECEIVER_ENABLED=false` in environments that should not receive updates. Before publishing, choose the single active receiver environment and address local SQLite durability; do not run preview and production receivers on the same bot concurrently.

Telegram imports private text only, uses pseudonymous customer labels, and does not store Telegram profile names or raw chat identifiers. `/start` and `/help` explain how to use the bot; ordinary requests receive a confirmation with their inbox conversation number. Use test repair messages only: all signed-in demo accounts share the inbox. Incoming messages generate deterministic mock analysis but never approve dispatch automatically. `/new` starts a separate request on the next text message. New Telegram threads have no customer site until a dispatcher explicitly chooses a synthetic sample site; never infer a site from the sender or current selection. WhatsApp remains unconnected.

## User preferences

Use synthetic data only (no real personal info). Preserve the existing dispatch workflow and Lucide icons. The requested visual reference is the user's AutoFlow app: a dark sidebar, warm off-white content area, orange accents, and rounded neutral cards.

Keep map tiles light in both app themes. Theme switching should reveal the new theme as a growing circle originating from the theme-toggle icon, respecting reduced-motion preferences.

For the main overview, the user approved the Xiaomi-inspired design with circular progress/status indicators instead of the existing summary-card layout. Keep the fixed sidebar and separate workflow screens.

Analysis should appear only after repair intake is submitted, not as a permanent panel on the main page. The user chose sample locations for the technician/customer map; label positions as synthetic demo coordinates, not live GPS. Distances are straight-line estimates, not road routes or arrival times.
Three-column dispatch dashboard: repair notes, mock analysis with inventory-aware technician matching and approval, and current van stock with append-only approval history.

## User preferences

Use synthetic data only (no real personal info). Preserve custom Tailwind component styling and Lucide icons, dark neutral backgrounds, slate/zinc cards, and the requested three-column layout.

## Gotchas

- Restart the existing managed API workflow after backend changes.
- Each listed required part consumes one unit; duplicate part names consume multiple units.
- Dispatch stock validation, stock deduction, Busy status and log insertion are one transaction.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
