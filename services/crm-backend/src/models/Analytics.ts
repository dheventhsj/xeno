import { Schema, model, Types } from "mongoose";

export interface CampaignAnalytics {
  _id: Types.ObjectId;
  campaignId: Types.ObjectId;
  totals: {
    queued: number;
    sent: number;
    delivered: number;
    failed: number;
    opened: number;
    clicked: number;
    purchased: number;
  };
  revenue: number;
  lastEventAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const analyticsSchema = new Schema<CampaignAnalytics>(
  {
    campaignId: { type: Schema.Types.ObjectId, ref: "campaigns", unique: true, index: true },
    totals: {
      queued: { type: Number, default: 0 },
      sent: { type: Number, default: 0 },
      delivered: { type: Number, default: 0 },
      failed: { type: Number, default: 0 },
      opened: { type: Number, default: 0 },
      clicked: { type: Number, default: 0 },
      purchased: { type: Number, default: 0 }
    },
    revenue: { type: Number, default: 0 },
    lastEventAt: { type: Date }
  },
  { timestamps: true }
);

export const AnalyticsModel = model<CampaignAnalytics>("analytics", analyticsSchema);
