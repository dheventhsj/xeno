import { Schema, model, Types } from "mongoose";

export interface Order {
  _id: Types.ObjectId;
  customerId: Types.ObjectId;
  orderAmount: number;
  productCategory: string;
  timestamp: Date;
  orderFrequency: number; // e.g., orders per month
  createdAt: Date;
  updatedAt: Date;
}

const orderSchema = new Schema<Order>(
  {
    customerId: { type: Schema.Types.ObjectId, ref: "customers", index: true },
    orderAmount: { type: Number, required: true, index: true },
    productCategory: { type: String, required: true, index: true },
    timestamp: { type: Date, required: true, index: true },
    orderFrequency: { type: Number, required: true, index: true }
  },
  { timestamps: true }
);

orderSchema.index({ customerId: 1, timestamp: -1 });

export const OrderModel = model<Order>("orders", orderSchema);
