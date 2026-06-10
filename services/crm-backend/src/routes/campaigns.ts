import { Router } from "express";
import axios from "axios";
import { Types } from "mongoose";
import { env } from "../config/env";
import { CampaignModel } from "../models/Campaign";
import { CustomerModel } from "../models/Customer";
import { CommunicationModel } from "../models/Communication";
import { AnalyticsModel } from "../models/Analytics";
import {
  generateMessage,
  inferVariant,
  predictOutcomes,
  recommendChannel,
  segmentPromptToMongoFilter
} from "../services/ai";

const router = Router();

/**
 * POST /campaigns/draft
 * The AI-native step: turn a natural-language goal into a full campaign draft
 * (audience + channel + copy + forecast) WITHOUT persisting anything yet.
 */
router.post("/campaigns/draft", async (req, res, next) => {
  try {
    const { prompt, channel: channelOverride } = req.body as { prompt?: string; channel?: any };
    if (!prompt) return res.status(400).json({ error: "prompt is required" });

    const segment = await segmentPromptToMongoFilter(prompt);
    const rec = await recommendChannel(segment.filter);
    const channel = channelOverride ?? rec.channel;
    const variant = inferVariant(prompt);
    const content = generateMessage(prompt, channel, variant);
    const predictions = await predictOutcomes(segment.filter, channel, variant);
    const sample = await CustomerModel.find(segment.filter)
      .select("name email city totalSpend engagementScore preferredChannel")
      .limit(8);

    res.json({
      name: `${segment.label} — ${variant} (${channel})`,
      prompt,
      audienceFilter: segment.filter,
      estimatedAudienceSize: segment.estimatedSize,
      channel,
      channelRationale: rec.rationale,
      channelMix: rec.mix,
      content,
      predictions,
      explainability: segment.reasoning,
      sample
    });
  } catch (err) {
    next(err);
  }
});

/** POST /campaigns — persist a draft campaign. */
router.post("/campaigns", async (req, res, next) => {
  try {
    const body = req.body as any;
    if (!body?.audienceFilter || !body?.content?.body || !body?.channel) {
      return res.status(400).json({ error: "audienceFilter, channel and content.body are required" });
    }
    const estimatedAudienceSize =
      body.estimatedAudienceSize ?? (await CustomerModel.countDocuments(body.audienceFilter));
    const campaign = await CampaignModel.create({
      name: body.name ?? "Untitled campaign",
      prompt: body.prompt ?? "",
      audienceFilter: body.audienceFilter,
      channel: body.channel,
      content: body.content,
      status: "draft",
      estimatedAudienceSize,
      predictions: body.predictions,
      explainability: body.explainability ?? []
    });
    res.json(campaign);
  } catch (err) {
    next(err);
  }
});

/** GET /campaigns — list with merged analytics. */
router.get("/campaigns", async (_req, res, next) => {
  try {
    const campaigns = await CampaignModel.find().sort({ createdAt: -1 }).limit(100).lean();
    const ids = campaigns.map((c) => c._id);
    const analytics = await AnalyticsModel.find({ campaignId: { $in: ids } }).lean();
    const byId = new Map(analytics.map((a) => [String(a.campaignId), a]));
    res.json(
      campaigns.map((c) => ({ ...c, analytics: byId.get(String(c._id))?.totals ?? null, revenue: byId.get(String(c._id))?.revenue ?? 0 }))
    );
  } catch (err) {
    next(err);
  }
});

/** GET /campaigns/:id — full detail + analytics + recent communications. */
router.get("/campaigns/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!Types.ObjectId.isValid(id)) return res.status(400).json({ error: "invalid id" });
    const campaign = await CampaignModel.findById(id).lean();
    if (!campaign) return res.status(404).json({ error: "not found" });
    const analytics = await AnalyticsModel.findOne({ campaignId: id }).lean();
    const comms = await CommunicationModel.find({ campaignId: id })
      .sort({ updatedAt: -1 })
      .limit(50)
      .populate("customerId", "name email")
      .lean();
    res.json({ campaign, analytics, communications: comms });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /campaigns/:id/launch
 * Resolves the audience, creates one Communication per recipient, initialises
 * analytics, then asynchronously dispatches each message to the stubbed channel
 * service with a bounded concurrency. Returns immediately (fire-and-forget) so
 * large audiences don't block the request.
 */
router.post("/campaigns/:id/launch", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!Types.ObjectId.isValid(id)) return res.status(400).json({ error: "invalid id" });
    const campaign = await CampaignModel.findById(id);
    if (!campaign) return res.status(404).json({ error: "not found" });
    if (campaign.status === "running") return res.status(409).json({ error: "already running" });

    const recipients = await CustomerModel.find(campaign.audienceFilter)
      .select("name email phone preferredChannel")
      .lean();
    if (recipients.length === 0) return res.status(400).json({ error: "audience is empty" });

    // Create queued communications (idempotent per campaign+customer).
    const ops = recipients.map((r) => ({
      updateOne: {
        filter: { campaignId: campaign._id, customerId: r._id },
        update: {
          $setOnInsert: {
            campaignId: campaign._id,
            customerId: r._id,
            channel: campaign.channel,
            status: "queued",
            events: [{ type: "queued", timestamp: new Date() }]
          }
        },
        upsert: true
      }
    }));
    await CommunicationModel.bulkWrite(ops as any, { ordered: false });

    await AnalyticsModel.findOneAndUpdate(
      { campaignId: campaign._id },
      { $setOnInsert: { campaignId: campaign._id }, $set: { "totals.queued": recipients.length } },
      { upsert: true }
    );

    campaign.status = "running";
    await campaign.save();

    const io = req.app.get("io");
    io.to("global").emit("campaign:launched", { campaignId: String(campaign._id), name: campaign.name, audience: recipients.length });

    res.json({ ok: true, campaignId: campaign._id, dispatched: recipients.length });

    // Fire-and-forget dispatch with bounded concurrency.
    dispatchAll(String(campaign._id), campaign.channel, campaign.content, recipients).catch((e) =>
      console.error("dispatch error", e)
    );
  } catch (err) {
    next(err);
  }
});

type Recipient = { _id: any; name?: string; email?: string; phone?: string };

async function dispatchAll(
  campaignId: string,
  channel: string,
  content: { subject?: string; body: string; variant?: string },
  recipients: Recipient[]
) {
  const CONCURRENCY = 25;
  let cursor = 0;
  async function worker() {
    while (cursor < recipients.length) {
      const r = recipients[cursor++];
      const personalisedBody = content.body.replace(/\{\{\s*name\s*\}\}/g, r.name ?? "there");
      const personalisedSubject = content.subject?.replace(/\{\{\s*name\s*\}\}/g, r.name ?? "there");
      try {
        await axios.post(`${env.providerBaseUrl}/send`, {
          campaignId,
          customerId: String(r._id),
          channel,
          content: { subject: personalisedSubject, body: personalisedBody, variant: content.variant }
        });
      } catch (e: any) {
        console.error("provider /send failed for", String(r._id), e?.message);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, recipients.length) }, worker));

  // Mark campaign completed once all messages have been handed to the provider.
  await CampaignModel.findByIdAndUpdate(campaignId, { status: "completed" });
}

export default router;
