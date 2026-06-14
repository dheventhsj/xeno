# Pulse CRM (XenoPilot)

AI-native shopper engagement CRM — natural-language audiences, multi-channel campaigns, live telemetry.

**Live demo:** https://pulse-crm-eta.vercel.app

## Repository layout (submission)

This repo contains **only two folders**:

```
frontend/     Next.js 15 UI + API routes (BFF)
backend/      Database, AI engine, analytics, channel service
```

| Folder | Submit as |
|--------|-----------|
| [`frontend/`](./frontend/) | Frontend |
| [`backend/`](./backend/) | Backend |

## Quick start

From the repository root:

```bash
npm install
npm run db:push
npm run db:seed
npm run dev
```

Optional channel service (second terminal):

```bash
npm run dev:channel
```

Windows one-click:

```powershell
npm run start:all
```

## Stack

- **Frontend:** Next.js 15, React 19, Tailwind, React Query
- **Backend:** PostgreSQL + Prisma, AI engine (7 tools), BullMQ/Redis, channel simulator

## Deploy

| Component | Platform |
|-----------|----------|
| Frontend | Vercel (`vercel.json` at repo root) |
| Database | Neon PostgreSQL |
| Channel | Inline sim on Vercel, or `backend/channel-service` locally |

See `backend/docs/` for architecture and API reference.
