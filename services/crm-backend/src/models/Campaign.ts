import { Schema, model, Types } from "mongoose";

export interface Campaign {
  _id: Types.ObjectId;
  name: string;
  prompt: string; // natural-language instruction
  audienceFilter: any; // MongoDB query object
  channel: "whatsapp" | "sms" | "email" | "rcs";
  content: {
    subject?: string;
    body: string;
    variant?: "emotional" | "premium" | "discount" | "urgency";
  };
  status: "draft" | "running" | "completed";
  estimatedAudienceSize?: number;
  predictions?: {
    openRate: number;
    clickRate: number;
    conversionProbability: number;
    expectedRoi: number;
    confidence: number; // 0-1
  };
  explainability?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const campaignSchema = new Schema<Campaign>(
  {
    name: { type: String, required: true, index: true },
    prompt: { type: String, required: true },
    audienceFilter: { type: Schema.Types.Mixed, required: true },
    channel: {
      type: String,
      enum: ["whatsapp", "sms", "email", "rcs"],
      required: true,
      index: true
    },
    content: {
      subject: String,
      body: { type: String, required: true },
      variant: { type: String, enum: ["emotional", "premium", "discount", "urgency"] }
    },
    status: { type: String, enum: ["draft", "running", "completed"], default: "draft", index: true },
    estimatedAudienceSize: Number,
    predictions: {
      openRate: Number,
      clickRate: Number,
      conversionProbability: Number,
      expectedRoi: Number,
      confidence: Number
    },
    explainability: [String]
  },
  { timestamps: true }
);

export const CampaignModel = model<Campaign>("campaigns", campaignSchema);
