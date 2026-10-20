# Field Service Dispatch & Spare-Part Matching Hub

A synthetic-data SME dispatch demo that matches repair notes to available technicians and van spare parts, with human-approved inventory allocation and an immutable audit log.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (use its managed workflow)
- `pnpm --filter @workspace/dispatch-hub run dev` — dashboard (use its managed workflow)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- No external credentials are required for this demo. RunPod analysis is intentionally mocked.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- Hub DB: SQLite via better-sqlite3. The unused shared PostgreSQL library remains available for unrelated future work.
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/dispatch-hub/` — React/Tailwind dashboard
- `artifacts/api-server/src/server.js` — SQLite schema, synthetic seeds, RunPod placeholder and hub API router
- `lib/api-spec/openapi.yaml` — API contract; regenerate hooks/schemas after changes

## Architecture decisions

- SQLite was explicitly requested for this MVP; do not silently replace it with PostgreSQL.
- RunPod is a dummy helper by request, not a live AI integration. Keep mock mode explicit.
- The approval name is a demo audit label, not verified authentication.
- SQLite files are local runtime data and excluded from Git/deployment inputs. Before real operational deployment, decide on durable storage, backups and multi-instance behavior.

## Product

Three-column dispatch dashboard: repair notes, mock analysis with inventory-aware technician matching and approval, and current van stock with append-only approval history.

## User preferences

Use synthetic data only (no real personal info). Preserve custom Tailwind component styling and Lucide icons, dark neutral backgrounds, slate/zinc cards, and the requested three-column layout.

## Gotchas

- Restart the existing managed API workflow after backend changes.
- Each listed required part consumes one unit; duplicate part names consume multiple units.
- Dispatch stock validation, stock deduction, Busy status and log insertion are one transaction.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
