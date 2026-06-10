import { CustomerModel } from "../models/Customer";

/**
 * AI layer for the CRM.
 *
 * The product is "AI-native": the marketer expresses intent in natural language
 * and this layer turns it into (1) an explainable audience filter, (2) a
 * channel recommendation, (3) personalised copy, and (4) an outcome forecast.
 *
 * Design choice: this runs as a deterministic, explainable heuristic engine by
 * default so the demo works offline and every decision can be defended in
 * review. If an LLM key is present we could swap `generateMessage` to call it,
 * but the structured output contract stays identical.
 */

export type SegmentResult = {
  filter: any;
  reasoning: string[];
  label: string;
  estimatedSize: number;
};

type Channel = "whatsapp" | "sms" | "email" | "rcs";
type Variant = "emotional" | "premium" | "discount" | "urgency";

const DAY = 24 * 60 * 60 * 1000;

/** Convert a natural-language intent into a MongoDB filter + human reasoning. */
export async function segmentPromptToMongoFilter(prompt: string): Promise<SegmentResult> {
  const p = prompt.toLowerCase();
  const filter: any = {};
  const reasoning: string[] = [];
  const labelParts: string[] = [];

  // Inactivity / win-back
  if (/(inactive|lapsed|dormant|win.?back|haven.?t|re.?engage|churn)/.test(p)) {
    const days = p.match(/(\d+)\s*day/) ? Number(RegExp.$1) : 45;
    filter.lastPurchaseDate = { $lt: new Date(Date.now() - days * DAY) };
    reasoning.push(`No purchase in the last ${days} days`);
    labelParts.push("Lapsed");
  }

  // Spend tiers
  if (/(high.?spend|premium|vip|big spender|luxury|high.?value)/.test(p)) {
    filter.totalSpend = { ...(filter.totalSpend ?? {}), $gte: 7000 };
    reasoning.push("Lifetime spend ≥ ₹7,000 (high-value)");
    labelParts.push("High-value");
  }
  if (/(low.?spend|budget|bargain|deal)/.test(p)) {
    filter.totalSpend = { ...(filter.totalSpend ?? {}), $lte: 2500 };
    reasoning.push("Lifetime spend ≤ ₹2,500 (price-sensitive)");
    labelParts.push("Budget");
  }

  // Engagement
  if (/(low engagement|disengaged|at.?risk|likely to churn)/.test(p)) {
    filter.engagementScore = { ...(filter.engagementScore ?? {}), $lte: 35 };
    reasoning.push("Engagement score ≤ 35 (at-risk)");
    labelParts.push("At-risk");
  }
  if (/\b(engaged|loyal|active|champion|vip)\b/.test(p)) {
    filter.engagementScore = { ...(filter.engagementScore ?? {}), $gte: 65 };
    reasoning.push("Engagement score ≥ 65 (loyal)");
    labelParts.push("Loyal");
  }

  // Demographics
  if (/(gen.?z)/.test(p)) {
    filter.age = { ...(filter.age ?? {}), $gte: 18, $lte: 27 };
    reasoning.push("Age 18–27 (Gen Z)");
    labelParts.push("Gen Z");
  } else if (/(millennial)/.test(p)) {
    filter.age = { ...(filter.age ?? {}), $gte: 28, $lte: 43 };
    reasoning.push("Age 28–43 (Millennials)");
    labelParts.push("Millennials");
  }

  const cityMatch = p.match(/\bin ([a-z ]+?)(?:\.|,|$| who| with| that)/);
  if (cityMatch) {
    const city = cityMatch[1].trim();
    const knownCities = ["mumbai", "delhi", "bangalore", "bengaluru", "hyderabad", "chennai", "pune", "kolkata", "ahmedabad", "jaipur"];
    if (knownCities.includes(city)) {
      filter.city = new RegExp(`^${city}$`, "i");
      reasoning.push(`Located in ${city.replace(/^./, (c) => c.toUpperCase())}`);
      labelParts.push(city.replace(/^./, (c) => c.toUpperCase()));
    }
  }

  if (/\b(female|women)\b/.test(p)) {
    filter.gender = "female";
  } else if (/\b(male|men)\b/.test(p)) {
    filter.gender = "male";
  }

  if (Object.keys(filter).length === 0) {
    filter.engagementScore = { $gte: 0 };
    reasoning.push("Broad audience — no strong conditions detected in the prompt");
    labelParts.push("All shoppers");
  }

  const estimatedSize = await CustomerModel.countDocuments(filter);
  const label = labelParts.join(" · ") || "Audience";
  return { filter, reasoning, label, estimatedSize };
}

