# Field Service Dispatch & Spare-Part Matching Hub

> A synthetic-data dispatch workspace for repair shops that turns repair requests into accountable technician, transport, and spare-part assignments.

---

## Team Information

| Field                  | Details                                     |
| ---------------------- | ------------------------------------------- |
| **Team Name**          | Kebangaan UM (KUM)                              |
| **Team Domain**        | Domain 2         |
| **SDG Track (1–17)**   | SDG 8 — Decent Work and Economic Growth and SDG 9 — Industry, Innovation and Infrastructure |
| **Team Leader**        | Tan Kai Xue                                 |
| **University**         | Universiti Malaya                          |
| **Number of Members**  | 5                                      |

## Links

| Resource          | Link                                           |
| ----------------- | ---------------------------------------------- |
| GitHub Repository | https://github.com/ethanjaydee/SDC-hackathon  |
| Live Demo         | https://sdc-hackathon-2.replit.app/                |
| RunPod Endpoint   | https://api.runpod.ai/v2/b1dd8hy2hqo1nb/runsync      |
| Slide Deck        | https://example.com/slides                     |
| Demo Video        | https://example.com/demo-video                 |

---

## Overview

### Problem

Small and medium-sized repair workshops need to coordinate incoming repair requests, technician availability, vehicle capacity, spare parts, and customer communication in one place. Manual coordination can lead to unsuitable assignments, missing parts, unclear approval records, and poor visibility into service history.

### Solution

Dispatch Hub is a browser-based workspace for a repair shop. It analyzes repair notes, matches jobs with available technicians and catalog parts, recommends a stocked shared van, and requires explicit dispatcher approval before changing inventory or dispatch history.

The application is intentionally a synthetic-data demo. AI-assisted analysis and recommendations can use an optional RunPod endpoint, with validated rule-based fallbacks when the external service is unavailable. AI suggestions do not approve jobs automatically.

### Key Features

- **Repair intake and analysis** — Review incoming work orders and turn repair notes into structured job requirements.
- **Technician matching** — Compare technician availability, skill suitability, location samples, and required parts.
- **Shared transport allocation** — Allocate one of the workshop's available stocked vans during approval.
- **Inventory-aware dispatch** — Validate and reserve required parts atomically when a dispatch is approved.
- **Technician and dispatcher views** — Use separate synthetic Boss and Technician demo roles.
- **Routes and map view** — Display synthetic workshop/customer locations and optional Google driving routes.
- **Service history and audit log** — Preserve append-only dispatch events and job history.
- **Reviews and workshop analysis** — Review technician/customer feedback and operational summaries.
- **Telegram intake** — Optionally import repair requests and send explicit dispatcher replies through a server-side Telegram integration.

### Tech Stack

| Layer         | Technology                                      |
| ------------- | ----------------------------------------------- |
| Frontend      | React, TypeScript, Vite, Tailwind CSS           |
| Backend       | Node.js 24, Express 5, TypeScript               |
| Database      | SQLite with `better-sqlite3` and Drizzle tools  |
| Validation    | Zod and generated API schemas/hooks             |
| API contract   | OpenAPI and Orval-generated client code          |
| AI / Compute  | Optional RunPod Serverless endpoint             |
| Maps          | Leaflet/OpenStreetMap display and optional Google Routes |
| Hosting / Dev | Replit, pnpm workspaces                         |

---

## Project Structure

```text
.
├── artifacts/
│   ├── api-server/          # Express API, SQLite hub data and integrations
│   ├── dispatch-hub/        # React/Tailwind dashboard source
│   ├── dispatch-preview/    # Managed preview package for the dashboard
│   └── mockup-sandbox/      # Separate UI sandbox
├── lib/
│   ├── api-client-react/    # Generated React API hooks
│   ├── api-spec/            # OpenAPI specification and code generation
│   ├── api-zod/             # Generated Zod API schemas
│   └── db/                  # Shared database package
├── docs/                    # Design and implementation documentation
├── scripts/                 # Workspace scripts
├── submission/              # Required submission documents
├── attached_assets/         # Project assets
├── .replit                  # Replit runtime and deployment configuration
├── package.json             # Workspace scripts and root dependencies
├── pnpm-workspace.yaml      # Workspace packages and dependency catalog
├── pnpm-lock.yaml           # Locked dependency versions
└── README.md
```

### Architecture

```text
User
  │
  ▼
React Dispatch Hub (Vite)
  │  /api proxy
  ▼
Express API Server
  │
  ├──► SQLite synthetic hub data
  ├──► Optional RunPod analysis/recommendations
  ├──► Optional Google Routes directions
  └──► Optional Telegram receiver
```

The frontend development server proxies `/api` requests to the API server on port `8080`. In a managed Replit workflow, the API and web preview are started as separate services.

---

## How to Run

### Option 1 — Run on Replit (Recommended)

