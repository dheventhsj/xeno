/**
 * Revenue Estimator — per-segment revenue opportunity scoring with confidence intervals
 */
import { prisma } from "@xenopilot/database";
import { CHANNEL_RATES } from "@xenopilot/shared";
import type { Channel } from "@xenopilot/database";

export type RevenueEstimate = {
  conservative: number;
  expected: number;
  optimistic: number;
  confidence: number;
  breakdown: {
    audienceSize: number;
    avgOrderValue: number;
    predictedConversion: number;
    channelEfficiency: number;
  };
};

export async function estimateRevenue(
  audienceSize: number,
  channel: Channel,
  avgSpend?: number,
  avgPurchaseProb?: number
): Promise<RevenueEstimate> {
  // Get historical averages if not provided
  if (!avgSpend || !avgPurchaseProb) {
    const agg = await prisma.customer.aggregate({
      _avg: { avgOrderValue: true, purchaseProb: true }
    });
    avgSpend = avgSpend ?? (agg._avg.avgOrderValue ?? 2500);
    avgPurchaseProb = avgPurchaseProb ?? (agg._avg.purchaseProb ?? 0.3);
  }

  const rates = CHANNEL_RATES[channel];
  const deliveryRate = rates.delivered;
  const openRate = rates.readOrOpen;
  const clickRate = rates.click;
  const convertRate = rates.convert;

  const funnelConversion = deliveryRate * openRate * clickRate * convertRate;
  const channelEfficiency = funnelConversion * avgPurchaseProb;

  const expectedConversions = Math.round(audienceSize * channelEfficiency);
  const expected = Math.round(expectedConversions * avgSpend);

  // Confidence intervals: ±30% for conservative/optimistic
  const conservative = Math.round(expected * 0.6);
  const optimistic = Math.round(expected * 1.5);

  // Confidence based on audience size and data quality
  let confidence = 0.5;
  if (audienceSize > 1000) confidence += 0.15;
  if (audienceSize > 5000) confidence += 0.1;
  if (avgPurchaseProb > 0.3) confidence += 0.1;
  confidence = Math.min(0.95, confidence);

  return {
    conservative,
    expected,
    optimistic,
    confidence: Math.round(confidence * 100) / 100,
    breakdown: {
      audienceSize,
      avgOrderValue: Math.round(avgSpend),
      predictedConversion: Math.round(channelEfficiency * 10000) / 100,
      channelEfficiency: Math.round(funnelConversion * 10000) / 100
    }
  };
}
