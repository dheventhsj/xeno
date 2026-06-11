import type { Prisma } from "@xenopilot/database";

export type SegmentFilter = {
  minSpend?: number;
  maxSpend?: number;
  minDaysSinceOrder?: number;
  maxDaysSinceOrder?: number;
  category?: string;
  city?: string;
  maxChurnScore?: number;
  minChurnScore?: number;
  minEngagement?: number;
  minLtv?: number;
  maxLtv?: number;
  channel?: string;
};

/** Convert structured segment filter → Prisma where clause */
export function filterToPrisma(f: SegmentFilter): Prisma.CustomerWhereInput {
  const where: Prisma.CustomerWhereInput = {};
  if (f.minSpend != null) where.totalSpend = { ...(where.totalSpend as object), gte: f.minSpend };
  if (f.maxSpend != null) where.totalSpend = { ...(where.totalSpend as object), lte: f.maxSpend };
  if (f.minDaysSinceOrder != null) {
    const cutoff = new Date(Date.now() - f.minDaysSinceOrder * 86400000);
    where.lastOrderDate = { lt: cutoff };
  }
  if (f.maxDaysSinceOrder != null) {
    const cutoff = new Date(Date.now() - f.maxDaysSinceOrder * 86400000);
    where.lastOrderDate = { ...(where.lastOrderDate as object), gt: cutoff };
  }
  if (f.category) where.preferredCategory = { equals: f.category };
  if (f.city) where.city = { equals: f.city };
  if (f.maxChurnScore != null) where.churnScore = { ...(where.churnScore as object), lte: f.maxChurnScore };
  if (f.minChurnScore != null) where.churnScore = { ...(where.churnScore as object), gte: f.minChurnScore };
  if (f.minEngagement != null) where.engagementScore = { gte: f.minEngagement };
  if (f.minLtv != null) where.ltvScore = { ...(where.ltvScore as object), gte: f.minLtv };
  if (f.maxLtv != null) where.ltvScore = { ...(where.ltvScore as object), lte: f.maxLtv };
  if (f.channel) where.preferredChannel = { equals: f.channel as any };
  return where;
}

export type AudienceAnalysis = {
  name: string;
  filter: SegmentFilter;
  reasoning: string[];
  count: number;
  revenuePotential: number;
  churnRisk: number;
  demographics: {
    cities: { name: string; count: number }[];
    categories: { name: string; count: number }[];
    channels: { name: string; count: number }[];
    avgSpend: number;
    avgEngagement: number;
    avgChurn: number;
  };
};

/** Parse a percentage or decimal from text (60, 60%, 0.6 → 0.6) */
function toUnitScore(raw: string): number {
  const n = parseFloat(raw.replace(/,/g, ""));
  if (Number.isNaN(n)) return 0;
  return n > 1 ? n / 100 : n;
}

/** Parse INR amounts from text */
function parseAmount(p: string): number | undefined {
  const m =
    p.match(/(?:₹|rs\.?\s*|inr\s*)([\d,]+(?:\.\d+)?)/i) ??
    p.match(/(?:spent|spend|purchase[d]?|order(?:ed)?|value|ltv)\s*(?:over|above|more than|>=|>|≥|under|below|less than|<|≤)\s*(?:₹|rs\.?\s*)?([\d,]+(?:\.\d+)?)/i) ??
    p.match(/(?:over|above|more than|>=|>|≥|under|below|less than|<|≤)\s*(?:₹|rs\.?\s*)?([\d,]+(?:\.\d+)?)/i);
  if (!m) return undefined;
  return parseFloat(m[1].replace(/,/g, ""));
}

