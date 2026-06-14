/** Shared greeting / casual-chat detection (no heavy deps). */

export const CRM_TOPIC_SUGGESTIONS = [
  "How many customers do we have?",
  "Who are my top customers by LTV?",
  "Show me campaign performance",
  "How many customers are at risk of churn?",
  "Launch a win-back campaign for dormant shoppers",
  "Find beauty buyers in Mumbai"
];

export function looksLikeGreeting(message: string): boolean {
  const t = message.trim().toLowerCase().replace(/[!?.…]+$/, "").replace(/\s+/g, " ");
  return /^(h+i+|he+y+|hello+|hola|namaste|yo+|hiya+|howdy+|sup|what'?s up)$/i.test(t);
}

export function isCasualMessage(message: string): boolean {
  if (looksLikeGreeting(message)) return true;
  const t = message.trim();
  if (/^(thanks|thank you|thx|bye|goodbye|see you|later|who are you|what are you|how are you|how r u)[!.?\s]*$/i.test(t)) {
    return true;
  }
  if (/^good (morning|afternoon|evening|night)[!.?\s]*$/i.test(t)) return true;
  if (/^(help|what can you do|what do you do|how do i use|status|overview)[?.!\s]*$/i.test(t)) return true;
  if (/^(ok|okay|cool|nice|sure|got it|understood|alright|yes|yeah|yep|no|nope|just checking in|checking in)[!.?\s]*$/i.test(t)) return true;
  return false;
}

export function hasCampaignSignals(text: string): boolean {
  return /campaign|launch|send|create|run|execute|target|reach|engage|re-engage|win-back|upsell|cross-sell|promote|boost|retain|churn|dormant|segment|audience|notification|message blast/i.test(text.toLowerCase());
}

/** Message relates to Pulse CRM / marketing data the assistant can answer. */
export function isRelevantCrmTopic(message: string): boolean {
  const lower = message.toLowerCase();
  if (hasCampaignSignals(message)) return true;
  if (/how many|how much|who are my|top \d|at.?risk|high.?value|dormant|inactive/i.test(lower)) {
    return true;
  }
  if (/(show me|tell me about|tell me how|give me|list|find)\b.*(customer|shopper|campaign|churn|revenue|segment|audience|insight|performance|analytics|ltv|buyer|order|crm|data|stats|metric)/i.test(lower)) {
    return true;
  }
  if (/lookalike|similar customer|opportunity|radar|war room|post.?mortem|webhook|bullmq|dispatch|channel service|architecture|orchestrat/i.test(lower)) {
    return true;
  }
  return /\b(customers?|shoppers?|buyers?|users?|crm|campaigns?|churn|ltv|lifetime|revenue|sales|segments?|audiences?|cohorts?|insights?|analytics|performance|metrics?|kpis?|dormant|inactive|at.?risk|engagement|channels?|whatsapp|sms|email|rcs|conversions?|deliver(?:y|ies)?|marketing|glowmart|pulse|launch|target|vips?|loyal|purchases?|orders?|spend|beauty|fashion|skincare|coffee|electronics|fitness|mumbai|delhi|bangalore|hyderabad|chennai|pune|kolkata|profiles?|lookups?|opportunities|lookalikes?|forecasts?|dispatches?|webhooks?|queues?|open rates?|read rates?|notifications?|tenants?)\b/i.test(lower);
}

/** Clearly unrelated to CRM — weather, sports, recipes, general trivia, etc. */
export function isClearlyOffTopic(message: string): boolean {
  if (isRelevantCrmTopic(message)) return false;
  if (isCasualMessage(message)) return false;
  const lower = message.toLowerCase();
  return /\b(weather|temperature|forecast|rain|cricket|football|soccer|ipl|world cup|match score|recipe|cook|cooking|pizza|burger|joke|jokes|riddle|poem|bedtime story|capital of|who invented|when was.*born|history of|bitcoin|crypto|stock market|sensex|nifty|share price|movie|netflix|song|music|celebrity|girlfriend|boyfriend|dating advice|doctor|medicine|health advice|symptom|vacation|holiday|hotel|flight booking|homework|assignment|leetcode|python code|javascript code|java code|math problem|solve this equation|tell me a story|tell me a joke|make me laugh|who is the president|who is pm|prime minister|election result|politics|news today)\b/i.test(lower)
    || /^tell me (a|some) (joke|story|riddle|poem)/i.test(lower);
}

export function outOfScopeReply(message?: string): string {
  const trimmed = message?.trim() ?? "";
  const quoted = trimmed
    ? `*“${trimmed.length > 90 ? `${trimmed.slice(0, 90)}…` : trimmed}”*`
    : "that";

  return `**This question is out of scope.**\n\nI'm **Pulse Assistant** — I can only help with **Pulse CRM marketing data**, not general questions outside this app.\n\n${quoted} isn't something I can answer here.\n\n**Ask me about:**\n• **Customers** — counts, profiles, LTV, churn, segments\n• **Campaigns** — performance, revenue, open rates, launch drafts\n• **Audiences** — dormant, at-risk, or high-value shoppers\n• **Insights** — analytics, recommendations, opportunities\n\n**Try one of these:**\n${CRM_TOPIC_SUGGESTIONS.map(s => `• “${s}”`).join("\n")}\n\nSay **help** to see everything I can do.`;
}

/** Non-CRM question — redirect unless it's casual chat or a CRM/marketing topic we can handle. */
export function shouldRedirectToCrmTopics(message: string): boolean {
  if (isCasualMessage(message)) return false;
  if (isRelevantCrmTopic(message)) return false;
  return true;
}
