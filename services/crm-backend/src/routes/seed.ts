import { Router } from "express";
import { CustomerModel } from "../models/Customer";
import { OrderModel } from "../models/Order";
import { CampaignModel } from "../models/Campaign";
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

const FIRST = ["Aarav", "Vivaan", "Aditya", "Diya", "Ananya", "Ishaan", "Kabir", "Myra", "Sara", "Reyansh", "Aanya", "Vihaan", "Anika", "Arjun", "Saanvi", "Riya", "Kiara", "Dhruv", "Tara", "Neel"];
const LAST = ["Sharma", "Verma", "Iyer", "Nair", "Reddy", "Gupta", "Mehta", "Patel", "Rao", "Khan", "Bose", "Das", "Kapoor", "Malhotra"];
const CITIES = ["Mumbai", "Delhi", "Bangalore", "Hyderabad", "Chennai", "Pune", "Kolkata", "Jaipur"];
const CHANNELS = ["whatsapp", "sms", "email", "rcs"] as const;
const CATEGORIES = ["espresso", "cold-brew", "pastry", "beans", "merchandise", "latte"];

const SAMPLE_PROMPTS = [
  "Re-engage inactive premium customers with an emotional win-back",
  "Send a 25% discount to budget shoppers who haven't bought in 60 days",
  "Reward loyal high-value customers with an exclusive offer"
];

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Build believable historical analytics for a completed campaign. */
function syntheticTotals(audience: number) {
  const sent = audience;
  const failed = Math.round(sent * (Math.random() * 0.06 + 0.02));
  const delivered = sent - failed;
  const opened = Math.round(delivered * (0.45 + Math.random() * 0.25));
  const clicked = Math.round(opened * (0.25 + Math.random() * 0.2));
  const purchased = Math.round(clicked * (0.12 + Math.random() * 0.15));
  const revenue = purchased * rand(800, 4500);
  return {
    queued: audience,
    sent,
    delivered,
    failed,
    opened,
    clicked,
    purchased,
    revenue
  };
}

/**
 * POST /seed { customers?: number, reset?: boolean, withCampaigns?: boolean }
 * Generates shoppers + orders, and optionally 3 completed sample campaigns
 * with synthetic performance so dashboards look alive on first open.
 */
router.post("/seed", async (req, res, next) => {
  try {
    const count = Math.min(Number(req.body?.customers ?? 300), 2000);
    const reset = req.body?.reset !== false;
    const withCampaigns = req.body?.withCampaigns !== false;

    if (reset) {
      await Promise.all([
        CustomerModel.deleteMany({}),
        OrderModel.deleteMany({}),
        CampaignModel.deleteMany({}),
        CommunicationModel.deleteMany({}),
        AnalyticsModel.deleteMany({})
      ]);
    }

    const now = Date.now();
    const DAY = 24 * 60 * 60 * 1000;
    const customers = Array.from({ length: count }).map((_, i) => {
      const archetype = Math.random();
      let totalSpend: number;
      let engagementScore: number;
      let daysSincePurchase: number;
      if (archetype < 0.2) {
        totalSpend = rand(8000, 25000);
        engagementScore = rand(60, 98);
        daysSincePurchase = rand(1, 30);
      } else if (archetype < 0.55) {
        totalSpend = rand(2500, 9000);
        engagementScore = rand(30, 75);
        daysSincePurchase = rand(10, 90);
      } else {
        totalSpend = rand(200, 3000);
        engagementScore = rand(5, 45);
        daysSincePurchase = rand(40, 200);
      }
      const first = pick(FIRST);
      const last = pick(LAST);
      return {
        name: `${first} ${last}`,
        age: rand(18, 60),
        gender: pick(["male", "female", "other"] as const),
        email: `${first}.${last}.${i}@example.com`.toLowerCase(),
        phone: `+9198${rand(10000000, 99999999)}`,
        city: pick(CITIES),
        preferredChannel: pick(CHANNELS),
        totalSpend,
        lastPurchaseDate: new Date(now - daysSincePurchase * DAY),
        engagementScore
      };
    });

    const insertedCustomers = await CustomerModel.insertMany(customers, { ordered: false });

    const orders: any[] = [];
    for (const c of insertedCustomers) {
      const numOrders = c.totalSpend > 8000 ? rand(4, 12) : c.totalSpend > 3000 ? rand(2, 6) : rand(0, 3);
      for (let k = 0; k < numOrders; k++) {
        orders.push({
          customerId: c._id,
          orderAmount: rand(150, 1200),
          productCategory: pick(CATEGORIES),
          timestamp: new Date(now - rand(1, 200) * DAY),
          orderFrequency: numOrders
        });
      }
    }
    const insertedOrders = await OrderModel.insertMany(orders, { ordered: false });

    let campaignsCreated = 0;
    if (withCampaigns) {
      for (let i = 0; i < SAMPLE_PROMPTS.length; i++) {
        const prompt = SAMPLE_PROMPTS[i];
        const segment = await segmentPromptToMongoFilter(prompt);
        const rec = await recommendChannel(segment.filter);
        const channel = rec.channel;
        const variant = inferVariant(prompt);
        const content = generateMessage(prompt, channel, variant);
        const predictions = await predictOutcomes(segment.filter, channel, variant);
        const audience = Math.max(segment.estimatedSize, rand(40, 120));

        const campaign = await CampaignModel.create({
          name: segment.label + " — " + variant + " (" + channel + ")",
          prompt,
          audienceFilter: segment.filter,
          channel,
          content,
          status: "completed",
          estimatedAudienceSize: audience,
          predictions,
          explainability: segment.reasoning,
          createdAt: new Date(now - (SAMPLE_PROMPTS.length - i) * 5 * DAY),
          updatedAt: new Date(now - (SAMPLE_PROMPTS.length - i - 1) * 4 * DAY)
        });

        const totals = syntheticTotals(audience);
        await AnalyticsModel.create({
          campaignId: campaign._id,
          totals: {
            queued: totals.queued,
            sent: totals.sent,
            delivered: totals.delivered,
            failed: totals.failed,
            opened: totals.opened,
            clicked: totals.clicked,
            purchased: totals.purchased
          },
          revenue: totals.revenue,
          lastEventAt: campaign.updatedAt
        });
        campaignsCreated++;
      }
    }

    res.json({
      brand: "Brewhaus Coffee",
      customers: insertedCustomers.length,
      orders: insertedOrders.length,
      campaigns: campaignsCreated
    });
  } catch (err) {
    next(err);
  }
});

export default router;