/** Extract churn min/max thresholds from natural language */
function parseChurnFromPrompt(p: string): { min?: number; max?: number; lines: string[] } {
  const lines: string[] = [];
  let min: number | undefined;
  let max: number | undefined;

  // "churn score over 60%" / "churn over 50%" / "churn > 0.7"
  const overPatterns = [
    /churn(?:\s+score)?\s*(?:over|above|greater than|more than|>=|>|≥|exceeds?)\s*(\d+(?:\.\d+)?)\s*%?/i,
    /(?:over|above|greater than|more than|>=|>|≥)\s*(\d+(?:\.\d+)?)\s*%?\s*churn/i,
    /churn[^.]{0,30}?(\d+(?:\.\d+)?)\s*%\s*(?:or\s+)?(?:higher|more|above|over|plus)/i,
    /(\d+(?:\.\d+)?)\s*%\s*churn/i
  ];
  for (const re of overPatterns) {
    const m = p.match(re);
    if (m) {
      min = toUnitScore(m[1]);
      lines.push(`Churn score ≥ ${Math.round(min * 100)}%`);
      break;
    }
  }

  const underPatterns = [
    /churn(?:\s+score)?\s*(?:under|below|less than|<=|<|≤|lower than)\s*(\d+(?:\.\d+)?)\s*%?/i,
    /(?:under|below|less than|<=|<|≤)\s*(\d+(?:\.\d+)?)\s*%?\s*churn/i
  ];
  for (const re of underPatterns) {
    const m = p.match(re);
    if (m) {
      max = toUnitScore(m[1]);
      lines.push(`Churn score ≤ ${Math.round(max * 100)}%`);
      break;
    }
  }

  // Generic at-risk only when no explicit threshold
  if (min == null && max == null && /(at.?risk|likely to churn|high.?risk churn)/.test(p)) {
    min = 0.55;
    lines.push("Churn score ≥ 55% (at-risk segment)");
  }

  return { min, max, lines };
}

/** Parse engagement threshold e.g. "engagement over 70%" */
function parseEngagementFromPrompt(p: string): { min?: number; lines: string[] } {
  const lines: string[] = [];
  const m =
    p.match(/engagement(?:\s+score)?\s*(?:over|above|greater than|>=|>|≥|more than)\s*(\d+(?:\.\d+)?)\s*%?/i) ??
    p.match(/(?:over|above|>=|>)\s*(\d+(?:\.\d+)?)\s*%?\s*engagement/i);
  if (m) {
    const min = toUnitScore(m[1]) * 100; // engagementScore stored 0-100
    lines.push(`Engagement score ≥ ${Math.round(min)}`);
    return { min, lines };
  }
  if (/(frequent|loyal|engaged|active|repeat)/.test(p)) {
    return { min: 55, lines: ["Engagement score ≥ 55"] };
  }
  return { lines: [] };
}

