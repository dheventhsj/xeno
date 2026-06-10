import { Router } from "express";
import { segmentPromptToMongoFilter } from "../services/ai";
import { CustomerModel } from "../models/Customer";

const router = Router();

router.post("/ai/segment", async (req, res, next) => {
  try {
    const { prompt } = req.body as { prompt?: string };
    if (!prompt) return res.status(400).json({ error: "prompt is required" });
    const result = await segmentPromptToMongoFilter(prompt);
    // Also return a preview sample
    const sample = await CustomerModel.find(result.filter).limit(10);
    res.json({ ...result, sample });
  } catch (err) {
    next(err);
  }
});

export default router;
