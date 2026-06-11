import { prisma } from "@xenopilot/database";
import { generateInsights, nextBestActions } from "@xenopilot/ai-engine";

export async function getOverview() {
  const [customerCount, campaignCount, agg, running, completed, segments] = await Promise.all([
    prisma.customer.count(),
    prisma.campaign.count(),
    prisma.campaignAnalytics.aggregate({
      _sum: {
        sent: true, delivered: true, failed: true,
        opened: true, read: true, clicked: true, converted: true, revenue: true
      }
    }),
    prisma.campaign.count({ where: { status: "RUNNING" } }),
    prisma.campaign.count({ where: { status: "COMPLETED" } }),
    prisma.segment.count()
  ]);

  const s = agg._sum;
  const sent = s.sent ?? 0;
  const delivered = s.delivered ?? 0;
  const opened = s.opened ?? 0;
  const clicked = s.clicked ?? 0;
  const converted = s.converted ?? 0;
  const rate = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 1000) / 10 : 0);

  const [insights, nextActions] = await Promise.all([generateInsights(), nextBestActions()]);

  // Channel performance breakdown
  const campaigns = await prisma.campaign.findMany({
    where: { status: { in: ["COMPLETED", "RUNNING"] } },
    include: { analytics: true },
    take: 50,
    orderBy: { createdAt: "desc" }
  });

  const channelPerf: Record<string, { sent: number; delivered: number; opened: number; clicked: number; converted: number; revenue: number }> = {};
  for (const c of campaigns) {
    const ch = c.recommendedChannel;
    if (!channelPerf[ch]) channelPerf[ch] = { sent: 0, delivered: 0, opened: 0, clicked: 0, converted: 0, revenue: 0 };
    if (c.analytics) {
      channelPerf[ch].sent += c.analytics.sent;
      channelPerf[ch].delivered += c.analytics.delivered;
      channelPerf[ch].opened += c.analytics.opened;
      channelPerf[ch].clicked += c.analytics.clicked;
      channelPerf[ch].converted += c.analytics.converted;
      channelPerf[ch].revenue += c.analytics.revenue;
    }
  }

  // Customer health distribution
  const [healthy, atRisk, churning] = await Promise.all([
    prisma.customer.count({ where: { churnScore: { lt: 0.4 } } }),
    prisma.customer.count({ where: { churnScore: { gte: 0.4, lt: 0.7 } } }),
    prisma.customer.count({ where: { churnScore: { gte: 0.7 } } })
  ]);

  return {
    kpis: {
      customers: customerCount,
      campaigns: campaignCount,
      running,
      completed,
      segments,
      revenue: s.revenue ?? 0,
      deliveryRate: rate(delivered, sent),
      openRate: rate(opened, delivered),
      clickRate: rate(clicked, opened),
      conversionRate: rate(converted, delivered)
    },
    funnel: [
      { stage: "SENT", count: sent },
      { stage: "DELIVERED", count: delivered },
      { stage: "OPENED", count: opened },
      { stage: "CLICKED", count: clicked },
      { stage: "CONVERTED", count: converted }
    ],
    totals: { sent, delivered, failed: s.failed ?? 0, opened, clicked, converted, revenue: s.revenue ?? 0 },
    channelPerformance: Object.entries(channelPerf).map(([channel, data]) => ({
      channel,
      ...data,
      openRate: rate(data.opened, data.delivered),
      clickRate: rate(data.clicked, data.opened),
      conversionRate: rate(data.converted, data.delivered)
    })),
    customerHealth: { healthy, atRisk, churning, total: customerCount },
    insights,
    nextActions
  };
}

export async function getCampaignAnalytics(campaignId: string) {
  const [campaign, analytics, events] = await Promise.all([
    prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { segment: true }
    }),
    prisma.campaignAnalytics.findUnique({ where: { campaignId } }),
    prisma.communicationEvent.findMany({
      where: { communication: { campaignId } },
      orderBy: { timestamp: "desc" },
      take: 100,
      include: { communication: { select: { customer: { select: { name: true } } } } }
    })
  ]);

  return { campaign, analytics, recentEvents: events };
}

export async function incrementAnalytics(
  campaignId: string,
  eventType: string,
  revenueDelta = 0
) {
  const fieldMap: Record<string, string> = {
    SENT: "sent", DELIVERED: "delivered", FAILED: "failed",
    OPENED: "opened", READ: "read", CLICKED: "clicked", CONVERTED: "converted"
  };
  const field = fieldMap[eventType];
  if (!field) return;
  await prisma.campaignAnalytics.upsert({
    where: { campaignId },
    create: {
      campaignId,
      [field]: 1,
      revenue: revenueDelta,
      lastEventAt: new Date()
    },
    update: {
      [field]: { increment: 1 },
      revenue: revenueDelta > 0 ? { increment: revenueDelta } : undefined,
      lastEventAt: new Date()
    }
  });
}