/** Parse natural language into structured segment filter + reasoning */
export function parseAudiencePrompt(prompt: string): { filter: SegmentFilter; reasoning: string[]; name: string } {
  const p = prompt.toLowerCase();
  const filter: SegmentFilter = {};
  const reasoning: string[] = [];
  const nameParts: string[] = [];

  // ── Churn (dynamic %) ──
  const churn = parseChurnFromPrompt(p);
  if (churn.min != null) {
    filter.minChurnScore = churn.min;
    reasoning.push(...churn.lines);
    nameParts.push(`Churn ≥${Math.round(churn.min * 100)}%`);
  }
  if (churn.max != null) {
    filter.maxChurnScore = churn.max;
    reasoning.push(...churn.lines);
    nameParts.push(`Churn ≤${Math.round(churn.max * 100)}%`);
  }

  // ── Dormant / inactive ──
  if (/(dormant|inactive|lapsed|haven.?t|win.?back|re.?engage|not purchased|no purchase)/.test(p)) {
    const daysMatch = p.match(/(\d+)\s*day/);
    const days = daysMatch ? Number(daysMatch[1]) : 45;
    filter.minDaysSinceOrder = days;
    reasoning.push(`No purchase in ${days}+ days`);
    nameParts.push("Dormant");
  }

  // ── Spend (dynamic ₹) ──
  const spendOver = p.match(/(?:spent|spend|purchase|order|value)\s*(?:over|above|more than|>=|>|≥)\s*(?:₹|rs\.?\s*)?([\d,]+)/i);
  const spendUnder = p.match(/(?:spent|spend|purchase|order|value)\s*(?:under|below|less than|<|≤)\s*(?:₹|rs\.?\s*)?([\d,]+)/i);

  if (spendOver) {
    filter.minSpend = parseFloat(spendOver[1].replace(/,/g, ""));
    reasoning.push(`Lifetime spend ≥ ₹${filter.minSpend.toLocaleString("en-IN")}`);
    nameParts.push("High-value");
  } else if (/(high.?value|premium|vip|big spender|top spend)/.test(p)) {
    filter.minSpend = parseAmount(p) ?? 5000;
    reasoning.push(`Lifetime spend ≥ ₹${filter.minSpend.toLocaleString("en-IN")}`);
    nameParts.push("High-value");
  }

  if (spendUnder) {
    filter.maxSpend = parseFloat(spendUnder[1].replace(/,/g, ""));
    reasoning.push(`Lifetime spend ≤ ₹${filter.maxSpend.toLocaleString("en-IN")}`);
    nameParts.push("Budget");
  } else if (/(low.?value|budget|cheap|small order|low spend)/.test(p)) {
    filter.maxSpend = 2000;
    reasoning.push("Lifetime spend ≤ ₹2,000");
    nameParts.push("Budget");
  }

  // ── Category ──
  const catMatch = p.match(/(skincare|beauty|fashion|coffee|electronics|fitness|cosmetics)/i);
  if (catMatch) {
    const raw = catMatch[1].toLowerCase();
    filter.category = raw === "cosmetics" ? "Beauty" : raw.charAt(0).toUpperCase() + raw.slice(1);
    reasoning.push(`Preferred category: ${filter.category}`);
    nameParts.push(filter.category);
  }

  // ── City ──
  for (const city of ["mumbai", "delhi", "bangalore", "hyderabad", "chennai", "pune", "kolkata", "jaipur", "ahmedabad", "lucknow"]) {
    if (p.includes(city)) {
      filter.city = city.charAt(0).toUpperCase() + city.slice(1);
      reasoning.push(`City: ${filter.city}`);
      nameParts.push(filter.city);
      break;
    }
  }

  // ── Engagement (dynamic %) ──
  const eng = parseEngagementFromPrompt(p);
  if (eng.min != null) {
    filter.minEngagement = eng.min;
    reasoning.push(...eng.lines);
    nameParts.push("Engaged");
  }

  // ── New customers ──
  if (/(new customer|first.?time|just joined)/.test(p)) {
    filter.maxDaysSinceOrder = 30;
    filter.maxSpend = filter.maxSpend ?? 3000;
    reasoning.push("Recent customer — ordered within 30 days");
    nameParts.push("New");
  }

  // ── Channel ──
  const channelMatch = p.match(/(whatsapp|sms|email|rcs)/i);
  if (channelMatch) {
    filter.channel = channelMatch[1].toUpperCase();
    reasoning.push(`Preferred channel: ${filter.channel}`);
  }

  // ── LTV ──
  const ltvMatch = p.match(/ltv\s*(?:over|above|>=|>|≥|more than)\s*(?:₹|rs\.?\s*)?([\d,]+)/i);
  if (ltvMatch) {
    filter.minLtv = parseFloat(ltvMatch[1].replace(/,/g, ""));
    reasoning.push(`LTV ≥ ₹${filter.minLtv.toLocaleString("en-IN")}`);
    nameParts.push("High-LTV");
  } else if (/(high ltv|high lifetime|most valuable)/.test(p)) {
    filter.minLtv = 15000;
    reasoning.push("LTV ≥ ₹15,000");
    nameParts.push("High-LTV");
  }

  if (reasoning.length === 0) {
    reasoning.push("Broad audience — no strong filters detected");
    nameParts.push("All shoppers");
  }

  return { filter, reasoning, name: nameParts.join(" · ") || "Audience" };
}
