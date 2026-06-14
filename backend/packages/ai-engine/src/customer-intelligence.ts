/**
 * Customer Intelligence — NBA, contact time, product recs, campaign history
 */
import { prisma } from "@xenopilot/database";
import { findSimilarToCustomer } from "./lookalike-engine";

const DAY = 86400000;

const PRODUCT_CATALOG: Record<string, string[]> = {
  Skincare: ["Hydrating Serum", "Vitamin C Glow Kit", "Night Repair Cream", "SPF 50 Sunscreen"],
  Beauty: ["Matte Lipstick Set", "Foundation Pro", "Eyeshadow Palette", "Blush Duo"],
  Coffee: ["Single Origin Arabica", "Cold Brew Pack", "Espresso Capsules", "French Press Blend"],
  Wellness: ["Ashwagandha Blend", "Protein Smoothie Mix", "Immunity Booster", "Green Tea Detox"],
  Fashion: ["Linen Summer Dress", "Classic Denim Jacket", "Silk Scarf", "Leather Belt"],
  Electronics: ["Wireless Earbuds", "Smart Watch Band", "Portable Charger", "LED Desk Lamp"],
  Grocery: ["Organic Honey", "Cold-Pressed Olive Oil", "Granola Mix", "Herbal Tea Box"],
  Home: ["Scented Candle Set", "Ceramic Planter", "Linen Throw", "Essential Oil Diffuser"]
};

export type PurchaseOrder = {
  date: string;
  product: string;
  category: string;
  amount: number;
};

export type PurchaseStats = {
  totalOrders: number;
  averageOrderValue: number;
  lastPurchaseDate: string | null;
  daysSinceLastPurchase: number;
  revenueContribution: number;
  orders: PurchaseOrder[];
};

export type CampaignInteraction = {
  campaignId: string;
  campaignName: string;
  channel: string;
  delivered: boolean;
  opened: boolean;
  clicked: boolean;
  converted: boolean;
  date: string;
  isFallback: boolean;
  fallbackChannel?: string;
};

export type NextBestAction = {
  actions: { action: string; description: string }[];
  expectedConversion: number;
  expectedRevenue: number;
};

export type BestContactTime = {
  window: string;
  confidence: number;
  reasoning: string;
};

export type ProductRecommendation = {
  product: string;
  category: string;
  expectedPurchaseProbability: number;
  expectedRevenue?: number;
};

function productName(category: string, index: number): string {
  const list = PRODUCT_CATALOG[category] ?? PRODUCT_CATALOG.Skincare!;
  return list[index % list.length]!;
}

export async function getPurchaseHistory(customerId: string, limit = 50): Promise<PurchaseStats> {
  const [customer, orders] = await Promise.all([
    prisma.customer.findUnique({ where: { id: customerId } }),
    prisma.order.findMany({ where: { customerId }, orderBy: { createdAt: "desc" }, take: limit })
  ]);
  if (!customer) throw new Error("Customer not found");

  const daysSince = customer.lastOrderDate
    ? Math.round((Date.now() - customer.lastOrderDate.getTime()) / DAY)
    : 999;

  return {
    totalOrders: customer.orderCount,
    averageOrderValue: customer.avgOrderValue || (customer.orderCount > 0 ? customer.totalSpend / customer.orderCount : 0),
    lastPurchaseDate: customer.lastOrderDate?.toISOString() ?? null,
    daysSinceLastPurchase: daysSince,
    revenueContribution: customer.totalSpend,
    orders: orders.map((o, i) => ({
      date: o.createdAt.toISOString(),
      product: productName(o.category, i),
      category: o.category,
      amount: o.amount
    }))
  };
}

export async function getCampaignInteractionHistory(customerId: string): Promise<CampaignInteraction[]> {
  const comms = await prisma.communication.findMany({
    where: { customerId },
    include: {
      campaign: { select: { id: true, goal: true } },
      events: { select: { eventType: true } }
    },
    orderBy: { createdAt: "desc" },
    take: 20
  });

  return comms.map(c => {
    const types = new Set(c.events.map(e => e.eventType));
    return {
      campaignId: c.campaignId,
      campaignName: c.campaign?.goal?.slice(0, 60) ?? "Campaign",
      channel: c.channel,
      delivered: types.has("DELIVERED") || c.status === "DELIVERED" || types.has("SENT"),
      opened: types.has("OPENED") || types.has("READ") || c.status === "OPENED",
      clicked: types.has("CLICKED") || c.status === "CLICKED",
      converted: types.has("CONVERTED") || c.status === "CONVERTED",
      date: c.createdAt.toISOString(),
      isFallback: c.isFallback === 1,
      fallbackChannel: c.fallbackChannel ?? undefined
    };
  });
}