/** Recommend the best channel for an audience, with a rationale. */
export async function recommendChannel(
  filter: any
): Promise<{ channel: Channel; rationale: string; mix: Record<Channel, number> }> {
  const rows = await CustomerModel.aggregate([
    { $match: filter },
    { $group: { _id: "$preferredChannel", count: { $sum: 1 } } }
  ]);
  const mix: Record<Channel, number> = { whatsapp: 0, sms: 0, email: 0, rcs: 0 };
  let total = 0;
  for (const r of rows) {
    if (r._id && r._id in mix) {
      mix[r._id as Channel] = r.count;
      total += r.count;
    }
  }
  let channel: Channel = "whatsapp";
  let best = -1;
  (Object.keys(mix) as Channel[]).forEach((c) => {
    if (mix[c] > best) {
      best = mix[c];
      channel = c;
    }
  });
  const pct = total > 0 ? Math.round((best / total) * 100) : 0;
  const rationale =
    total > 0
      ? `${pct}% of this audience prefers ${channel.toUpperCase()} — highest reach + engagement for this segment.`
      : `Defaulting to WhatsApp: strong open rates and rich media support for this kind of campaign.`;
  return { channel, rationale, mix };
}

/** Pick a messaging angle ("variant") from the intent. */
export function inferVariant(prompt: string): Variant {
  const p = prompt.toLowerCase();
  // Explicit tone cues win over audience descriptors (e.g. "premium customers").
  if (/(emotional|win.?back|heartfelt|miss|re.?engage|reconnect)/.test(p)) return "emotional";
  if (/(discount|offer|sale|coupon|deal|% ?off|bogo)/.test(p)) return "discount";
  if (/(urgent|today|last chance|expir|hurry|limited|ends)/.test(p)) return "urgency";
  if (/(luxury|exclusive|loyalty|elite|reward)/.test(p)) return "premium";
  return "emotional";
}

/** Generate channel-aware, personalised copy for a campaign. */
export function generateMessage(
  prompt: string,
  channel: Channel,
  variant: Variant,
  brand = "Brewhaus Coffee"
): { subject?: string; body: string; variant: Variant } {
  const token = "{{name}}";
  const templates: Record<Variant, { subject: string; body: string }> = {
    emotional: {
      subject: `We saved your favourite spot, ${token} ☕`,
      body: `Hey ${token}, it's been a while! Your ${brand} regulars miss you. Swing by this week and the first refill is on us. ❤️`
    },
    premium: {
      subject: `An exclusive perk for you, ${token}`,
      body: `Hi ${token}, as one of our most valued members, you've unlocked early access to our new single-origin reserve + a complimentary tasting. See you soon at ${brand}.`
    },
    discount: {
      subject: `${token}, here's 25% off your next order`,
      body: `Hi ${token}! Treat yourself — enjoy 25% OFF anything at ${brand} this week. Use code BREW25 at checkout. ☕✨`
    },
    urgency: {
      subject: `Last call, ${token} — offer ends tonight`,
      body: `${token}, your 25% reward expires at midnight! Grab your ${brand} favourites before it's gone. Tap to order now.`
    }
  };

  const t = templates[variant];
  // SMS has no subject and should be short; WhatsApp/RCS keep emoji; email keeps subject.
  if (channel === "sms") {
    return { body: t.body.replace(/[☕❤️✨]/g, "").trim(), variant };
  }
  if (channel === "email") {
    return { subject: t.subject, body: t.body, variant };
  }
  return { body: t.body, variant };
}

/**
 * Forecast campaign outcomes from the audience's engagement profile.
 * Returns probabilities (0–1) and an expected ROI multiple with a confidence.
 */
export async function predictOutcomes(
  filter: any,
  channel: Channel,
  variant: Variant
): Promise<{
  openRate: number;
  clickRate: number;
  conversionProbability: number;
  expectedRoi: number;
  confidence: number;
}> {
  const agg = await CustomerModel.aggregate([
    { $match: filter },
    { $group: { _id: null, avgEng: { $avg: "$engagementScore" }, avgSpend: { $avg: "$totalSpend" }, n: { $sum: 1 } } }
  ]);
  const avgEng = agg[0]?.avgEng ?? 40;
  const avgSpend = agg[0]?.avgSpend ?? 3000;
  const n = agg[0]?.n ?? 0;

  const channelLift: Record<Channel, number> = { whatsapp: 1.15, rcs: 1.1, email: 0.85, sms: 0.95 };
  const variantLift: Record<Variant, number> = { discount: 1.2, urgency: 1.1, emotional: 1.0, premium: 0.9 };

  const base = Math.min(0.85, Math.max(0.15, avgEng / 100));
  const openRate = clamp(base * channelLift[channel], 0.1, 0.95);
  const clickRate = clamp(openRate * 0.35 * variantLift[variant], 0.02, 0.6);
  const conversionProbability = clamp(clickRate * 0.22 * variantLift[variant], 0.005, 0.25);
  const expectedRoi = round2((conversionProbability * avgSpend) / 5); // assume ~₹5 cost / message
  const confidence = clamp(0.5 + Math.min(0.4, n / 2000), 0.5, 0.92);

  return {
    openRate: round2(openRate),
    clickRate: round2(clickRate),
    conversionProbability: round2(conversionProbability),
    expectedRoi,
    confidence: round2(confidence)
  };
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}
function round2(v: number) {
  return Math.round(v * 100) / 100;
}
