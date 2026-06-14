# XenoPilot API Contracts

## CRM Web (`frontend/`)

### POST /api/agent/chat

Natural-language command center.

**Request**
```json
{
  "message": "Increase repeat purchases from skincare customers who haven't purchased in 45 days",
  "sessionId": "optional-uuid"
}
```

**Response**
```json
{
  "reply": "I found 1,842 dormant skincare shoppers...",
  "actions": [{ "type": "CREATE_CAMPAIGN_DRAFT", "payload": { } }],
  "draft": {
    "goal": "...",
    "segment": { "definition": {}, "count": 1842, "reasoning": [] },
    "channel": { "recommended": "whatsapp", "confidence": 0.87, "rationale": "..." },
    "messages": { "variantA": {}, "variantB": {}, "variantC": {} },
    "forecast": { "openRate": 0.72, "clickRate": 0.21, "conversionRate": 0.09, "revenue": 420000 }
  }
}
```

### GET /api/customers?query=&page=&limit=

**Response**
```json
{
  "items": [{ "id": "...", "name": "...", "churnScore": 0.42, "ltvScore": 8500 }],
  "total": 10000,
  "page": 1
}
```

### GET /api/customers/:id

**Response**
```json
{
  "customer": {},
  "orders": [],
  "communications": [],
  "insights": {
    "predictedNextPurchase": "2026-07-01",
    "summary": "High LTV, declining engagement"
  }
}
```

### POST /api/audiences/generate

**Request**
```json
{ "prompt": "Customers who spent more than ₹5000 and haven't purchased in 30 days" }
```

**Response**
```json
{
  "name": "High-value dormant",
  "definition": { "totalSpend": { "gte": 5000 }, "lastOrderDate": { "lt": "..." } },
  "customerCount": 892,
  "revenuePotential": 4500000,
  "churnRisk": 0.68,
  "aiReasoning": ["Spend ≥ ₹5000", "No order in 30 days"]
}
```

### POST /api/campaigns

**Request**
```json
{
  "goal": "...",
  "segmentId": "uuid",
  "channel": "whatsapp",
  "messages": { "variantA": "...", "variantB": "...", "variantC": "..." },
  "forecast": {}
}
```

### POST /api/campaigns/:id/launch

Enqueues BullMQ jobs. Returns immediately.

**Response**
```json
{ "ok": true, "campaignId": "...", "queued": 1842 }
```

### POST /api/webhooks/receipt

Called by channel-service. Idempotent on `(communicationId, eventType, eventId)`.

**Request**
```json
{
  "communicationId": "uuid",
  "campaignId": "uuid",
  "customerId": "uuid",
  "eventType": "DELIVERED",
  "eventId": "evt_abc123",
  "timestamp": "2026-06-10T12:00:00Z",
  "meta": {}
}
```

**Headers**
- `x-signature`: HMAC-SHA256 of body with `WEBHOOK_SECRET`

### GET /api/analytics/overview

**Response**
```json
{
  "kpis": { "campaigns": 12, "revenue": 890000, "openRate": 58.2 },
  "funnel": [{ "stage": "SENT", "count": 50000 }],
  "insights": ["Customers from Bangalore converted 2.3x higher."],
  "nextActions": [{ "type": "LOYALTY", "title": "Run loyalty campaign for top 10%" }]
}
```

---

## Channel Service (`backend/channel-service`)

### POST /send

**Request**
```json
{
  "communicationId": "uuid",
  "campaignId": "uuid",
  "customerId": "uuid",
  "recipient": { "email": "...", "phone": "..." },
  "channel": "whatsapp",
  "message": { "body": "Hi {{name}}...", "subject": "optional" }
}
```

**Response**
```json
{ "ok": true, "messageId": "alpha-sim_123" }
```

Events are emitted asynchronously to `CRM_WEBHOOK_URL`.

### Channel simulation rates

| Channel | Delivered | Read/Open | Click | Convert |
|---------|-----------|-----------|-------|---------|
| WhatsApp | 98% | 85% read | 25% | 12% |
| SMS | 95% | 60% read | 12% | 4% |
| Email | 90% | 45% open | 15% | 5% |
| RCS | 96% | 78% read | 22% | 8% |
