# Pulse CRM — Backend

Backend services and shared packages for the Xeno assignment submission.

## What's included

| Path | Purpose |
|------|---------|
| `packages/database` | PostgreSQL schema (Prisma), seed scripts, migrations |
| `packages/ai-engine` | 7 AI agent tools (audience, channel, messages, copilot, etc.) |
| `packages/analytics` | KPIs, funnel, campaign analytics sync |
| `packages/shared` | Shared types, channel delivery rates |
| `channel-service` | Message delivery simulator + webhook callbacks to CRM |

API route handlers that orchestrate these packages live in **`../frontend/app/api`** (Next.js BFF pattern).

## Setup

From the **repository root**:

```bash
npm install
npm run db:generate
npm run db:push
npm run db:seed
```

### Environment

Copy `packages/database/.env.example` → `packages/database/.env` (or set `DATABASE_URL` at root).

For channel service, copy `channel-service/.env.example` → `channel-service/.env`.

### Run channel service (optional — CRM simulates inline on Vercel)

```bash
npm run dev:channel
```

Health check: http://localhost:5001/health

### Database commands

```bash
npm run db:studio    # Prisma Studio
npm run db:seed      # Reset demo customers + campaigns
```

## Tech stack

- Node.js 20+, TypeScript
- PostgreSQL + Prisma
- BullMQ + Redis (optional; inline fallback without Redis)
- Express (channel-service)
