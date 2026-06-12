/**
 * Rebuild CampaignAnalytics from CommunicationEvent records (source of truth)
 */
import { prisma } from "@xenopilot/database";

const EVENT_FIELDS = ["SENT", "DELIVERED", "FAILED", "OPENED", "READ", "CLICKED", "CONVERTED"] as const;

export async function syncAllCampaignAnalytics() {
  const campaigns = await prisma.campaign.findMany({ select: { id: true } });
  for (const c of campaigns) {
    await syncCampaignAnalytics(c.id);
  }
}

export async function syncCampaignAnalytics(campaignId: string) {
  const events = await prisma.communicationEvent.findMany({
    where: { communication: { campaignId } },
    select: { eventType: true, meta: true }
  });

  if (events.length === 0) return;

  const counts: Record<string, number> = {
    sent: 0, delivered: 0, failed: 0, opened: 0, read: 0, clicked: 0, converted: 0
  };
  let revenue = 0;

  for (const ev of events) {
    const t = ev.eventType.toLowerCase();
    if (t in counts) counts[t]++;
    if (ev.eventType === "CONVERTED" && ev.meta) {
      try {
        const meta = JSON.parse(ev.meta);
        revenue += Number(meta.orderAmount ?? 0);
      } catch { /* ignore */ }
    }
  }

  // READ counts toward opened for funnel display
  const opened = counts.opened + counts.read;

  await prisma.campaignAnalytics.upsert({
    where: { campaignId },
    create: {
      campaignId,
      sent: counts.sent,
      delivered: counts.delivered,
      failed: counts.failed,
      opened,
      read: counts.read,
      clicked: counts.clicked,
      converted: counts.converted,
      revenue,
      lastEventAt: new Date()
    },
    update: {
      sent: counts.sent,
      delivered: counts.delivered,
      failed: counts.failed,
      opened,
      read: counts.read,
      clicked: counts.clicked,
      converted: counts.converted,
      revenue,
      lastEventAt: new Date()
    }
  });
}

/** Returns true if any campaign had zero analytics but events existed */
export async function syncAnalyticsIfNeeded() {
  const [agg, eventCount] = await Promise.all([
    prisma.campaignAnalytics.aggregate({ _sum: { sent: true } }),
    prisma.communicationEvent.count()
  ]);

  if (eventCount > 0 && (agg._sum.sent ?? 0) === 0) {
    await syncAllCampaignAnalytics();
    return true;
  }
  return false;
}
