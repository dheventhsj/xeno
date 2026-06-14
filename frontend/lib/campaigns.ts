import { prisma, CommunicationStatus, EventType, CampaignStatus, type Channel } from "@xenopilot/database";
import { filterToPrisma } from "@xenopilot/ai-engine";
import type { CampaignDraft } from "@xenopilot/shared";
import axios from "axios";
import { after } from "next/server";
import { getDispatchQueue, type DispatchJob } from "./queue";
import { useInternalChannelSimulator } from "./channel-simulator";

const CHANNEL_URL = process.env.CHANNEL_SERVICE_URL ?? "";

export async function createCampaignFromDraft(draft: CampaignDraft) {
  const segment = await prisma.segment.create({
    data: {
      name: draft.segment.name,
      description: draft.goal,
      aiReasoning: JSON.stringify(draft.segment.reasoning),
      segmentDefinition: JSON.stringify(draft.segment.definition),
      customerCount: draft.segment.count,
      revenuePotential: draft.segment.revenuePotential,
      churnRisk: draft.segment.churnRisk
    }
  });

  return prisma.campaign.create({
    data: {
      goal: draft.goal,
      segmentId: segment.id,
      recommendedChannel: draft.channel.recommended,
      messageVariantA: draft.messages.variantA,
      messageVariantB: draft.messages.variantB,
      messageVariantC: draft.messages.variantC,
      expectedOpenRate: draft.forecast.openRate,
      expectedClickRate: draft.forecast.clickRate,
      expectedConversionRate: draft.forecast.conversionRate,
      expectedRevenue: draft.forecast.revenue,
      status: CampaignStatus.DRAFT,
      totalRecipients: draft.segment.count
    },
    include: { segment: true }
  });
}

function inferChannelFromDemographics(demographics?: { channels?: { name: string }[] }): Channel {
  const top = demographics?.channels?.[0]?.name?.toUpperCase();
  if (top === "WHATSAPP" || top === "SMS" || top === "EMAIL" || top === "RCS") return top;
  return "WHATSAPP";
}

function scheduleQueuedDelivery(campaignId: string) {
  after(async () => {
    await new Promise((r) => setTimeout(r, 5000));
    try {
      await launchCampaign(campaignId, { finalStatus: CampaignStatus.DELIVERED });
    } catch (e) {
      console.error("queued campaign dispatch failed", e);
      await prisma.campaign.update({
        where: { id: campaignId },
        data: { status: CampaignStatus.FAILED }
      });
    }
  });
}

export async function createCampaignFromSegment(opts: {
  segmentId: string;
  goal: string;
  customerCount: number;
  revenuePotential: number;
  channel?: Channel;
  demographics?: { channels?: { name: string }[] };
}) {
  const channel = opts.channel ?? inferChannelFromDemographics(opts.demographics);
  const message = `Hi {{name}}, ${opts.goal} — exclusive offer from GlowMart. Tap to shop now!`;

  const campaign = await prisma.campaign.create({
    data: {
      goal: opts.goal,
      segmentId: opts.segmentId,
      recommendedChannel: channel,
      messageVariantA: message,
      messageVariantB: message,
      messageVariantC: message,
      expectedOpenRate: 0.45,
      expectedClickRate: 0.12,
      expectedConversionRate: 0.08,
      expectedRevenue: opts.revenuePotential,
      status: CampaignStatus.QUEUED,
      totalRecipients: opts.customerCount,
      aiReasoning: JSON.stringify({ fromAudience: true })
    },
    include: { segment: true }
  });

  await prisma.campaignAnalytics.create({ data: { campaignId: campaign.id } });
  scheduleQueuedDelivery(campaign.id);
  return campaign;
}

export async function createQuickCampaign(goal: string, channel: Channel = "WHATSAPP") {
  const recipientCount = 25;
  const customers = await prisma.customer.findMany({
    take: recipientCount,
    orderBy: { ltvScore: "desc" },
    select: { id: true }
  });

  const segment = await prisma.segment.create({
    data: {
      name: goal.length > 42 ? `${goal.slice(0, 42)}…` : goal,
      description: goal,
      aiReasoning: JSON.stringify(["Quick-create campaign"]),
      segmentDefinition: JSON.stringify({ quick: true }),
      customerCount: customers.length,
      revenuePotential: customers.length * 2500 * 0.12,
      churnRisk: 0.35
    }
  });

  const message = `Hi {{name}}, ${goal} — exclusive offer from GlowMart. Tap to shop now!`;
  const campaign = await prisma.campaign.create({
    data: {
      goal,
      segmentId: segment.id,
      recommendedChannel: channel,
      messageVariantA: message,
      messageVariantB: message,
      messageVariantC: message,
      expectedOpenRate: 0.45,
      expectedClickRate: 0.12,
      expectedConversionRate: 0.08,
      expectedRevenue: customers.length * 280,
      status: CampaignStatus.QUEUED,
      totalRecipients: customers.length,
      aiReasoning: JSON.stringify({ quick: true })
    },
    include: { segment: true }
  });

  await prisma.campaignAnalytics.create({ data: { campaignId: campaign.id } });
  scheduleQueuedDelivery(campaign.id);

  return campaign;
}

