# Xeno AI-Native Mini CRM (Autonomous Marketing Strategist)

An AI-first, production-quality mini CRM designed to feel like an autonomous marketing strategist — not a CRUD dashboard. It ingests customer/order data, segments audiences via natural language, generates campaigns, simulates multi-channel delivery, learns from outcomes, and updates analytics in realtime.

## Monorepo

```
apps/
  web/                 # Next.js 14 (TS, Tailwind, shadcn, Framer Motion)
services/
  crm-backend/         # Express + TS + MongoDB + Socket.io (AI Orchestration)
  fake-provider/       # Simulated channel provider (async delivery + webhooks)
```

## Quick Start

1) Prereqs: Node 18+, MongoDB (local or cloud), npm

2) Install deps (from repo root):
```
npm install
```

3) Configure environment:
- Copy `.env.example` into each service and fill values (Mongo URL, OpenAI/Gemini key, etc.)

4) Dev servers:
```
npm run dev:crm
npm run dev:provider
npm run dev:web
```

## Environments
- Frontend: Vercel
- Backends: Render/Railway/Fly.io

## Highlights
- AI audience segmentation from natural language → Mongo filters (explainable)
- AI personas, channel recommendations with rationale
- AI campaign copilot chat UI
- Realtime campaign lifecycle via Socket.io
- Fake provider simulates sent/delivered/opened/clicked/purchased + retries
- Elegant, premium UI (glassmorphism, gradients, motion)

## Production Notes
- Swap in managed MongoDB with proper indexes and TTL policies
- Queue async jobs (BullMQ/SQS) between CRM and provider for resilience
- Add idempotent webhook handling and signature verification
- Add rate limiting, auth, and audit logging

## Environment Variables

services/crm-backend/.env
```
PORT=4000
MONGO_URI=mongodb://127.0.0.1:27017/xeno_crm
CLIENT_ORIGIN=http://localhost:3000
PROVIDER_BASE_URL=http://localhost:5001
WEBHOOK_SECRET=dev_secret
OPENAI_API_KEY=your_openai_key_optional
GEMINI_API_KEY=your_gemini_key_optional
```

services/fake-provider/.env
```
PORT=5001
CRM_WEBHOOK_URL=http://localhost:4000/api/webhooks/provider
WEBHOOK_SECRET=dev_secret
PROVIDER_NAME=alpha-sim
```

apps/web/.env.local
```
NEXT_PUBLIC_CRM_SOCKET_URL=http://localhost:4000
NEXT_PUBLIC_CRM_BASE_URL=http://localhost:4000/api
```

## Key Endpoints (CRM)
- GET /api/health
- POST /api/customers/ingest-json
- POST /api/customers/ingest-csv
- POST /api/orders/ingest-json
- POST /api/orders/ingest-csv
- POST /api/ai/segment  { prompt }
- POST /api/webhooks/provider  (provider use only)

## Deploy

Frontend (Vercel):
- Set env NEXT_PUBLIC_CRM_SOCKET_URL and NEXT_PUBLIC_CRM_BASE_URL to your backend URL
- Build command: `npm run build --workspace apps/web`

Backends (Render/Railway):
- crm-backend: Node 18, start: `npm --workspace services/crm-backend start`
- fake-provider: Node 18, start: `npm --workspace services/fake-provider start`
- Provide respective env vars; open 4000/5001 ports

