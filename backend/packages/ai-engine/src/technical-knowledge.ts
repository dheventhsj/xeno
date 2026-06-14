/**
 * Technical knowledge base for system architecture questions
 */

const KNOWLEDGE: { patterns: RegExp[]; answer: string }[] = [
  {
    patterns: [/webhook|callback|receipt/i],
    answer: `**Webhook Processing Flow:**\n\n1. Channel service simulates message lifecycle (SENT → DELIVERED → OPENED → CLICKED → CONVERTED)\n2. Each event is POSTed to \`/api/webhooks/receipt\` with HMAC signature\n3. CRM validates signature, upserts \`CommunicationEvent\` (idempotent on communicationId + eventType + eventId)\n4. Updates \`Communication\` status, \`CampaignAnalytics\` counters, and \`CustomerTimeline\`\n5. Failed events trigger optional SMS fallback after 10 minutes`
  },
  {
    patterns: [/communication lifecycle|message lifecycle|event flow/i],
    answer: `**Communication Lifecycle:**\n\n\`QUEUED\` → \`SENT\` → \`DELIVERED\` → \`OPENED/READ\` → \`CLICKED\` → \`CONVERTED\`\n\nEach stage emits a webhook. Failed deliveries go to \`FAILED\` status. Analytics increment at each stage for funnel tracking.`
  },
  {
    patterns: [/campaign.*launch|launch.*campaign|what happens when/i],
    answer: `**Campaign Launch Flow:**\n\n1. Marketer approves draft in Copilot\n2. Segment filter applied to find matching customers\n3. A/B/C variants assigned round-robin\n4. \`Communication\` records created per customer\n5. Jobs enqueued to BullMQ \`campaign:dispatch\` queue (or inline if Redis disabled)\n6. Channel service sends messages and simulates engagement\n7. Webhooks stream results back for real-time analytics`
  },
  {
    patterns: [/bullmq|queue|redis|dispatch/i],
    answer: `**BullMQ Queue Flow:**\n\n• Queue: \`campaign:dispatch\` with 25 concurrent workers\n• Each job calls channel service \`/send\` endpoint\n• Retry: 3 attempts with exponential backoff\n• Set \`DISABLE_REDIS=1\` for inline fallback (local demo)\n• Worker: \`apps/crm-web/workers/dispatch-worker.ts\``
  },
  {
    patterns: [/segment|audience|how.*segment/i],
    answer: `**AI Segmentation:**\n\nNatural language prompts are parsed into structured filters (churn %, spend, city, category, dormancy days). The Audience Builder tool converts filters to Prisma queries against live customer data. Optional Gemini/OpenAI parsing for complex prompts.`
  },
  {
    patterns: [/retry|idempotent|reliable/i],
    answer: `**Reliability Mechanisms:**\n\n• **Idempotent webhooks:** Unique constraint on (communicationId, eventType, eventId)\n• **Queue retries:** 3 attempts with exponential backoff\n• **Channel fallback:** SMS retry after WhatsApp failure\n• **Audit log:** All campaign launches and receipts logged in \`AuditLog\``
  },
  {
    patterns: [/channel service|separate channel|simulation/i],
    answer: `**Channel Service:**\n\nSeparate Express app on port 5001. Simulates WhatsApp, SMS, Email, and RCS with realistic rates. Supports simulation profiles (standard, black-friday, outage, high-churn). Sends signed webhooks back to CRM.`
  },
  {
    patterns: [/forecast|monte carlo|predict/i],
    answer: `**Revenue Forecast Engine:**\n\nRuns 1,000 Monte Carlo simulations using channel-specific rates (delivery, open, click, convert). Returns confidence intervals (10th/50th/90th percentile) for open rate, conversion, and revenue.`
  }
];

export function answerTechnicalQuestion(query: string): string | null {
  for (const entry of KNOWLEDGE) {
    if (entry.patterns.some(p => p.test(query))) return entry.answer;
  }
  if (/how does|explain|what is|architecture|system|technical/i.test(query)) {
    return `**Pulse CRM Architecture:**\n\n• **CRM Web** (Next.js 15) — UI + API routes\n• **AI Engine** — 7 agent tools + orchestrator\n• **Channel Service** — message simulation + webhooks\n• **Database** (Prisma) — customers, campaigns, events\n• **BullMQ** — async campaign dispatch\n\nAsk about webhooks, queues, segmentation, or campaign lifecycle for details.`;
  }
  return null;
}
