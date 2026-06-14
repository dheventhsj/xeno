/**
 * Self-Healing Campaigns — suggestions when campaigns underperform
 */
import { prisma } from "@xenopilot/database";
import { simulateChannelBattle } from "./channel-battle";

export type HealingSuggestion = {
  action: string;
  description: string;
  projectedImprovement: string;
  confidence: number;
  type: "discount" | "channel" | "tone" | "fallback" | "timing";
};

export async function suggestHealing(campaignId: string): Promise<HealingSuggestion[]> {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: { analytics: true, segment: true }
  });
  if (!campaign?.analytics) return [];

  const a = campaign.analytics;
  const openRate = a.delivered > 0 ? a.opened / a.delivered : 0;
  const convRate = a.delivered > 0 ? a.converted / a.delivered : 0;
  const suggestions: HealingSuggestion[] = [];

  if (openRate < campaign.expectedOpenRate * 0.7) {
    suggestions.push({
      action: "Switch to WhatsApp",
      description: "Open rates are below forecast. WhatsApp typically delivers 2× higher read rates for Indian audiences.",
      projectedImprovement: "+35% open rate",
      confidence: 0.82,
      type: "channel"
    });
    suggestions.push({
      action: "Enable SMS fallback",
      description: "Retry undelivered WhatsApp messages via SMS after 10 minutes.",
      projectedImprovement: "+12% delivery recovery",
      confidence: 0.78,
      type: "fallback"
    });
  }

  if (convRate < campaign.expectedConversionRate * 0.6) {
    suggestions.push({
      action: "Increase discount to 25%",
      description: "Conversion lag suggests offer strength is insufficient for this segment's price sensitivity.",
      projectedImprovement: "+40% conversion lift",
      confidence: 0.75,
      type: "discount"
    });
    suggestions.push({
      action: "Switch to urgent tone",
      description: "Replace emotional copy with urgency-driven messaging (limited time, last chance).",
      projectedImprovement: "+18% click-through",
      confidence: 0.7,
      type: "tone"
    });
  }

  if (a.failed > a.delivered * 0.1) {
    suggestions.push({
      action: "Retry failed sends on RCS",
      description: `${a.failed} messages failed. RCS has 96% delivery rate as fallback.`,
      projectedImprovement: `Recover ~${Math.round(a.failed * 0.7)} deliveries`,
      confidence: 0.85,
      type: "fallback"
    });
  }

  const battle = simulateChannelBattle(
    campaign.totalRecipients,
    2500,
    1.0,
    campaign.recommendedChannel as any
  );
  const currentIdx = battle.results.findIndex(r => r.channel === campaign.recommendedChannel);
  if (currentIdx > 0) {
    const winner = battle.results[0]!;
    suggestions.push({
      action: `Switch to ${winner.channel}`,
      description: battle.rationale,
      projectedImprovement: `+₹${(winner.revenue.mid - (battle.results[currentIdx]?.revenue.mid ?? 0)).toLocaleString("en-IN")} revenue`,
      confidence: battle.winnerConfidence,
      type: "channel"
    });
  }

  return suggestions.sort((a, b) => b.confidence - a.confidence).slice(0, 4);
}

export async function applyHealing(campaignId: string, suggestionIndex = 0) {
  const suggestions = await suggestHealing(campaignId);
  const pick = suggestions[suggestionIndex];
  if (!pick) throw new Error("No healing suggestion available");

  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign) throw new Error("Campaign not found");

  const updates: Record<string, unknown> = {};
  if (pick.type === "channel" && pick.action.includes("WhatsApp")) updates.recommendedChannel = "WHATSAPP";
  if (pick.type === "channel" && pick.action.includes("SMS")) updates.recommendedChannel = "SMS";
  if (pick.type === "discount") {
    updates.messageVariantA = campaign.messageVariantA.replace(/\d+%/g, "25%");
    updates.messageVariantB = campaign.messageVariantB.replace(/\d+%/g, "25%");
  }
  if (pick.type === "tone") {
    const msgs = await import("./index").then(m => m.generateMessages(campaign.goal, campaign.recommendedChannel as any, "urgent"));
    updates.messageVariantA = msgs.variantA;
    updates.messageVariantB = msgs.variantB;
    updates.messageVariantC = msgs.variantC;
  }

  if (Object.keys(updates).length > 0) {
    await prisma.campaign.update({ where: { id: campaignId }, data: updates });
  }

  return { applied: pick, updates };
}
