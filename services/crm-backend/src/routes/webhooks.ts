import { Router } from "express";
import crypto from "crypto";
import { env } from "../config/env";
import { CommunicationModel } from "../models/Communication";
import { AnalyticsModel } from "../models/Analytics";
import { Types } from "mongoose";
import type { Request, Response, NextFunction } from "express";

const router = Router();

function verifySignature(req: Request): boolean {
  const signature = req.headers["x-signature"] as string | undefined;
  if (!signature) return false;
  const body = JSON.stringify(req.body ?? {});
  const hmac = crypto.createHmac("sha256", env.webhookSecret);
  const expected = hmac.update(body).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

router.post("/webhooks/provider", async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!verifySignature(req)) {
      return res.status(401).json({ error: "Invalid signature" });
    }
    const { campaignId, customerId, messageId, eventType, timestamp, meta } = req.body as {
      campaignId: string;
      customerId: string;
      messageId: string;
      eventType: "sent" | "delivered" | "failed" | "opened" | "clicked" | "purchased";
      timestamp: string;
      meta?: Record<string, any>;
    };

    const comm = await CommunicationModel.findOneAndUpdate(
      { campaignId: new Types.ObjectId(campaignId), customerId: new Types.ObjectId(customerId) },
      {
        $set: { messageId, status: eventType },
        $push: { events: { type: eventType, timestamp: new Date(timestamp), meta } }
      },
      { upsert: true, new: true }
    );

    const inc: Record<string, number> = { [`totals.${eventType}`]: 1 };
    // Attribute revenue when a purchase is driven by the communication.
    if (eventType === "purchased" && meta?.orderAmount) {
      inc["revenue"] = Number(meta.orderAmount);
    }

    await AnalyticsModel.findOneAndUpdate(
      { campaignId: new Types.ObjectId(campaignId) },
      { $inc: inc, $set: { lastEventAt: new Date(timestamp) } },
      { upsert: true, new: true }
    );

    const payload = {
      campaignId,
      customerId,
      messageId: comm?.messageId,
      eventType,
      timestamp,
      meta
    };
    // Emit to the campaign room and to the global firehose.
    const io = req.app.get("io");
    io.to(campaignId).emit("campaign:event", payload);
    io.to("global").emit("event:any", payload);

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
