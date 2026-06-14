# Pulse CRM — Frontend

Next.js 15 marketer dashboard for the Xeno assignment submission.

## What's included

- **UI pages:** Mission Control, AI Copilot, Campaigns, Audiences, Customers, Analytics
- **Components:** Copilot, Customer Twin, message preview, delivery lifecycle, execution logs
- **API routes (BFF):** `app/api/*` — thin server layer that calls backend packages (`@xenopilot/database`, `@xenopilot/ai-engine`, etc.)

## Run locally

From the **repository root** (not this folder alone):

```bash
npm install
npm run db:push
npm run db:seed
npm run dev
```

Open http://localhost:3000

## Deploy

Production: https://pulse-crm-eta.vercel.app

Vercel root config lives in `/vercel.json` at repo root; build output is `frontend/.next`.

## Tech stack

- Next.js 15, React 19, TypeScript
- Tailwind CSS, React Query, Recharts, Lucide icons