export async function launchCampaign(
  campaignId: string,
  opts?: { finalStatus?: typeof CampaignStatus.COMPLETED | typeof CampaignStatus.DELIVERED }
) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: { segment: true }
  });
  if (!campaign) throw new Error("Campaign not found");
  if (campaign.status === CampaignStatus.RUNNING) throw new Error("Already running");

  const isQuick = campaign.aiReasoning?.includes('"quick":true');
  let customers: { id: string; name: string; email: string; phone: string | null }[];

  if (isQuick) {
    customers = await prisma.customer.findMany({
      take: campaign.totalRecipients || 25,
      orderBy: { ltvScore: "desc" },
      select: { id: true, name: true, email: true, phone: true }
    });
  } else {
    const where = filterToPrisma((campaign.segment?.segmentDefinition ?? {}) as any);
    customers = await prisma.customer.findMany({ where, select: { id: true, name: true, email: true, phone: true } });
  }
  if (customers.length === 0) throw new Error("Audience is empty");

  await prisma.campaign.update({
    where: { id: campaignId },
    data: { status: CampaignStatus.RUNNING, launchedAt: new Date(), totalRecipients: customers.length }
  });
  await prisma.campaignAnalytics.upsert({
    where: { campaignId },
    create: { campaignId },
    update: {}
  });

  // Log audit event
  await prisma.auditLog.create({
    data: {
      aggregateId: campaignId,
      aggregateType: "CAMPAIGN",
      eventType: "CAMPAIGN_LAUNCHED",
      payload: JSON.stringify({ recipients: customers.length, channel: campaign.recommendedChannel })
    }
  });

  const variants = [campaign.messageVariantA, campaign.messageVariantB, campaign.messageVariantC];
  const jobs: DispatchJob[] = [];

  for (let i = 0; i < customers.length; i++) {
    const c = customers[i];
    const variantIdx = i % 3;
    const variantLabel = ["A", "B", "C"][variantIdx];
    const messageTemplate = variants[variantIdx];
    const personalized = messageTemplate.replace(/\{\{\s*name\s*\}\}/gi, c.name);

    const comm = await prisma.communication.upsert({
      where: { campaignId_customerId: { campaignId, customerId: c.id } },
      create: {
        campaignId,
        customerId: c.id,
        channel: campaign.recommendedChannel,
        message: personalized,
        variant: variantLabel,
        status: CommunicationStatus.QUEUED
      },
      update: {}
    });
    jobs.push({
      communicationId: comm.id,
      campaignId,
      customerId: c.id,
      channel: campaign.recommendedChannel,
      recipient: { email: c.email, phone: c.phone ?? undefined },
      message: {
        body: personalized,
        subject: campaign.recommendedChannel === "EMAIL" ? `GlowMart — Hi ${c.name}` : undefined
      }
    });
  }

  const queue = getDispatchQueue();
  if (queue) {
    await queue.addBulk(
      jobs.map((data) => ({
        name: "dispatch",
        data,
        opts: { jobId: `dispatch-${data.communicationId}`, removeOnComplete: 1000, attempts: 3, backoff: { type: "exponential", delay: 1000 } }
      }))
    );
  } else {
    const finalStatus = opts?.finalStatus ?? CampaignStatus.COMPLETED;
    after(async () => {
      try {
        await processJobsInline(jobs);
        await prisma.campaign.update({
          where: { id: campaignId },
          data: { status: finalStatus, completedAt: new Date() }
        });
      } catch (e) {
        console.error("inline dispatch failed", e);
      }
    });
  }

  return { queued: jobs.length };
}

async function processJobsInline(jobs: DispatchJob[]) {
  const CONCURRENCY = 15;
  let i = 0;
  async function worker() {
    while (i < jobs.length) {
      const job = jobs[i++];
      try {
        await dispatchJob(job);
      } catch (e) {
        console.error("dispatch failed", job.communicationId);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, jobs.length) }, () => worker()));
}

async function dispatchJob(job: DispatchJob) {
  if (useInternalChannelSimulator()) {
    const { simulateSendFast } = await import("./channel-simulator");
    await simulateSendFast(job);
    return;
  }
  await axios.post(`${CHANNEL_URL}/send`, job, { timeout: 8000 });
}

