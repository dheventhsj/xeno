import { Router } from "express";
import { CustomerModel } from "../models/Customer";
import { parseCsv } from "../utils/csv";

const router = Router();

router.get("/customers", async (req, res, next) => {
  try {
    const { q, limit = "50", skip = "0" } = req.query as Record<string, string>;
    const filter: any = {};
    if (q) {
      filter.$or = [
        { name: new RegExp(q, "i") },
        { email: new RegExp(q, "i") },
        { city: new RegExp(q, "i") }
      ];
    }
    const items = await CustomerModel.find(filter)
      .sort({ updatedAt: -1 })
      .skip(parseInt(skip, 10))
      .limit(Math.min(parseInt(limit, 10), 200));
    const total = await CustomerModel.countDocuments(filter);
    res.json({ items, total });
  } catch (err) {
    next(err);
  }
});

router.post("/customers/ingest-json", async (req, res, next) => {
  try {
    const customers = req.body?.customers as any[];
    if (!Array.isArray(customers)) {
      return res.status(400).json({ error: "customers must be an array" });
    }
    const docs = await CustomerModel.insertMany(
      customers.map((c) => ({
        name: c.name,
        age: Number(c.age ?? 0),
        gender: c.gender ?? "other",
        email: c.email,
        phone: c.phone,
        city: c.city,
        preferredChannel: c.preferredChannel,
        totalSpend: Number(c.totalSpend ?? 0),
        lastPurchaseDate: c.lastPurchaseDate ? new Date(c.lastPurchaseDate) : undefined,
        engagementScore: Number(c.engagementScore ?? 0)
      })),
      { ordered: false }
    );
    res.json({ inserted: docs.length });
  } catch (err) {
    next(err);
  }
});

router.post("/customers/ingest-csv", async (req, res, next) => {
  try {
    const { csv } = req.body as { csv?: string };
    if (!csv) return res.status(400).json({ error: "csv is required" });
    const rows = parseCsv(csv);
    const [header, ...data] = rows;
    const idx = (k: string) => header.findIndex((h) => h.toLowerCase() === k);
    const docs = data.map((r) => ({
      name: r[idx("name")],
      age: Number(r[idx("age")] ?? 0),
      gender: (r[idx("gender")] as any) ?? "other",
      email: r[idx("email")],
      phone: r[idx("phone")],
      city: r[idx("city")],
      preferredChannel: r[idx("preferred channel")] as any,
      totalSpend: Number(r[idx("total spend")] ?? 0),
      lastPurchaseDate: r[idx("last purchase date")] ? new Date(r[idx("last purchase date")]) : undefined,
      engagementScore: Number(r[idx("engagement score")] ?? 0)
    }));
    const result = await CustomerModel.insertMany(docs, { ordered: false });
    res.json({ inserted: result.length });
  } catch (err) {
    next(err);
  }
});

export default router;
