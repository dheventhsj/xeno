/**
 * Intent Classifier — NLP-based intent understanding without external API
 * Classifies user input into structured intents with confidence scoring
 */
import { isCasualMessage, hasCampaignSignals } from "./chat-patterns";

export type Intent =
  | "CREATE_CAMPAIGN"
  | "ANALYZE_AUDIENCE"
  | "CUSTOMER_LOOKUP"
  | "GET_INSIGHTS"
  | "SCHEDULE_CAMPAIGN"
  | "COMPARE_CAMPAIGNS"
  | "EXPLAIN_REASONING"
  | "GENERAL_QUERY";

export type Entity = {
  type: "NUMBER" | "DATE" | "CATEGORY" | "CITY" | "CHANNEL" | "DURATION" | "CURRENCY" | "SEGMENT_TYPE";
  value: string;
  raw: string;
};

export type ClassifiedIntent = {
  intent: Intent;
  confidence: number;
  entities: Entity[];
  tone: "urgent" | "emotional" | "premium" | "discount" | "educational" | "neutral";
  subIntents: string[];
};

const INTENT_PATTERNS: Record<Intent, { keywords: string[]; phrases: RegExp[]; weight: number }> = {
  CREATE_CAMPAIGN: {
    keywords: ["campaign", "launch", "send", "create", "run", "execute", "target", "reach", "engage", "re-engage", "win-back", "upsell", "cross-sell", "promote", "push", "increase", "boost", "drive"],
    phrases: [
      /(?:create|launch|run|send|start|build|set up).*(?:campaign|message|notification)/i,
      /(?:increase|boost|drive|improve).*(?:purchase|revenue|conversion|engagement|retention)/i,
      /(?:re-?engage|win.?back|retain|prevent churn)/i,
      /(?:target|reach|engage).*(?:customer|shopper|buyer|audience|user)/i,
    ],
    weight: 1.0
  },
  ANALYZE_AUDIENCE: {
    keywords: ["audience", "segment", "who", "find", "show me", "identify", "list", "filter", "group", "cohort"],
    phrases: [
      /(?:find|show|identify|list|who are).*(?:customer|shopper|buyer|audience)/i,
      /(?:build|create|generate).*(?:audience|segment|cohort)/i,
      /(?:how many|count).*(?:customer|shopper|buyer)/i,
      /(?:dormant|at.?risk|high.?value|loyal|new|churning)/i,
    ],
    weight: 0.9
  },
  CUSTOMER_LOOKUP: {
    keywords: ["customer", "profile", "detail", "lookup", "info", "about"],
    phrases: [
      /(?:show|get|tell me about|look up).*(?:customer|profile)/i,
      /(?:top|best|highest|most valuable).*(?:customer|buyer)/i,
      /(?:customer).*(?:detail|profile|history|timeline)/i,
    ],
    weight: 0.8
  },
  GET_INSIGHTS: {
    keywords: ["insight", "analytics", "performance", "how did", "results", "report", "summary", "overview", "metrics", "kpi"],
    phrases: [
      /(?:show|get|generate).*(?:insight|analytics|report|summary)/i,
      /(?:how did|how is|how are).*(?:campaign|performance|doing)/i,
      /(?:what|which).*(?:working|performing|best|worst)/i,
    ],
    weight: 0.85
  },
  SCHEDULE_CAMPAIGN: {
    keywords: ["schedule", "later", "tomorrow", "next week", "timer", "delay", "queue"],
    phrases: [
      /(?:schedule|plan|queue).*(?:campaign|send|launch)/i,
      /(?:send|launch).*(?:later|tomorrow|next|at \d)/i,
    ],
    weight: 0.9
  },
  COMPARE_CAMPAIGNS: {
    keywords: ["compare", "versus", "vs", "difference", "better", "which"],
    phrases: [
      /(?:compare|versus|vs|difference between)/i,
      /(?:which|what).*(?:better|worse|more effective)/i,
    ],
    weight: 0.8
  },
  EXPLAIN_REASONING: {
    keywords: ["why", "explain", "reason", "how come", "justify", "rationale"],
    phrases: [
      /(?:why|explain|how come).*(?:did you|would you|should)/i,
      /(?:what is the|tell me the).*(?:reason|rationale|logic)/i,
    ],
    weight: 0.7
  },
  GENERAL_QUERY: {
    keywords: ["help", "what can", "hello", "hi", "hey"],
    phrases: [
      /^(?:hi|hello|hey|help|what can you)/i,
    ],
    weight: 0.3
  }
};

const CATEGORIES = ["skincare", "beauty", "fashion", "coffee", "electronics", "fitness"];
const CITIES = ["mumbai", "delhi", "bangalore", "hyderabad", "chennai", "pune", "kolkata", "jaipur", "ahmedabad", "lucknow"];
const CHANNELS = ["whatsapp", "sms", "email", "rcs"];
const SEGMENT_TYPES = ["dormant", "at-risk", "high-value", "vip", "loyal", "new", "churning", "engaged", "premium", "inactive"];

