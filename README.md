# Pulse CRM (XenoPilot)

AI-native shopper engagement CRM — natural-language audiences, multi-channel campaigns, live telemetry.

**Live demo:** https://pulse-crm-eta.vercel.app

## Repository layout (submission)

This repo contains **only two modules**:

```
frontend/     Next.js 15 UI + API routes (BFF)
backend/      Database, AI engine, analytics, channel service
```

| Folder | Submit as |
|--------|-----------|
| [`frontend/`](./frontend/) | Frontend |
| [`backend/`](./backend/) | Backend |

Each module has its own `package.json` and `node_modules/` (not committed to Git).

## Quick start

**Backend** (database + packages):

```bash
cd backend
npm install
npm run db:push
npm run db:seed
```

**Frontend** (install backend packages first, then frontend):

```bash
cd backend && npm install
cd ../frontend
npm install
npm run dev
```

Optional channel service (second terminal):

```bash
cd backend
npm run dev:channel
```

Windows one-click:

```powershell
.\backend\scripts\start-xenopilot.ps1
```

## Stack

- **Frontend:** Next.js 15, React 19, Tailwind, React Query
- **Backend:** PostgreSQL + Prisma, AI engine (7 tools), BullMQ/Redis, channel simulator

## Deploy

| Component | Platform |
|-----------|----------|
| Frontend | Vercel (`frontend/vercel.json`) |
| Database | Neon PostgreSQL |
| Channel | Inline sim on Vercel, or `backend/channel-service` locally |

See `backend/docs/` for architecture and API reference.