1. Open the [Replit Project](https://sdc-hackathon-2.replit.app/), or import this repository using **Create Repl → Import from GitHub**.
2. Install dependencies from the workspace root:

   ```bash
   pnpm install --frozen-lockfile
   ```

3. Start both managed workflows:
   - `artifacts/api-server: API Server`
   - `artifacts/dispatch-preview: web`
4. Open the Dispatch Hub web preview.
5. If optional integrations are enabled, configure their values in Replit Secrets. Do not commit credentials to the repository.

The local demo uses synthetic data and does not require external credentials for its core dispatch workflow.

### Option 2 — Run Locally

Prerequisites:

- Node.js 24 or a compatible current Node.js release
- Corepack-enabled pnpm

Install dependencies from the repository root:

```powershell
corepack.cmd pnpm install
```

Start the API server in **PowerShell**:

```powershell
$env:PORT = "8080"
corepack.cmd pnpm --filter @workspace/api-server run build
corepack.cmd pnpm --filter @workspace/api-server run start
```

Leave that terminal running. In a second PowerShell terminal, start the web app:

```powershell
$env:PORT = "5173"
$env:BASE_PATH = "/"
corepack.cmd pnpm --filter @workspace/dispatch-hub dev
```

Open [http://localhost:5173](http://localhost:5173).

The API health endpoint is available at [http://localhost:8080/api/healthz](http://localhost:8080/api/healthz).

On macOS/Linux, the equivalent environment setup is:

```bash
PORT=8080 pnpm --filter @workspace/api-server run build
PORT=8080 pnpm --filter @workspace/api-server run start

# In a second terminal:
PORT=5173 BASE_PATH=/ pnpm --filter @workspace/dispatch-hub dev
```

### Useful Commands

```bash
# Full typecheck
pnpm run typecheck

# Build all packages
pnpm run build

# Frontend typecheck
pnpm --filter @workspace/dispatch-hub run typecheck

# Frontend tests
pnpm --filter @workspace/dispatch-hub run test

# API regression tests
NODE_ENV=test pnpm --filter @workspace/dispatch-hub exec tsx --test ../api-server/tests/*.test.ts

# Regenerate API hooks and schemas from OpenAPI
pnpm --filter @workspace/api-spec run codegen
```

---

## Optional Integrations

### RunPod

RunPod is optional. When configured, the application can use it for repair-note analysis, catalog-aware conversation triage, technician recommendations, and customer-review summaries. Each task validates the response and falls back to rule-based behavior when the service is unavailable or returns an invalid response.

Configure the required values in the hosting environment rather than committing them:

- `RUNPOD_API_KEY`
- `RUNPOD_ENDPOINT_URL`

RunPod proof-of-use document: [`submission/SDC2026_Kebangaan_Universiti_Malaya_(KUM)_Runpod_POU.pdf`](submission/SDC2026_Kebangaan_Universiti_Malaya_(KUM)_Runpod_POU.pdf)

### Google Routes

Google Routes is optional. When configured, the server can return driving distance and duration from the synthetic workshop location to a synthetic customer site.

- `GOOGLE_MAPS_API_KEY`

The key must remain server-side and must not be included in the browser bundle.

### Telegram

Telegram intake is optional and uses a server-side bot receiver. Incoming messages are treated as repair requests; dispatch approval still requires an explicit action in the application.

Configure the Telegram bot credentials in the hosting environment:

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_RECEIVER_ENABLED`
- `SESSION_SECRET`

Use synthetic or test chats only. The demo role selector is not real authentication, and API routes are intentionally designed for synthetic demo data.

---

## How We Use Replit *(Required)*

The repository is structured as a pnpm workspace for Replit development. Replit provides the Node.js runtime, dependency installation, managed API and web workflows, and optional deployment configuration. The API server and dashboard preview run as separate services, with the dashboard forwarding `/api` requests to the API.

Secrets for optional integrations should be stored in Replit Secrets and never committed to source control.

Proof of use: [`submission/SDC2026_Kebangaan_Universiti_Malaya_(KUM)_Replit_POU.pdf`](submission/SDC2026_Kebangaan_Universiti_Malaya_(KUM)_Replit_POU.pdf)

## How We Use RunPod *(Required if applicable)*

RunPod is used only for optional AI-assisted analysis and recommendations. The application sends validated task-specific requests to a RunPod Serverless `/runsync` endpoint when the relevant environment variables are configured. The core synthetic demo remains usable without RunPod.

Proof of use: [`submission/SDC2026_Kebangaan_Universiti_Malaya_(KUM)_Runpod_POU.pdf`](submission/SDC2026_Kebangaan_Universiti_Malaya_(KUM)_Runpod_POU.pdf)

---

## Challenges & Learnings

- What challenges did you face, and how did you overcome them?
- We lack of time, experience, knowledge about market demand but in the end we brainstormed it with our mentor and ask some friends' parents to get info about their review for our app for improvement.
  
- What did your team learn?
- We learn how we seperate our role, collaborate and using vibe coding which is a new experience, also we helping each other on some technical issue and teaching github stuff

## Future Improvements

- [ ] Replace demo role selection with production authentication and authorization.
- [ ] Move SQLite runtime data to durable production storage with backups.
- [ ] Add production monitoring, rate limiting, and multi-instance coordination.

## Team

| Name        | Role                | GitHub                                   |
| ----------- | ------------------- | ---------------------------------------- |
| Member Name | Team Lead | [@username](https://github.com/username) |
| Ethan Jeremy Daniel | Backend | [@ethanjaydee](https://github.com/ethanjaydee)
| Member Name | Frontend            | [@username](https://github.com/username) |
| Member Name | Project Manager   | [@username](https://github.com/username) |
| Member Name| Market Research | [@username](https://github.com/username) |

---

## Submission Checklist

- [x] Team name, domain (Domain 1 / Domain 2) and SDG track filled in
- [ ] Slide deck link added
- [ ] Demo video link added
- [x] Replit used, with proof of use in `submission/`
- [x] RunPod usage and proof confirmed, if required by the competition
- [ ] Preliminary submission completed (`SDC2026_TeamName_Preliminary.pdf`)
- [x] Technology declaration completed (`SDC2026_TeamName_TechDeclaration.pdf`)
- [ ] Submission files renamed with your team name (replace `TeamName`)
- [x] Local and Replit "How to Run" steps verified
- [x] No API keys or secrets committed to the repository

## License

This project is licensed under the [Apache License 2.0](LICENSE).
