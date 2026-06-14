# Pulse CRM — Frontend

Next.js 15 marketer dashboard (submit this folder as **Frontend**).

## Contents

- `app/` — Pages and `/api/*` route handlers (BFF layer)
- `components/` — UI components (Copilot, Customer Twin, campaign widgets)
- `lib/` — Server helpers (campaigns, queue, channel simulator)

## Run

From **repository root** (required for backend package linking):

```bash
npm install
npm run db:seed
npm run dev
```

Open http://localhost:3000

## Production

https://pulse-crm-eta.vercel.app
