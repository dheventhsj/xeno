# Xeno Assignment — Submission Layout

This repository is organized for **separate frontend and backend review**.

## Folder structure

```
frontend/                 ← Submit as FRONTEND
  app/                    Pages + API routes (BFF)
  components/
  lib/
  package.json

backend/                  ← Submit as BACKEND
  packages/
    database/             Prisma + PostgreSQL
    ai-engine/            AI tools & copilot
    analytics/            KPIs & funnel
    shared/               Types & constants
  channel-service/        Delivery simulator + webhooks
  README.md
```

## Live demo

| | URL |
|---|-----|
| **Frontend (deployed)** | https://pulse-crm-eta.vercel.app |
| **Health API** | https://pulse-crm-eta.vercel.app/api/health |

## Quick start (evaluators)

```bash
git clone <repo-url>
cd <repo-root>
npm install
npm run db:push
npm run db:seed
npm run dev
```

Optional second terminal:

```bash
npm run dev:channel
```

## How frontend & backend connect

1. **Frontend** (`frontend/`) serves the UI and Next.js API routes under `/api/*`.
2. **Backend packages** (`backend/packages/*`) hold database access, AI logic, and analytics.
3. API routes import `@xenopilot/database`, `@xenopilot/ai-engine`, etc. from backend packages via npm workspaces.
4. **Channel service** (`backend/channel-service/`) simulates WhatsApp/SMS/Email/RCS delivery and POSTs webhooks to `/api/webhooks/receipt`.

On Vercel, `SIMULATE_CHANNEL=1` runs delivery in-process (no separate channel service required).

## Legacy folders (ignore for submission)

- `apps/web/` — early prototype UI
- `services/crm-backend/` — earlier Express backend (superseded by Next.js API routes)
