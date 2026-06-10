import { Router } from "express";
import { OrderModel } from "../models/Order";
import { parseCsv } from "../utils/csv";
import { Types } from "mongoose";

const router = Router();

router.get("/orders", async (req, res, next) => {
  try {
    const { customerId, limit = "50", skip = "0" } = req.query as Record<string, string>;
    const filter: any = {};
    if (customerId && Types.ObjectId.isValid(customerId)) {
      filter.customerId = new Types.ObjectId(customerId);
    }
    const items = await OrderModel.find(filter)
      .sort({ timestamp: -1 })
      .skip(parseInt(skip, 10))
      .limit(Math.min(parseInt(limit, 10), 200));
    const total = await OrderModel.countDocuments(filter);
    res.json({ items, total });
  } catch (err) {
    next(err);
  }
});

router.post("/orders/ingest-json", async (req, res, next) => {
  try {
    const orders = req.body?.orders as any[];
    if (!Array.isArray(orders)) {
      return res.status(400).json({ error: "orders must be an array" });
    }
    const docs = await OrderModel.insertMany(
      orders.map((o) => ({
        customerId: new Types.ObjectId(o.customerId),
        orderAmount: Number(o.orderAmount ?? 0),
        productCategory: o.productCategory,
        timestamp: o.timestamp ? new Date(o.timestamp) : new Date(),
        orderFrequency: Number(o.orderFrequency ?? 0)
      })),
      { ordered: false }
    );
    res.json({ inserted: docs.length });
  } catch (err) {
    next(err);
  }
});

router.post("/orders/ingest-csv", async (req, res, next) => {
  try {
    const { csv } = req.body as { csv?: string };
    if (!csv) return res.status(400).json({ error: "csv is required" });
    const rows = parseCsv(csv);
    const [header, ...data] = rows;
    const idx = (k: string) => header.findIndex((h) => h.toLowerCase() === k);
    const docs = data.map((r) => ({
      customerId: new Types.ObjectId(r[idx("customer id")]),
      orderAmount: Number(r[idx("order amount")] ?? 0),
      productCategory: r[idx("product category")],
      timestamp: r[idx("timestamp")] ? new Date(r[idx("timestamp")]) : new Date(),
      orderFrequency: Number(r[idx("order frequency")] ?? 0)
    }));
    const result = await OrderModel.insertMany(docs, { ordered: false });
    res.json({ inserted: result.length });
  } catch (err) {
    next(err);
  }
});

export default router;