export async function applyReceipt(payload: {
  communicationId: string;
  campaignId: string;
  customerId: string;
  eventType: EventType;
  eventId: string;
  timestamp: string;
  meta?: Record<string, unknown>;
}) {
  const statusMap: Partial<Record<EventType, CommunicationStatus>> = {
    SENT: CommunicationStatus.SENT,
    DELIVERED: CommunicationStatus.DELIVERED,
    FAILED: CommunicationStatus.FAILED,
    OPENED: CommunicationStatus.OPENED,
    READ: CommunicationStatus.READ,
    CLICKED: CommunicationStatus.CLICKED,
    CONVERTED: CommunicationStatus.CONVERTED
  };

  // Idempotent event upsert
  await prisma.communicationEvent.upsert({
    where: {
      communicationId_eventType_eventId: {
        communicationId: payload.communicationId,
        eventType: payload.eventType,
        eventId: payload.eventId
      }
    },
    create: {
      communicationId: payload.communicationId,
      eventType: payload.eventType,
      eventId: payload.eventId,
      timestamp: new Date(payload.timestamp),
      meta: payload.meta ? JSON.stringify(payload.meta) : undefined
    },
    update: {}
  });

  const newStatus = statusMap[payload.eventType];
  if (newStatus) {
    await prisma.communication.update({
      where: { id: payload.communicationId },
      data: {
        status: newStatus,
        sentAt: payload.eventType === "SENT" ? new Date(payload.timestamp) : undefined
      }
    });
  }

  // Update customer timeline for key events
  if (["DELIVERED", "CONVERTED"].includes(payload.eventType)) {
    await prisma.customerTimeline.create({
      data: {
        customerId: payload.customerId,
        eventType: `CAMPAIGN_${payload.eventType}`,
        title: `Campaign ${payload.eventType.toLowerCase()}`,
        detail: payload.eventType === "CONVERTED"
          ? `Converted — order ₹${payload.meta?.orderAmount ?? 0}`
          : `Message delivered via campaign`,
        createdAt: new Date(payload.timestamp)
      }
    }).catch(() => {}); // Non-critical
  }

  const { incrementAnalytics } = await import("@xenopilot/analytics");
  const revenue = payload.eventType === "CONVERTED" ? Number(payload.meta?.orderAmount ?? 0) : 0;
  await incrementAnalytics(payload.campaignId, payload.eventType, revenue);

  // SMS fallback after WhatsApp failure (multi-channel fallback chain)
  if (payload.eventType === "FAILED") {
    const comm = await prisma.communication.findUnique({
      where: { id: payload.communicationId },
      include: { customer: { select: { email: true, phone: true, name: true } } }
    });
    if (comm && comm.channel === "WHATSAPP" && !comm.isFallback && comm.customer.phone) {
      setTimeout(async () => {
        try {
          await prisma.communication.update({
            where: { id: comm.id },
            data: { fallbackChannel: "SMS", fallbackAt: new Date(), isFallback: 1, channel: "SMS" }
          });
          const fallbackJob: DispatchJob = {
            communicationId: comm.id,
            campaignId: payload.campaignId,
            customerId: payload.customerId,
            channel: "SMS",
            recipient: { phone: comm.customer.phone ?? undefined, email: comm.customer.email },
            message: { body: comm.message.slice(0, 120) }
          };
          if (useInternalChannelSimulator()) {
            const { simulateSendFast } = await import("./channel-simulator");
            await simulateSendFast(fallbackJob);
          } else {
            await axios.post(`${CHANNEL_URL}/send`, fallbackJob, { timeout: 5000 });
          }
          await prisma.communicationEvent.create({
            data: {
              communicationId: comm.id,
              eventType: "FALLBACK_SMS",
              eventId: `fallback_${Date.now()}`,
              timestamp: new Date(),
              meta: JSON.stringify({ from: "WHATSAPP", to: "SMS", reason: "delivery_failed" })
            }
          }).catch(() => {});
        } catch { /* non-critical */ }
      }, 5000); // 5s for demo (spec: 10 min)
    }
  }

  // Mark campaign completed when all comms terminal
  if (["CONVERTED", "FAILED", "DELIVERED", "CLICKED"].includes(payload.eventType)) {
    void maybeCompleteCampaign(payload.campaignId);
  }

  // Audit log
  await prisma.auditLog.create({
    data: {
      aggregateId: payload.campaignId,
      aggregateType: "CAMPAIGN",
      eventType: `RECEIPT_${payload.eventType}`,
      payload: JSON.stringify({ communicationId: payload.communicationId, customerId: payload.customerId })
    }
  }).catch(() => {});
}

async function maybeCompleteCampaign(campaignId: string) {
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign || campaign.status !== CampaignStatus.RUNNING) return;

  const [total, terminal] = await Promise.all([
    prisma.communication.count({ where: { campaignId } }),
    prisma.communication.count({
      where: {
        campaignId,
        status: { in: [CommunicationStatus.CONVERTED, CommunicationStatus.FAILED, CommunicationStatus.CLICKED, CommunicationStatus.OPENED, CommunicationStatus.READ] }
      }
    })
  ]);

  if (total > 0 && terminal >= total * 0.85) {
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: CampaignStatus.COMPLETED, completedAt: new Date() }
    });
    const { recordCampaignMemory } = await import("@xenopilot/ai-engine");
    await recordCampaignMemory(campaignId).catch(() => {});
  }
}