function extractEntities(text: string): Entity[] {
  const entities: Entity[] = [];
  const lower = text.toLowerCase();

  // Numbers & currency
  const currencyMatch = lower.match(/(?:₹|rs\.?\s*|inr\s*)([\d,]+)/gi);
  if (currencyMatch) {
    for (const m of currencyMatch) {
      const val = m.replace(/[₹rs.inr\s,]/gi, "");
      entities.push({ type: "CURRENCY", value: val, raw: m });
    }
  }
  const numMatch = lower.match(/(\d+)\s*(?:day|week|month)/gi);
  if (numMatch) {
    for (const m of numMatch) {
      entities.push({ type: "DURATION", value: m, raw: m });
    }
  }

  // Categories
  for (const cat of CATEGORIES) {
    if (lower.includes(cat)) {
      entities.push({ type: "CATEGORY", value: cat.charAt(0).toUpperCase() + cat.slice(1), raw: cat });
    }
  }

  // Cities
  for (const city of CITIES) {
    if (lower.includes(city)) {
      entities.push({ type: "CITY", value: city.charAt(0).toUpperCase() + city.slice(1), raw: city });
    }
  }

  // Channels
  for (const ch of CHANNELS) {
    if (lower.includes(ch)) {
      entities.push({ type: "CHANNEL", value: ch.toUpperCase(), raw: ch });
    }
  }

  // Segment types
  for (const seg of SEGMENT_TYPES) {
    if (lower.includes(seg)) {
      entities.push({ type: "SEGMENT_TYPE", value: seg, raw: seg });
    }
  }

  return entities;
}

function detectTone(text: string): ClassifiedIntent["tone"] {
  const lower = text.toLowerCase();
  if (/urgent|asap|immediately|hurry|last chance|ending|expires|limited time/i.test(lower)) return "urgent";
  if (/discount|offer|sale|%\s*off|coupon|deal|save|free/i.test(lower)) return "discount";
  if (/premium|vip|exclusive|luxury|elite|special access/i.test(lower)) return "premium";
  if (/miss|love|special|thank|appreciate|welcome back|we care/i.test(lower)) return "emotional";
  if (/learn|discover|tips|guide|how to|benefit/i.test(lower)) return "educational";
  return "neutral";
}

export function classifyIntent(text: string): ClassifiedIntent {
  const lower = text.toLowerCase();
  const entities = extractEntities(text);
  const tone = detectTone(text);

  // Greetings & casual chat — always route to conversational handler
  if (isCasualMessage(text)) {
    return {
      intent: "GENERAL_QUERY",
      confidence: 0.98,
      entities,
      tone,
      subIntents: ["chat"]
    };
  }

  // Live CRM data questions → chat (not campaign orchestration)
  if (/^(how many|how much|what is|what's|what are|tell me|do we have|give me|show me the)/i.test(text.trim()) &&
      !/(launch|create|run|send|campaign|engage|target|re-engage|win.?back)/i.test(lower)) {
    return {
      intent: "GENERAL_QUERY",
      confidence: 0.9,
      entities,
      tone,
      subIntents: ["data_query"]
    };
  }

  const scores: Record<Intent, number> = {} as Record<Intent, number>;
  const subIntents: string[] = [];

  for (const [intent, config] of Object.entries(INTENT_PATTERNS) as [Intent, typeof INTENT_PATTERNS[Intent]][]) {
    let score = 0;

    // Keyword matching
    for (const kw of config.keywords) {
      if (lower.includes(kw)) {
        score += 0.15;
      }
    }

    // Phrase matching (higher weight)
    for (const phrase of config.phrases) {
      if (phrase.test(lower)) {
        score += 0.35;
      }
    }

    // Entity boost
    if (intent === "CREATE_CAMPAIGN" && entities.some(e => e.type === "CATEGORY" || e.type === "SEGMENT_TYPE")) {
      score += 0.2;
    }
    if (intent === "ANALYZE_AUDIENCE" && entities.some(e => e.type === "SEGMENT_TYPE")) {
      score += 0.15;
    }

    scores[intent] = Math.min(0.98, score * config.weight);
  }

  // Detect sub-intents
  if (/repeat|retention|re-?purchase/i.test(lower)) subIntents.push("retention");
  if (/churn|at.?risk|leaving|losing/i.test(lower)) subIntents.push("churn_prevention");
  if (/win.?back|re-?engage|dormant|inactive/i.test(lower)) subIntents.push("win_back");
  if (/upsell|upgrade|premium/i.test(lower)) subIntents.push("upsell");
  if (/cross.?sell/i.test(lower)) subIntents.push("cross_sell");
  if (/loyalty|reward|vip/i.test(lower)) subIntents.push("loyalty");

  // Pick best intent — default to conversational, not campaign planning
  let bestIntent: Intent = "GENERAL_QUERY";
  let bestScore = 0;
  for (const [intent, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      bestIntent = intent as Intent;
    }
  }

  // Low-confidence or ambiguous → chat, not campaign orchestration
  if (bestScore < 0.35 || (!hasCampaignSignals(text) && bestIntent === "CREATE_CAMPAIGN" && bestScore < 0.55)) {
    bestIntent = "GENERAL_QUERY";
    bestScore = Math.max(bestScore, 0.65);
  }

  // Only plan campaigns when the user clearly asks for one
  if (bestIntent === "CREATE_CAMPAIGN" && !hasCampaignSignals(text) && bestScore < 0.5) {
    bestIntent = "GENERAL_QUERY";
    bestScore = 0.7;
  }

  return {
    intent: bestIntent,
    confidence: Math.round(bestScore * 100) / 100,
    entities,
    tone,
    subIntents
  };
}
