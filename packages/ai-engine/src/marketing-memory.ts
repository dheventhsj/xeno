/**
 * Marketing Memory — learn from campaign history to improve recommendations
 */
import { prisma } from "@xenopilot/database";

function marketingMemoryClient() {
  const client = (prisma as { marketingMemory?: typeof prisma.customer }).marketingMemory;
  return client?.findMany ? client : null;
}

export type MemoryInsight = {
  id: string;
  insight: string;
  channel?: string;
  segment?: string;
  metric?: string;
  value?: number;
  confidence: number;
};

export async function recordCampaignMemory(campaignId: string) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: { analytics: true, segment: true }
  });
  if (!campaign?.analytics) return;

  const a = campaign.analytics;
  const openRate = a.delivered > 0 ? a.opened / a.delivered : 0;
  const convRate = a.delivered > 0 ? a.converted / a.delivered : 0;
  const channel = campaign.recommendedChannel;
  const segmentName = campaign.segment?.name ?? "general";

  const insights: Omit<MemoryInsight, "id">[] = [];

  if (a.converted > 0) {
    insights.push({
      insight: `${channel} generated ${a.converted} conversions for "${segmentName}" segment with ₹${Math.round(a.revenue).toLocaleString("en-IN")} revenue`,
      channel,
      segment: segmentName,
      metric: "revenue",
      value: a.revenue,
      confidence: 0.9
    });
  }

  if (openRate > 0) {
    insights.push({
      insight: `Historically ${channel} achieves ${Math.round(openRate * 100)}% open rate for ${segmentName} audiences`,
      channel,
      segment: segmentName,
      metric: "open_rate",
      value: openRate,
      confidence: 0.85
    });
  }

  if (convRate > 0.05) {
    insights.push({
      insight: `${segmentName} segment converts at ${Math.round(convRate * 100)}% on ${channel} — above baseline`,
      channel,
      segment: segmentName,
      metric: "conversion_rate",
      value: convRate,
      confidence: 0.8
    });
  }

  for (const ins of insights) {
    const mem = marketingMemoryClient();
    if (!mem) continue;
    await mem.create({
      data: {
        insight: ins.insight,
        channel: ins.channel,
        segment: ins.segment,
        metric: ins.metric,
        value: ins.value,
        confidence: ins.confidence,
        campaignId
      }
    }).catch(() => {});
  }
}

export async function retrieveMarketingMemory(query: string, limit = 5): Promise<MemoryInsight[]> {
  const mem = marketingMemoryClient();
  if (!mem) return [];

  const lower = query.toLowerCase();
  const all = await mem.findMany({
    orderBy: { createdAt: "desc" },
    take: 50
  });

  const scored = all.map(m => {
    let score = 0;
    const text = `${m.insight} ${m.channel ?? ""} ${m.segment ?? ""}`.toLowerCase();
    if (m.channel && lower.includes(m.channel.toLowerCase())) score += 2;
    if (m.segment && lower.includes(m.segment.toLowerCase())) score += 2;
    for (const word of lower.split(/\s+/)) {
      if (word.length > 3 && text.includes(word)) score += 0.5;
    }
    return { m, score };
  });

  scored.sort((a, b) => b.score - a.score || b.m.confidence - a.m.confidence);

  return scored.slice(0, limit).map(({ m }) => ({
    id: m.id,
    insight: m.insight,
    channel: m.channel ?? undefined,
    segment: m.segment ?? undefined,
    metric: m.metric ?? undefined,
    value: m.value ?? undefined,
    confidence: m.confidence
  }));
}

export async function getChannelPerformanceMemories(): Promise<string[]> {
  const byChannel = await prisma.campaign.groupBy({
    by: ["recommendedChannel"],
    _count: { id: true },
    where: { status: "COMPLETED" }
  });

  const memories = await (marketingMemoryClient()?.findMany({
    where: { metric: "open_rate" },
    orderBy: { createdAt: "desc" },
    take: 10
  }) ?? Promise.resolve([]));

  const lines: string[] = [];
  for (const ch of byChannel) {
    const chMemories = memories.filter(m => m.channel === ch.recommendedChannel);
    if (chMemories.length > 0) {
      lines.push(chMemories[0]!.insight);
    }
  }
  return lines.length > 0 ? lines : memories.map(m => m.insight);
}
