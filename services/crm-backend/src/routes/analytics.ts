import { Router } from "express";
import { Types } from "mongoose";
import { CampaignModel } from "../models/Campaign";
import { CommunicationModel } from "../models/Communication";
import { AnalyticsModel } from "../models/Analytics";
import { CustomerModel } from "../models/Customer";

const router = Router();

const EVENTS = ["queued", "sent", "delivered", "failed", "opened", "clicked", "purchased"] as const;

/** GET /analytics/overview — top-line KPIs, funnel, and per-channel performance. */
router.get("/analytics/overview", async (_req, res, next) => {
  try {
    const [aggTotals] = await AnalyticsModel.aggregate([
      {
        $group: {
          _id: null,
          sent: { $sum: "$totals.sent" },
          delivered: { $sum: "$totals.delivered" },
          failed: { $sum: "$totals.failed" },
          opened: { $sum: "$totals.opened" },
          clicked: { $sum: "$totals.clicked" },
          purchased: { $sum: "$totals.purchased" },
          revenue: { $sum: "$revenue" }
        }
      }
    ]);

    const totals = aggTotals ?? { sent: 0, delivered: 0, failed: 0, opened: 0, clicked: 0, purchased: 0, revenue: 0 };
    const safe = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 1000) / 10 : 0);

    const channelPerf = await CommunicationModel.aggregate([
      {
        $group: {
          _id: "$channel",
          delivered: { $sum: { $cond: [{ $in: ["$status", ["delivered", "opened", "clicked", "purchased"]] }, 1, 0] } },
          opened: { $sum: { $cond: [{ $in: ["$status", ["opened", "clicked", "purchased"]] }, 1, 0] } },
          clicked: { $sum: { $cond: [{ $in: ["$status", ["clicked", "purchased"]] }, 1, 0] } },
          purchased: { $sum: { $cond: [{ $eq: ["$status", "purchased"] }, 1, 0] } }
        }
      }
    ]);

    const [campaignCount, audienceReach, customerCount] = await Promise.all([
      CampaignModel.countDocuments(),
      CommunicationModel.estimatedDocumentCount(),
      CustomerModel.estimatedDocumentCount()
    ]);

    res.json({
      kpis: {
        campaigns: campaignCount,
        customers: customerCount,
        messages: audienceReach,
        revenue: totals.revenue ?? 0,
        deliveryRate: safe(totals.delivered, totals.sent),
        openRate: safe(totals.opened, totals.delivered),
        clickRate: safe(totals.clicked, totals.opened),
        conversionRate: safe(totals.purchased, totals.delivered)
      },
      funnel: EVENTS.filter((e) => e !== "queued" && e !== "failed").map((e) => ({ stage: e, count: (totals as any)[e] ?? 0 })),
      totals,
      channelPerformance: channelPerf.map((c) => ({
        channel: (c._id ?? "unknown").toString().toUpperCase(),
        delivered: c.delivered,
        opened: c.opened,
        clicked: c.clicked,
        purchased: c.purchased
      }))
    });
  } catch (err) {
    next(err);
  }
});

/** GET /analytics/campaign/:id — per-campaign rates. */
router.get("/analytics/campaign/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!Types.ObjectId.isValid(id)) return res.status(400).json({ error: "invalid id" });
    const a = await AnalyticsModel.findOne({ campaignId: id }).lean();
    res.json(a ?? { campaignId: id, totals: null });
  } catch (err) {
    next(err);
  }
});

export default router;
