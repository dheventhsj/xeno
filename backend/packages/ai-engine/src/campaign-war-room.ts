/**
 * Campaign War Room — AI post-mortem after campaign completion
 */
import { prisma } from "@xenopilot/database";
import { CHANNEL_RATES } from "@xenopilot/shared";
import type { Channel } from "@xenopilot/database";
import { recordCampaignMemory } from "./marketing-memory";

export type WarRoomReport = {
  campaignId: string;
  status: "success" | "underperforming" | "failed";
  headline: string;
  successes: string[];
  failures: string[];
  channelComparison: { channel: string; note: string }[];
  geoInsights: string[];
  segmentPerformance: string[];
  revenueImpact: string;
  nextCampaign: { title: string; prompt: string; expectedImpact: number };
  reasoning: string[];
};

export async function generateWarRoomReport(campaignId: string): Promise<WarRoomReport> {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: { analytics: true, segment: true, communications: { include: { customer: { select: { city: true } } }, take: 200 } }
  });

  if (!campaign) throw new Error("Campaign not found");
  const a = campaign.analytics;
  const reasoning: string[] = [];

  const openRate = a && a.delivered > 0 ? a.opened / a.delivered : 0;
  const convRate = a && a.delivered > 0 ? a.converted / a.delivered : 0;
  const expectedOpen = campaign.expectedOpenRate;
  const expectedConv = campaign.expectedConversionRate;

  let status: WarRoomReport["status"] = "success";
  if (!a || a.delivered === 0) status = "failed";
  else if (convRate < expectedConv * 0.5 || openRate < expectedOpen * 0.6) status = "underperforming";

  const successes: string[] = [];
  const failures: string[] = [];

  if (openRate >= expectedOpen * 0.9) {
    successes.push(`Open rate ${Math.round(openRate * 100)}% met forecast (${Math.round(expectedOpen * 100)}%)`);
  } else if (a && a.delivered > 0) {
    failures.push(`Open rate ${Math.round(openRate * 100)}% underperformed vs ${Math.round(expectedOpen * 100)}% forecast`);
  }

  if (convRate >= expectedConv * 0.8) {
    successes.push(`${a?.converted ?? 0} conversions generated ₹${Math.round(a?.revenue ?? 0).toLocaleString("en-IN")}`);
  } else if (a && a.converted > 0) {
    failures.push(`Conversion rate ${Math.round(convRate * 100)}% below ${Math.round(expectedConv * 100)}% target`);
  } else {
    failures.push("Zero conversions — message or offer may need adjustment");
  }

  // Channel comparison vs alternatives
  const channelComparison: WarRoomReport["channelComparison"] = [];
  const usedChannel = campaign.recommendedChannel as Channel;
  const actualRev = a?.revenue ?? 0;

  for (const ch of ["WHATSAPP", "SMS", "EMAIL", "RCS"] as Channel[]) {
    if (ch === usedChannel) continue;
    const rates = CHANNEL_RATES[ch];
    const hypotheticalRev = Math.round(
      (campaign.totalRecipients * rates.delivered * rates.readOrOpen * rates.click * rates.convert) * 2500
    );
    const ratio = actualRev > 0 ? (hypotheticalRev / actualRev).toFixed(1) : "N/A";
    channelComparison.push({
      channel: ch,
      note: ch === "WHATSAPP" && hypotheticalRev > actualRev * 1.5
        ? `${ch} would likely have performed ${ratio}× better for this segment`
        : `Estimated ${ch} revenue: ₹${hypotheticalRev.toLocaleString("en-IN")} vs actual ₹${actualRev.toLocaleString("en-IN")}`
    });
  }

  // Geo insights
  const cityCounts: Record<string, number> = {};
  for (const comm of campaign.communications) {
    const city = comm.customer.city ?? "Unknown";
    if (comm.status === "CONVERTED") cityCounts[city] = (cityCounts[city] ?? 0) + 1;
  }
  const geoInsights = Object.entries(cityCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([city, count]) => `${city}: ${count} conversions`);

  if (geoInsights.length === 0) geoInsights.push("Insufficient conversion data for geo breakdown");

  const segmentPerformance = [
    campaign.segment
      ? `Segment "${campaign.segment.name}" — ${campaign.totalRecipients.toLocaleString("en-IN")} targeted`
      : "Custom audience targeted",
    `Churn baseline: ${Math.round((campaign.segment?.churnRisk ?? 0.5) * 100)}%`,
    `Revenue potential was ₹${Math.round(campaign.segment?.revenuePotential ?? 0).toLocaleString("en-IN")}`
  ];

  let nextCampaign: WarRoomReport["nextCampaign"];
  if (status === "underperforming" || status === "failed") {
    nextCampaign = {
      title: "Retry with channel switch + stronger offer",
      prompt: `Win-back ${campaign.segment?.name ?? "underperforming segment"} via SMS with 25% discount`,
      expectedImpact: Math.round((campaign.segment?.revenuePotential ?? 50000) * 0.15)
    };
    reasoning.push("Underperformance detected — recommend channel switch and offer intensification");
  } else {
    const bestAlt = channelComparison.find(c => c.note.includes("× better"));
    nextCampaign = {
      title: bestAlt ? `Scale winners on ${usedChannel}` : "Expand to lookalike audience",
      prompt: bestAlt
        ? `Launch premium upsell for customers similar to ${campaign.segment?.name ?? "winners"}`
        : `Find lookalike audience to ${campaign.segment?.name ?? "top converters"}`,
      expectedImpact: Math.round(actualRev * 1.3)
    };
    reasoning.push("Campaign succeeded — recommend scaling to lookalikes or adjacent segments");
  }

  const headline =
    status === "success"
      ? `Campaign delivered ${a?.converted ?? 0} conversions — ${Math.round(convRate * 100)}% conversion rate`
      : status === "underperforming"
        ? `Campaign underperformed — ${Math.round(openRate * 100)}% open vs ${Math.round(expectedOpen * 100)}% expected`
        : "Campaign failed to deliver meaningful engagement";

  await recordCampaignMemory(campaignId).catch(() => {});

  return {
    campaignId,
    status,
    headline,
    successes,
    failures,
    channelComparison,
    geoInsights,
    segmentPerformance,
    revenueImpact: `₹${Math.round(a?.revenue ?? 0).toLocaleString("en-IN")} attributed revenue from ${a?.converted ?? 0} orders`,
    nextCampaign,
    reasoning
  };
}
