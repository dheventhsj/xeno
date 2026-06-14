# Pulse CRM — Backend

Backend services and shared packages (submit this folder as **Backend**).

## Contents

```
backend/
├── packages/
│   ├── database/      Prisma schema, seed, PostgreSQL
│   ├── ai-engine/     7 AI agent tools + copilot
│   ├── analytics/     KPIs, funnel, sync
│   └── shared/        Types, channel rates
├── channel-service/   Message delivery simulator + webhooks
├── docs/              Architecture & API reference
├── scripts/           Local setup & start scripts
├── docker-compose.yml Postgres + Redis
└── package.json       Backend workspace scripts
```

API orchestration lives in `../frontend/app/api` (Next.js BFF imports these packages).

## Setup

From **repository root**:

```bash
npm install
npm run db:push
npm run db:seed
```

### Environment

Copy `packages/database/.env.example` → `packages/database/.env` and set `DATABASE_URL`.

### Channel service

```bash
npm run dev:channel
```

Health: http://localhost:5001/health

### Database

```bash
npm run db:studio
npm run db:seed
```

## Docs

- [Architecture](./docs/ARCHITECTURE.md)
- [API](./docs/API.md)
