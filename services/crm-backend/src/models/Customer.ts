import { Schema, model, Types } from "mongoose";

export interface Customer {
  _id: Types.ObjectId;
  name: string;
  age: number;
  gender: "male" | "female" | "other";
  email: string;
  phone?: string;
  city?: string;
  preferredChannel?: "whatsapp" | "sms" | "email" | "rcs";
  totalSpend: number;
  lastPurchaseDate?: Date;
  engagementScore: number; // 0-100
  createdAt: Date;
  updatedAt: Date;
}

const customerSchema = new Schema<Customer>(
  {
    name: { type: String, required: true, index: true },
    age: { type: Number, required: true, index: true },
    gender: { type: String, enum: ["male", "female", "other"], required: true },
    email: { type: String, required: true, unique: true, index: true },
    phone: { type: String },
    city: { type: String, index: true },
    preferredChannel: {
      type: String,
      enum: ["whatsapp", "sms", "email", "rcs"],
      index: true
    },
    totalSpend: { type: Number, required: true, index: true },
    lastPurchaseDate: { type: Date, index: true },
    engagementScore: { type: Number, required: true, index: true }
  },
  { timestamps: true }
);

customerSchema.index({ engagementScore: -1 });
customerSchema.index({ lastPurchaseDate: -1 });
customerSchema.index({ totalSpend: -1 });

export const CustomerModel = model<Customer>("customers", customerSchema);
