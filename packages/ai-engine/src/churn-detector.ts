/**
 * Churn Detector — multi-factor churn scoring and velocity detection
 */
import { prisma } from "@xenopilot/database";

export type ChurnAnalysis = {
  totalAtRisk: number;
  totalChurning: number;
  totalHealthy: number;
  churnVelocity: string;
  segments: {
    category: string;
    atRiskCount: number;
    avgChurnScore: number;
  }[];
  topAtRisk: {
    id: string;
    name: string;
    churnScore: number;
    ltvScore: number;
    daysSince: number;
  }[];
  recommendation: string;
};

export async function analyzeChurn(): Promise<ChurnAnalysis> {
  const [atRisk, churning, healthy, byCategory, topAtRisk] = await Promise.all([
    prisma.customer.count({ where: { churnScore: { gte: 0.5, lt: 0.75 } } }),
    prisma.customer.count({ where: { churnScore: { gte: 0.75 } } }),
    prisma.customer.count({ where: { churnScore: { lt: 0.5 } } }),
    prisma.customer.groupBy({
      by: ["preferredCategory"],
      where: { churnScore: { gte: 0.5 } },
      _count: { id: true },
      _avg: { churnScore: true },
      orderBy: { _count: { id: "desc" } }
    }),
    prisma.customer.findMany({
      where: { churnScore: { gte: 0.6 } },
      orderBy: [{ ltvScore: "desc" }],
      take: 10,
      select: { id: true, name: true, churnScore: true, ltvScore: true, daysSinceOrder: true }
    })
  ]);

  const total = atRisk + churning + healthy;
  const churnPct = total > 0 ? Math.round(((atRisk + churning) / total) * 100) : 0;

  let velocity = "stable";
  if (churnPct > 40) velocity = "critical";
  else if (churnPct > 25) velocity = "accelerating";
  else if (churnPct > 15) velocity = "moderate";

  const segments = byCategory.map(c => ({
    category: c.preferredCategory,
    atRiskCount: c._count.id,
    avgChurnScore: Math.round((c._avg.churnScore ?? 0) * 100) / 100
  }));

  let recommendation = "Your customer base is healthy.";
  if (velocity === "critical") {
    recommendation = `Critical: ${churnPct}% of customers are at risk. Launch immediate win-back campaigns for high-LTV churning customers.`;
  } else if (velocity === "accelerating") {
    recommendation = `${churnPct}% of customers show churn signals. Prioritize retention campaigns for ${segments[0]?.category ?? "top"} segment.`;
  } else if (velocity === "moderate") {
    recommendation = `${churnPct}% churn risk detected. Consider proactive engagement for at-risk customers.`;
  }

  return {
    totalAtRisk: atRisk,
    totalChurning: churning,
    totalHealthy: healthy,
    churnVelocity: velocity,
    segments,
    topAtRisk: topAtRisk.map(c => ({
      id: c.id,
      name: c.name,
      churnScore: c.churnScore,
      ltvScore: c.ltvScore,
      daysSince: c.daysSinceOrder
    })),
    recommendation
  };
}
