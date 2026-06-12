/**
 * Customer Twin — DNA tags + natural-language profile
 */
import type { Channel } from "@xenopilot/database";

export type CustomerDna = {
  tags: string[];
  primaryArchetype: string;
  channelAffinity: Channel;
  categoryAffinity: string;
};

export type CustomerTwin = {
  dna: CustomerDna;
  aiSummary: string;
  journeyStages: { stage: string; label: string; date?: string; active?: boolean }[];
};

type CustomerFeatures = {
  name: string;
  totalSpend: number;
  orderCount: number;
  churnScore: number;
  ltvScore: number;
  engagementScore: number;
  purchaseProb: number;
  daysSinceOrder: number;
  preferredCategory: string;
  preferredChannel: string;
  city?: string | null;
  orders?: { amount: number; category: string; date: Date }[];
  communications?: { channel: string; status: string; date: Date }[];
};

export function buildCustomerDna(c: CustomerFeatures): CustomerDna {
  const tags: string[] = [];

  if (c.ltvScore >= 20000 || c.totalSpend >= 15000) tags.push("Luxury Buyer");
  else if (c.totalSpend >= 8000) tags.push("High-Value Shopper");
  else if (c.totalSpend <= 2000) tags.push("Budget Conscious");

  if (c.orderCount >= 8 && c.churnScore < 0.35) tags.push("Loyal Customer");
  if (c.engagementScore >= 65) tags.push("Highly Engaged");
  if (c.churnScore >= 0.6) tags.push("At-Risk");
  if (c.daysSinceOrder >= 45) tags.push("Dormant");

  const avgGap = c.orderCount > 1 ? Math.round(c.daysSinceOrder / Math.max(1, c.orderCount)) : c.daysSinceOrder;
  if (avgGap <= 30 && c.orderCount >= 3) tags.push("Impulse Buyer");
  if (c.purchaseProb >= 0.55 && c.engagementScore < 50) tags.push("Discount Sensitive");

  if (c.orderCount <= 1 && c.daysSinceOrder < 60) tags.push("New Customer");

  if (tags.length === 0) tags.push("Standard Shopper");

  const primaryArchetype =
    tags.includes("Luxury Buyer") ? "Luxury Buyer" :
    tags.includes("Loyal Customer") ? "Loyal Customer" :
    tags.includes("Discount Sensitive") ? "Discount Sensitive" :
    tags.includes("Impulse Buyer") ? "Impulse Buyer" :
    tags[0];

  return {
    tags: [...new Set(tags)],
    primaryArchetype,
    channelAffinity: c.preferredChannel as Channel,
    categoryAffinity: c.preferredCategory
  };
}

export function buildCustomerSummary(c: CustomerFeatures, dna: CustomerDna): string {
  const firstName = c.name.split(" ")[0] ?? c.name;
  const category = c.preferredCategory.toLowerCase();
  const isPremium = dna.tags.includes("Luxury Buyer") || c.ltvScore >= 15000;
  const prefix = isPremium ? "premium" : category;

  let cadence = "";
  if (c.orderCount >= 2 && c.daysSinceOrder < 90) {
    const days = Math.max(14, Math.round(c.daysSinceOrder / Math.max(1, c.orderCount - 1)));
    cadence = ` who purchases every ${days} days`;
  } else if (c.daysSinceOrder >= 45) {
    cadence = ` who has been inactive for ${c.daysSinceOrder} days`;
  }

  const channel = ` and responds best to ${c.preferredChannel} campaigns`;
  let suffix = "";
  if (dna.tags.includes("At-Risk")) suffix = " — retention outreach recommended.";
  else if (dna.tags.includes("New Customer")) suffix = " — onboarding nurture recommended.";
  else suffix = ".";

  return `${firstName} is a ${prefix} ${category} customer${cadence}${channel}${suffix}`;
}

export function buildJourneyReplay(c: CustomerFeatures): CustomerTwin["journeyStages"] {
  const canonical = [
    { stage: "visited", label: "Website Visit" },
    { stage: "purchased", label: "Purchase" },
    { stage: "campaign_sent", label: "Campaign Sent" },
    { stage: "opened", label: "Opened" },
    { stage: "clicked", label: "Clicked" },
    { stage: "purchased_again", label: "Purchased Again" }
  ];

  const events: { stage: string; label: string; date?: string }[] = [];
  events.push({ stage: "visited", label: "Website Visit", date: c.orders?.length ? c.orders[c.orders.length - 1]!.date.toISOString() : undefined });

  if (c.orders?.length) {
    events.push({ stage: "purchased", label: "Purchase", date: c.orders[c.orders.length - 1]!.date.toISOString() });
  }

  const comms = c.communications ?? [];
  for (const comm of comms) {
    if (["SENT", "DELIVERED"].includes(comm.status)) {
      events.push({ stage: "campaign_sent", label: "Campaign Sent", date: comm.date.toISOString() });
    }
    if (["OPENED", "READ"].includes(comm.status)) {
      events.push({ stage: "opened", label: "Opened", date: comm.date.toISOString() });
    }
    if (comm.status === "CLICKED") {
      events.push({ stage: "clicked", label: "Clicked", date: comm.date.toISOString() });
    }
    if (comm.status === "CONVERTED") {
      events.push({ stage: "purchased_again", label: "Purchased Again", date: comm.date.toISOString() });
    }
  }

  if (c.orders && c.orders.length > 1) {
    events.push({ stage: "purchased_again", label: "Purchased Again", date: c.orders[0]!.date.toISOString() });
  }

  return canonical.map(step => {
    const match = events.filter(e => e.stage === step.stage).pop();
    return {
      ...step,
      date: match?.date,
      active: !!match
    };
  });
}

export function buildCustomerTwin(c: CustomerFeatures): CustomerTwin {
  const dna = buildCustomerDna(c);
  return {
    dna,
    aiSummary: buildCustomerSummary(c, dna),
    journeyStages: buildJourneyReplay(c)
  };
}
