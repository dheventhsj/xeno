# XenoPilot Implementation Roadmap

## Phase 0 — Foundation ✅ (this sprint)
- [x] Architecture docs + API contracts
- [x] Monorepo restructure
- [x] Prisma schema (customers, orders, segments, campaigns, communications, events)
- [x] packages: database, shared, ai-engine, analytics
- [x] channel-service with simulation + webhooks
- [x] BullMQ campaign dispatch worker
- [x] crm-web: Dashboard, Copilot, Customers, Campaigns, Analytics
- [x] Seed script (configurable 1k–10k customers)
- [x] docker-compose for local Postgres + Redis

## Phase 1 — AI Command Center (Week 1)
- [ ] OpenAI GPT-4.1 function calling wired to all 7 tools
- [ ] Conversation memory + session persistence
- [ ] Command palette (⌘K) for quick actions
- [ ] Streaming agent responses

## Phase 2 — Customer Intelligence (Week 2)
- [ ] Customer detail page with full timeline
- [ ] Batch AI score recalculation job
- [ ] OpenAI embeddings for semantic customer search
- [ ] Predicted next purchase model v2

## Phase 3 — Audience Studio (Week 2)
- [ ] Saved audiences CRUD
- [ ] Audience overlap analysis
- [ ] Revenue potential + churn risk dashboards per segment

## Phase 4 — Campaign Center (Week 3)
- [ ] A/B/C variant testing + winner selection
- [ ] Campaign scheduling
- [ ] Template library

## Phase 5 — Production Hardening (Week 3–4)
- [ ] Deploy crm-web → Vercel
- [ ] Deploy channel-service → Railway
- [ ] Neon PostgreSQL + Upstash Redis
- [ ] Rate limiting, auth (Clerk), audit logs
- [ ] Load test: 100k customers, 1M events

## Phase 6 — Submission polish
- [ ] 5–6 min walkthrough video script
- [ ] Public demo URL
- [ ] README with tradeoffs section
