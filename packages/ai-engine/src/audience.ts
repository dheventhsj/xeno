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

/** Parse natural language into structured segment filter + reasoning */
export function parseAudiencePrompt(prompt: string): { filter: SegmentFilter; reasoning: string[]; name: string } {
  const p = prompt.toLowerCase();
  const filter: SegmentFilter = {};
  const reasoning: string[] = [];
  const nameParts: string[] = [];

  // Churn detection
  if (/(churn|at.?risk|likely to churn|losing|leaving)/.test(p)) {
    filter.minChurnScore = 0.6;
    reasoning.push("Churn score ≥ 0.6 (high risk)");
    nameParts.push("At-risk");
  }

  // Dormant / inactive / win-back
  if (/(dormant|inactive|lapsed|haven.?t|win.?back|re.?engage|not purchased|no purchase)/.test(p)) {
    const daysMatch = p.match(/(\d+)\s*day/);
    const days = daysMatch ? Number(daysMatch[1]) : 45;
    filter.minDaysSinceOrder = days;
    reasoning.push(`No purchase in ${days}+ days`);
    nameParts.push("Dormant");
  }

  // High-value / premium / VIP
  if (/(high.?value|premium|vip|big spender|top|spent more than|₹\s*(\d+)|rs\.?\s*(\d+))/i.test(p)) {
    const m = p.match(/(?:₹|rs\.?\s*)([\d,]+)/i) ?? p.match(/more than ([\d,]+)/);
    filter.minSpend = m ? Number(m[1].replace(/,/g, "")) : 5000;
    reasoning.push(`Lifetime spend ≥ ₹${(filter.minSpend).toLocaleString("en-IN")}`);
    nameParts.push("High-value");
  }

  // Low-value / budget
  if (/(low.?value|budget|cheap|small order|low spend)/.test(p)) {
    filter.maxSpend = 2000;
    reasoning.push("Lifetime spend ≤ ₹2,000");
    nameParts.push("Budget");
  }

  // Category detection
  const catMatch = p.match(/(skincare|beauty|fashion|coffee|electronics|fitness)/i);
  if (catMatch) {
    filter.category = catMatch[1].charAt(0).toUpperCase() + catMatch[1].slice(1).toLowerCase();
    reasoning.push(`Preferred category: ${filter.category}`);
    nameParts.push(filter.category);
  }

  // City detection
  for (const city of ["mumbai", "delhi", "bangalore", "hyderabad", "chennai", "pune", "kolkata", "jaipur", "ahmedabad", "lucknow"]) {
    if (p.includes(city)) {
      filter.city = city.charAt(0).toUpperCase() + city.slice(1);
      reasoning.push(`City: ${filter.city}`);
      nameParts.push(filter.city);
      break;
    }
  }

  // Engaged / loyal
  if (/(frequent|loyal|engaged|active|repeat)/.test(p)) {
    filter.minEngagement = 55;
    reasoning.push("Engagement score ≥ 55");
    nameParts.push("Engaged");
  }

  // New customers
  if (/(new customer|recent|first.?time|just joined)/.test(p)) {
    filter.maxDaysSinceOrder = 30;
    filter.maxSpend = filter.maxSpend ?? 3000;
    reasoning.push("Recent customer — ordered within 30 days, spend ≤ ₹3,000");
    nameParts.push("New");
  }

  // Channel preference
  const channelMatch = p.match(/(whatsapp|sms|email|rcs)/i);
  if (channelMatch) {
    filter.channel = channelMatch[1].toUpperCase();
    reasoning.push(`Preferred channel: ${filter.channel}`);
  }

  // High LTV
  if (/(high ltv|high lifetime|valuable|most valuable)/.test(p)) {
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
