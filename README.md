# XenoPilot — AI-Native Shopper Engagement CRM

Marketers describe goals in natural language. XenoPilot identifies shoppers, builds audiences, recommends channels, generates campaigns, executes via a stubbed channel service, and surfaces insights.

## Architecture

See [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) · [API contracts](./docs/API.md) · [Roadmap](./docs/ROADMAP.md)

## Stack

- **Frontend:** Next.js 15, TypeScript, Tailwind, React Query, Recharts
- **Backend:** Next.js API Routes + service layer
- **Database:** PostgreSQL + Prisma
- **Queue:** BullMQ + Redis (inline fallback without Redis)
- **Channel:** Separate `channel-service` with async webhook callbacks
- **AI:** 7-tool agent orchestrator (OpenAI-ready, heuristic fallback offline)

## Quick start (local)

### 1. Prerequisites
- Node 20+
- Docker Desktop (for Postgres + Redis)

### 2. Start infrastructure
```bash
docker compose up -d
```

### 3. Install & database
```bash
npm install
npm run db:generate
npm run db:push
npm run db:seed
```

### 4. Run services (3 terminals)
```bash
npm run dev:channel          # port 5001
npm run dev -w @xenopilot/crm-web   # port 3000
npm run dev:worker           # optional if Redis running
```

Or on Windows:
```powershell
powershell -ExecutionPolicy Bypass -File .\start-xenopilot.ps1
```

### 5. Open
- **CRM:** http://localhost:3000
- **API health:** http://localhost:3000/api/health

Click **Seed demo data** on the dashboard (or runs automatically) then open **AI Copilot**.

## Monorepo (submission layout)

```
frontend/              Next.js 15 marketer UI + API routes (submit as frontend)
backend/
  packages/database/   Prisma schema + seed
  packages/ai-engine/  7 AI agent tools
  packages/analytics/  KPIs + funnel
  packages/shared/     Types + channel rates
  channel-service/     Delivery simulator + webhooks (submit as backend)
```

See [SUBMISSION.md](./SUBMISSION.md) for evaluator instructions.

## Deployment

| Component | Platform |
|-----------|----------|
| crm-web | Vercel |
| channel-service | Railway |
| PostgreSQL | Neon |
| Redis | Upstash |

## Assignment alignment

- ✅ Ingest customers + orders (seed)
- ✅ NL audience segmentation
- ✅ Personalized multi-channel messages (A/B/C variants)
- ✅ Separate channel service with full event lifecycle
- ✅ Webhook-driven analytics
- ✅ AI-native copilot orchestration
- ✅ Queue-based campaign dispatch

## Tradeoffs (assignment scope)

- Heuristic AI fallback when no OpenAI key (explainable, demo-ready)
- Inline dispatch fallback when Redis unavailable
- Seed defaults to 2k customers locally (configurable up to 10k)