export function getCustomerNextBestAction(c: {
  name: string;
  churnScore: number;
  ltvScore: number;
  engagementScore: number;
  purchaseProb: number;
  daysSinceOrder: number;
  preferredCategory: string;
  preferredChannel: string;
  totalSpend: number;
  avgOrderValue: number;
  orderCount: number;
}): NextBestAction {
  const actions: { action: string; description: string }[] = [];

  if (c.churnScore >= 0.6) {
    actions.push({ action: "Send win-back campaign", description: `Re-engage ${c.name} with a personalised ${c.preferredChannel} offer` });
    actions.push({ action: "Offer 10% discount", description: "Price-sensitive recovery offer to restore purchase cadence" });
  } else if (c.ltvScore >= 15000) {
    actions.push({ action: "Send loyalty campaign", description: "VIP early-access to new collection with exclusive perks" });
    actions.push({ action: "Recommend premium bundle", description: `Upsell ${c.preferredCategory} premium line based on spend history` });
  } else if (c.engagementScore >= 60) {
    actions.push({ action: `Recommend ${c.preferredCategory.toLowerCase()} products`, description: "Cross-sell based on category affinity and engagement" });
    actions.push({ action: "Send product discovery campaign", description: "Educational content + curated picks" });
  } else {
    actions.push({ action: "Re-engage customer", description: `Multi-touch ${c.preferredChannel} nurture sequence` });
    actions.push({ action: "Offer 15% welcome-back discount", description: "Incentive to restore engagement" });
  }

  if (c.daysSinceOrder >= 30) {
    actions.push({ action: "Trigger reminder on preferred channel", description: `${c.preferredChannel} reminder after ${c.daysSinceOrder} days inactive` });
  }

  const baseConv = Math.min(0.35, c.purchaseProb * 0.8 + (c.engagementScore / 500));
  const expectedConversion = Math.round(baseConv * 1000) / 10;
  const expectedRevenue = Math.round(c.avgOrderValue * baseConv * 1.2 || c.totalSpend / Math.max(1, c.orderCount) * baseConv);

  return {
    actions: actions.slice(0, 4),
    expectedConversion,
    expectedRevenue: expectedRevenue || Math.round(c.ltvScore * 0.05)
  };
}

export function predictBestContactTime(c: {
  preferredChannel: string;
  engagementScore: number;
  city?: string | null;
  churnScore: number;
}): BestContactTime {
  const channelHours: Record<string, { start: number; end: number; conf: number }> = {
    WHATSAPP: { start: 20, end: 22, conf: 0.92 },
    SMS: { start: 18, end: 20, conf: 0.88 },
    EMAIL: { start: 9, end: 11, conf: 0.85 },
    RCS: { start: 19, end: 21, conf: 0.9 }
  };
  const slot = channelHours[c.preferredChannel] ?? channelHours.WHATSAPP!;
  const fmt = (h: number) => {
    const ampm = h >= 12 ? "PM" : "AM";
    const hr = h > 12 ? h - 12 : h === 0 ? 12 : h;
    return `${hr} ${ampm}`;
  };
  const confidence = Math.round((slot.conf + c.engagementScore / 500 - c.churnScore * 0.1) * 100);
  return {
    window: `${fmt(slot.start)} – ${fmt(slot.end)}`,
    confidence: Math.min(98, Math.max(72, confidence)),
    reasoning: `${c.preferredChannel} engagement peaks in evening hours for ${c.city ?? "Indian metro"} shoppers`
  };
}

export async function getProductRecommendations(customerId: string): Promise<ProductRecommendation[]> {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    include: { orders: { orderBy: { createdAt: "desc" }, take: 10 } }
  });
  if (!customer) return [];

  const categoryCounts: Record<string, number> = {};
  for (const o of customer.orders) {
    categoryCounts[o.category] = (categoryCounts[o.category] ?? 0) + 1;
  }
  const topCategory = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? customer.preferredCategory;

  const similar = await findSimilarToCustomer(customerId, 5);
  const similarCategories = new Set<string>();
  for (const s of similar) {
    const sc = await prisma.customer.findUnique({ where: { id: s.id }, select: { preferredCategory: true } });
    if (sc) similarCategories.add(sc.preferredCategory);
  }

  const recs: ProductRecommendation[] = [];
  const categories = [topCategory, customer.preferredCategory, ...similarCategories];
  for (let i = 0; i < 4; i++) {
    const cat = categories[i % categories.length] ?? customer.preferredCategory;
    const prob = Math.round((customer.purchaseProb * 0.7 + customer.engagementScore / 200 - i * 0.08) * 100);
    recs.push({
      product: productName(cat, i + customer.orderCount),
      category: cat,
      expectedPurchaseProbability: Math.min(92, Math.max(35, prob)),
      expectedRevenue: Math.round((customer.avgOrderValue || 2500) * (prob / 100)),
    });
  }
  return recs;
}

export async function getCustomerIntelligenceBundle(customerId: string) {
  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) throw new Error("Customer not found");

  const daysSince = customer.lastOrderDate
    ? Math.round((Date.now() - customer.lastOrderDate.getTime()) / DAY)
    : 999;

  const [purchaseHistory, campaignHistory, lookalikes, productRecs] = await Promise.all([
    getPurchaseHistory(customerId),
    getCampaignInteractionHistory(customerId),
    findSimilarToCustomer(customerId, 8),
    getProductRecommendations(customerId)
  ]);

  const nba = getCustomerNextBestAction({
    name: customer.name,
    churnScore: customer.churnScore,
    ltvScore: customer.ltvScore,
    engagementScore: customer.engagementScore,
    purchaseProb: customer.purchaseProb,
    daysSinceOrder: daysSince,
    preferredCategory: customer.preferredCategory,
    preferredChannel: customer.preferredChannel,
    totalSpend: customer.totalSpend,
    avgOrderValue: customer.avgOrderValue,
    orderCount: customer.orderCount
  });

  const contactTime = predictBestContactTime({
    preferredChannel: customer.preferredChannel,
    engagementScore: customer.engagementScore,
    city: customer.city,
    churnScore: customer.churnScore
  });

  return { purchaseHistory, campaignHistory, nextBestAction: nba, contactTime, lookalikes, productRecs };
}
