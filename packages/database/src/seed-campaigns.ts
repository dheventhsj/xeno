/**
 * Seed completed demo campaigns with realistic analytics for Intelligence dashboard
 */
import { prisma } from "./index";

type DemoCampaign = {
  goal: string;
  channel: string;
  segmentName: string;
  segmentCount: number;
  sent: number;
  delivered: number;
  failed: number;
  opened: number;
  clicked: number;
  converted: number;
  revenue: number;
  status: "COMPLETED" | "RUNNING";
};

const DEMO_CAMPAIGNS: DemoCampaign[] = [
  {
    goal: "Win-back dormant beauty shoppers with emotional offer",
    channel: "WHATSAPP",
    segmentName: "Dormant · Beauty",
    segmentCount: 842,
    sent: 842, delivered: 825, failed: 17, opened: 701, clicked: 175, converted: 84,
    revenue: 218400,
    status: "COMPLETED"
  },
  {
    goal: "Flash sale for at-risk skincare customers",
    channel: "SMS",
    segmentName: "At-risk · Skincare",
    segmentCount: 530,
    sent: 530, delivered: 504, failed: 26, opened: 302, clicked: 48, converted: 21,
    revenue: 52500,
    status: "COMPLETED"
  },
  {
    goal: "VIP early access — premium loyalty campaign",
    channel: "EMAIL",
    segmentName: "High-value · VIP",
    segmentCount: 380,
    sent: 380, delivered: 342, failed: 38, opened: 154, clicked: 62, converted: 28,
    revenue: 112000,
    status: "COMPLETED"
  },
  {
    goal: "Re-engage Mumbai coffee buyers via RCS",
    channel: "RCS",
    segmentName: "Mumbai · Coffee",
    segmentCount: 215,
    sent: 215, delivered: 206, failed: 9, opened: 161, clicked: 35, converted: 12,
    revenue: 32400,
    status: "RUNNING"
  }
];

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export async function seedDemoCampaigns(force = false) {
  const existing = await prisma.campaignAnalytics.aggregate({ _sum: { sent: true } });
  if (!force && (existing._sum.sent ?? 0) > 0) {
    return { skipped: true, reason: "Analytics already populated" };
  }

  if (force) {
    await prisma.communicationEvent.deleteMany({ where: { communication: { campaign: { aiReasoning: { contains: "Demo campaign" } } } } });
    await prisma.communication.deleteMany({ where: { campaign: { aiReasoning: { contains: "Demo campaign" } } } });
    await prisma.campaignAnalytics.deleteMany({ where: { campaign: { aiReasoning: { contains: "Demo campaign" } } } });
    await prisma.campaign.deleteMany({ where: { aiReasoning: { contains: "Demo campaign" } } });
  }

  const sampleCustomers = await prisma.customer.findMany({ take: 200, select: { id: true, name: true } });
  if (sampleCustomers.length === 0) {
    return { skipped: true, reason: "No customers in database" };
  }

  let ci = 0;
  for (const demo of DEMO_CAMPAIGNS) {
    const segment = await prisma.segment.create({
      data: {
        name: demo.segmentName,
        description: demo.goal,
        aiReasoning: JSON.stringify([`Segment: ${demo.segmentName}`, "AI-generated for demo"]),
        segmentDefinition: JSON.stringify({ minDaysSinceOrder: 45 }),
        customerCount: demo.segmentCount,
        revenuePotential: demo.revenue * 1.2,
        churnRisk: 0.55
      }
    });

    const openRate = demo.delivered > 0 ? demo.opened / demo.delivered : 0;
    const clickRate = demo.opened > 0 ? demo.clicked / demo.opened : 0;
    const convRate = demo.delivered > 0 ? demo.converted / demo.delivered : 0;

    const campaign = await prisma.campaign.create({
      data: {
        goal: demo.goal,
        segmentId: segment.id,
        recommendedChannel: demo.channel,
        messageVariantA: "Hi {{name}}, we miss you at GlowMart! Come back for a special treat.",
        messageVariantB: "{{name}}, your favourites are waiting — tap to shop now.",
        messageVariantC: "Exclusive for {{name}}: complimentary gift on your next order.",
        expectedOpenRate: openRate,
        expectedClickRate: clickRate,
        expectedConversionRate: convRate,
        expectedRevenue: demo.revenue,
        status: demo.status,
        launchedAt: new Date(Date.now() - 7 * 86400000),
        completedAt: demo.status === "COMPLETED" ? new Date(Date.now() - 2 * 86400000) : undefined,
        totalRecipients: demo.segmentCount,
        aiReasoning: "Demo campaign with simulated performance data"
      }
    });

    await prisma.campaignAnalytics.create({
      data: {
        campaignId: campaign.id,
        sent: demo.sent,
        delivered: demo.delivered,
        failed: demo.failed,
        opened: demo.opened,
        read: Math.round(demo.opened * 0.3),
        clicked: demo.clicked,
        converted: demo.converted,
        revenue: demo.revenue,
        lastEventAt: new Date()
      }
    });

    const eventCount = Math.min(40, demo.delivered);
    for (let i = 0; i < eventCount; i++) {
      const customer = sampleCustomers[ci % sampleCustomers.length]!;
      ci++;
      const comm = await prisma.communication.create({
        data: {
          campaignId: campaign.id,
          customerId: customer.id,
          channel: demo.channel,
          message: `Hi ${customer.name}, demo message`,
          variant: ["A", "B", "C"][i % 3]!,
          status: i < demo.converted / 10 ? "CONVERTED" : "DELIVERED"
        }
      });

      const ts = new Date(Date.now() - rand(1, 72) * 3600000);
      for (const et of ["SENT", "DELIVERED"] as const) {
        await prisma.communicationEvent.create({
          data: {
            communicationId: comm.id,
            eventType: et,
            eventId: `${et}_${comm.id}_${i}`,
            timestamp: ts
          }
        });
      }
      if (i < demo.opened / 20) {
        await prisma.communicationEvent.create({
          data: { communicationId: comm.id, eventType: "OPENED", eventId: `OPEN_${comm.id}`, timestamp: ts }
        });
      }
      if (i < demo.converted / 5) {
        await prisma.communicationEvent.create({
          data: {
            communicationId: comm.id,
            eventType: "CONVERTED",
            eventId: `CONV_${comm.id}`,
            timestamp: ts,
            meta: JSON.stringify({ orderAmount: rand(1500, 4500) })
          }
        });
      }
    }
  }

  return { campaigns: DEMO_CAMPAIGNS.length };
}
