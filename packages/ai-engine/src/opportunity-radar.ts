/**
 * Opportunity Radar — ranked marketing opportunities by business impact
 */
import { prisma } from "@xenopilot/database";

export type Opportunity = {
  id: string;
  type: "HIGH_CHURN" | "DORMANT" | "VIP" | "UPSELL" | "CROSS_SELL";
  icon: string;
  title: string;
  count: number;
  revenueOpportunity: number;
  riskScore: number;
  confidence: number;
  reasoning: string[];
  prompt: string;
  priority: "critical" | "high" | "medium";
};

export async function scanOpportunities(): Promise<Opportunity[]> {
  const [
    highChurn, dormant, vip, engagedMid, crossSellPool
  ] = await Promise.all([
    prisma.customer.count({ where: { churnScore: { gte: 0.6 } } }),
    prisma.customer.count({ where: { daysSinceOrder: { gte: 45 } } }),
    prisma.customer.count({ where: { ltvScore: { gte: 20000 } } }),
    prisma.customer.count({
      where: { engagementScore: { gte: 55 }, ltvScore: { lt: 20000 }, totalSpend: { gte: 3000 } }
    }),
    prisma.customer.count({
      where: { preferredCategory: "Coffee", engagementScore: { gte: 50 } }
    })
  ]);

  const opportunities: Opportunity[] = [
    {
      id: "high-churn",
      type: "HIGH_CHURN",
      icon: "🔥",
      title: "High Churn Customers",
      count: highChurn,
      revenueOpportunity: Math.round(highChurn * 2800 * 0.1),
      riskScore: 0.85,
      confidence: 0.92,
      reasoning: ["Churn score ≥ 60%", "Immediate retention needed", "High LTV at risk"],
      prompt: "Prevent churn for at-risk customers with a loyalty discount on WhatsApp",
      priority: highChurn > 500 ? "critical" : "high"
    },
    {
      id: "dormant",
      type: "DORMANT",
      icon: "💤",
      title: "Dormant Customers",
      count: dormant,
      revenueOpportunity: Math.round(dormant * 2200 * 0.08),
      riskScore: 0.7,
      confidence: 0.88,
      reasoning: ["No purchase in 45+ days", "Win-back window closing", "Emotional messaging recommended"],
      prompt: "Re-engage dormant customers with an emotional win-back offer",
      priority: dormant > 800 ? "critical" : "high"
    },
    {
      id: "vip",
      type: "VIP",
      icon: "👑",
      title: "VIP Customers",
      count: vip,
      revenueOpportunity: Math.round(vip * 5500 * 0.15),
      riskScore: 0.2,
      confidence: 0.9,
      reasoning: ["LTV ≥ ₹20,000", "Premium segment", "Exclusive access drives loyalty"],
      prompt: "Reward loyal high-value customers with an exclusive premium offer",
      priority: "medium"
    },
    {
      id: "upsell",
      type: "UPSELL",
      icon: "📈",
      title: "Upsell Opportunities",
      count: engagedMid,
      revenueOpportunity: Math.round(engagedMid * 3500 * 0.12),
      riskScore: 0.35,
      confidence: 0.82,
      reasoning: ["Engaged but not VIP tier", "High purchase probability", "AOV expansion potential"],
      prompt: "Upsell engaged mid-tier shoppers with premium product bundles",
      priority: "medium"
    },
    {
      id: "cross-sell",
      type: "CROSS_SELL",
      icon: "🔀",
      title: "Cross-Sell Opportunities",
      count: crossSellPool,
      revenueOpportunity: Math.round(crossSellPool * 1800 * 0.09),
      riskScore: 0.25,
      confidence: 0.78,
      reasoning: ["Category affinity detected", "Complementary product fit", "Low churn segment"],
      prompt: "Cross-sell fitness products to engaged coffee buyers",
      priority: "medium"
    }
  ];

  return opportunities
    .filter(o => o.count > 0)
    .sort((a, b) => b.revenueOpportunity - a.revenueOpportunity);
}
