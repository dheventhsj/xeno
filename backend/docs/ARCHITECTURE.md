# XenoPilot — System Architecture

> AI-Native Shopper Engagement CRM. Marketers describe goals in natural language; the system orchestrates segmentation, channel selection, campaign generation, execution, and insight generation.

## 1. Architecture Diagram

```mermaid
flowchart TB
  subgraph Client["Browser"]
    UI[Next.js 15 CRM Web]
  end

  subgraph CRM["frontend/ (Vercel)"]
    SA[Server Actions]
    API[API Routes]
    AGENT[AI Agent Orchestrator]
    WORKER[Campaign Worker]
  end

  subgraph Packages["backend/packages/"]
    AI[ai-engine]
    DB[(database / Prisma)]
    AN[analytics]
    SH[shared]
  end

  subgraph Infra["Infrastructure"]
    PG[(Neon PostgreSQL)]
    RQ[(Upstash Redis)]
    BQ[BullMQ Queues]
  end

  subgraph Channel["backend/channel-service (Railway)"]
    SEND[POST /send]
    SIM[Delivery Simulator]
    WH[Webhook Emitter]
  end

  UI --> SA & API
  SA & API --> AGENT
  AGENT --> AI
  API --> DB
  AGENT --> DB
  API --> BQ
  WORKER --> BQ
  WORKER --> SEND
  BQ --> RQ
  DB --> PG
  SIM --> WH
  WH -->|POST /api/webhooks/receipt| API
  API --> AN
  AI -->|GPT-4.1 + Tools| OpenAI[(OpenAI)]
```

## 2. Data Flow — Campaign Launch

```mermaid
sequenceDiagram
  participant M as Marketer
  participant W as CRM Web
  participant A as AI Agent
  participant Q as BullMQ
  participant C as Channel Service
  participant D as PostgreSQL

  M->>W: "Re-engage dormant skincare buyers"
  W->>A: orchestrate(goal)
  A->>D: segment + forecast + messages
  A-->>W: Campaign draft + explainability
  M->>W: Launch campaign
  W->>D: Create communications (queued)
  W->>Q: Enqueue dispatch jobs
  Q->>C: POST /send (batched)
  C-->>W: POST /api/webhooks/receipt (async)
  W->>D: Upsert communication_events (idempotent)
  W->>M: Realtime updates + insights
```

## 3. Folder Structure

```
xenopilot/
├── apps/
│   ├── crm-web/                 # Next.js 15 — marketer UI + API + workers
│   │   ├── app/
│   │   │   ├── (dashboard)/     # Dashboard, Analytics
│   │   │   ├── copilot/         # AI Command Center
│   │   │   ├── customers/       # Customer intelligence
│   │   │   ├── audiences/       # Audience Studio
│   │   │   ├── campaigns/       # Campaign Center
│   │   │   └── api/             # REST + webhooks
│   │   ├── lib/                 # Server utilities
│   │   └── workers/             # BullMQ campaign worker
│   └── channel-service/         # Standalone delivery simulator
│       └── src/
├── packages/
│   ├── database/                # Prisma schema, client, seed
│   ├── ai-engine/               # Agent tools + orchestrator
│   ├── analytics/               # Funnel, KPIs, insight helpers
│   └── shared/                  # Types, constants, channel rates
├── docs/
│   ├── ARCHITECTURE.md
│   ├── API.md
│   └── ROADMAP.md
├── docker-compose.yml           # Local Postgres + Redis
└── package.json                 # npm workspaces
```

## 4. API Contracts

See [API.md](./API.md) for full OpenAPI-style contracts.

| Service | Endpoint | Purpose |
|---------|----------|---------|
| CRM | `POST /api/agent/chat` | Natural-language goal → orchestrated actions |
| CRM | `GET /api/customers` | Paginated customer list + AI scores |
| CRM | `GET /api/customers/:id` | Profile, orders, campaigns, insights |
| CRM | `POST /api/audiences/generate` | NL → segment definition |
| CRM | `GET /api/audiences` | AI-generated audiences |
| CRM | `POST /api/campaigns` | Create campaign from agent output |
| CRM | `POST /api/campaigns/:id/launch` | Enqueue BullMQ dispatch |
| CRM | `GET /api/analytics/overview` | KPIs, funnel, AI insights |
| CRM | `POST /api/webhooks/receipt` | Idempotent event ingestion |
| CRM | `POST /api/seed` | Generate demo data |
| Channel | `POST /send` | Accept communication for simulation |
| Channel | `GET /health` | Health check |

## 5. Queue Architecture

```mermaid
flowchart LR
  LAUNCH[Campaign Launch API] --> Q1[campaign:dispatch]
  Q1 --> W1[Dispatch Worker]
  W1 --> CS[Channel Service /send]
  CS --> Q2[webhook:ingest optional buffer]
  Q2 --> W2[Receipt Worker]
  W2 --> DB[(communication_events)]
  DB --> AN[Analytics Engine]
```

**Queues**
- `campaign:dispatch` — one job per communication batch (25 concurrency)
- `campaign:complete` — mark campaign completed after all batches

**Rules**
- Controllers never call channel service directly
- Jobs are idempotent via `communicationId` + `eventType` unique constraint
- Retries: 3 attempts, exponential backoff
- Dead letter: failed jobs logged for audit

## 6. AI Orchestration Design

```mermaid
flowchart TB
  GOAL[User Goal] --> ORCH[Agent Orchestrator]
  ORCH --> T1[Customer Analyzer]
  ORCH --> T2[Audience Generator]
  ORCH --> T3[Campaign Planner]
  ORCH --> T4[Channel Strategist]
  ORCH --> T5[Message Generator]
  ORCH --> T6[Insight Generator]
  ORCH --> T7[Next Best Action]
  T1 & T2 & T3 & T4 & T5 --> PLAN[Campaign Plan JSON]
  T6 & T7 --> POST[Post-campaign recommendations]
```

**Tool registry** (packages/ai-engine):
1. `customer_analyzer` — churn, LTV, purchase probability
2. `audience_generator` — NL → Prisma filter + explanation
3. `campaign_planner` — goal → audience + channel + strategy
4. `channel_strategist` — audience → channel + confidence
5. `message_generator` — variants A/B/C per channel
6. `insight_generator` — executive summary from analytics
7. `next_best_action` — win-back, upsell, loyalty suggestions

**LLM path**: OpenAI GPT-4.1 with function calling when `OPENAI_API_KEY` is set; deterministic heuristic fallback for offline demo.

## 7. Scalability Assumptions

| Dimension | Assumption | Design choice |
|-----------|------------|---------------|
| Customers | 100k | Indexed filters on spend, dates, scores |
| Campaigns | 10k | Partition analytics by campaign_id |
| Events | 1M+ | Append-only events, idempotent upsert |
| Dispatch | 50k/min peak | BullMQ workers, batched sends |

**Conscious tradeoffs for assignment scope**
- Event sourcing lite (events table, not full CQRS)
- Single worker process locally; horizontal scale on Railway
- Embeddings deferred to Phase 2 (semantic audience search)

## 8. Deployment Topology

| Component | Platform | Notes |
|-----------|----------|-------|
| crm-web | Vercel | Serverless API + optional worker on Railway |
| channel-service | Railway | Always-on for async simulation |
| PostgreSQL | Neon | Connection pooling via Prisma |
| Redis | Upstash | BullMQ backend |
