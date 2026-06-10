import { Schema, model, Types } from "mongoose";

export type CommunicationStatus =
  | "queued"
  | "sent"
  | "delivered"
  | "failed"
  | "opened"
  | "clicked"
  | "purchased";

export interface Communication {
  _id: Types.ObjectId;
  campaignId: Types.ObjectId;
  customerId: Types.ObjectId;
  channel: "whatsapp" | "sms" | "email" | "rcs";
  messageId?: string; // provider message id
  status: CommunicationStatus;
  events: {
    type: CommunicationStatus;
    timestamp: Date;
    meta?: Record<string, any>;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const communicationSchema = new Schema<Communication>(
  {
    campaignId: { type: Schema.Types.ObjectId, ref: "campaigns", index: true },
    customerId: { type: Schema.Types.ObjectId, ref: "customers", index: true },
    channel: { type: String, enum: ["whatsapp", "sms", "email", "rcs"], index: true },
    messageId: { type: String, index: true },
    status: {
      type: String,
      enum: ["queued", "sent", "delivered", "failed", "opened", "clicked", "purchased"],
      index: true
    },
    events: [
      {
        type: {
          type: String,
          enum: ["queued", "sent", "delivered", "failed", "opened", "clicked", "purchased"],
          required: true
        },
        timestamp: { type: Date, required: true },
        meta: Schema.Types.Mixed
      }
    ]
  },
  { timestamps: true }
);

communicationSchema.index({ campaignId: 1, customerId: 1 });

export const CommunicationModel = model<Communication>("communications", communicationSchema);
