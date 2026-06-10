import { Router } from "express";
import { CustomerModel } from "../models/Customer";

const router = Router();

/**
 * GET /personas
 * Derives shopper personas directly from the live data using spend +
 * engagement buckets, so they reflect the actual customer base rather than
 * hard-coded marketing fluff.
 */
router.get("/personas", async (_req, res, next) => {
  try {
    const buckets = [
      {
        name: "Loyal Connoisseurs",
        match: { totalSpend: { $gte: 8000 }, engagementScore: { $gte: 60 } },
        summary: "High lifetime spend and consistently engaged. Value exclusivity and early access.",
        traits: ["Premium tone", "Early access", "Loyalty perks"]
      },
      {
        name: "Silent Big Spenders",
        match: { totalSpend: { $gte: 8000 }, engagementScore: { $lt: 60 } },
        summary: "Spend big but rarely engage with messaging. Need concise, high-signal nudges.",
        traits: ["Concise messaging", "VIP invites", "High-end visuals"]
      },
      {
        name: "Deal Hunters",
        match: { totalSpend: { $lt: 3000 }, engagementScore: { $gte: 40 } },
        summary: "Price-sensitive but responsive. Convert well on discounts and urgency.",
        traits: ["Coupons", "Flash sales", "BOGO"]
      },
      {
        name: "At-Risk Lapsers",
        match: { engagementScore: { $lt: 35 } },
        summary: "Low engagement and slipping away. Prime targets for emotional win-back.",
        traits: ["Emotional win-back", "Free refill", "Re-engagement"]
      }
    ];

    const personas = await Promise.all(
      buckets.map(async (b) => {
        const agg = await CustomerModel.aggregate([
          { $match: b.match },
          {
            $group: {
              _id: null,
              size: { $sum: 1 },
              avgSpend: { $avg: "$totalSpend" },
              channels: { $push: "$preferredChannel" }
            }
          }
        ]);
        const row = agg[0] ?? { size: 0, avgSpend: 0, channels: [] };
        const channelCounts: Record<string, number> = {};
        for (const c of row.channels as string[]) if (c) channelCounts[c] = (channelCounts[c] ?? 0) + 1;
        const preferredChannels = Object.entries(channelCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 2)
          .map(([c]) => c);
        return {
          name: b.name,
          summary: b.summary,
          size: row.size,
          averageSpend: Math.round(row.avgSpend ?? 0),
          preferredChannels,
          engagementTraits: b.traits
        };
      })
    );

    res.json(personas);
  } catch (err) {
    next(err);
  }
});

export default router;
