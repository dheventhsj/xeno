import express from "express";
import http from "http";
import cors from "cors";
import helmet from "helmet";
import { corsOrigin, env } from "./config/env";
import { connectToDatabase } from "./config/db";
import { errorHandler, notFound } from "./middleware/errorHandler";
import healthRoutes from "./routes/health";
import webhookRoutes from "./routes/webhooks";
import { createIo } from "./socket";
import customerRoutes from "./routes/customers";
import orderRoutes from "./routes/orders";
import aiRoutes from "./routes/ai";
import campaignRoutes from "./routes/campaigns";
import analyticsRoutes from "./routes/analytics";
import seedRoutes from "./routes/seed";
import personaRoutes from "./routes/personas";

async function bootstrap() {
  const { mode } = await connectToDatabase();
  const app = express();
  const server = http.createServer(app);
  const io = createIo(server);
  app.set("io", io);

  app.use(cors({ origin: corsOrigin(), credentials: true }));
  app.use(helmet({ crossOriginResourcePolicy: false }));
  app.use(express.json({ limit: "8mb" }));

  app.use("/api", healthRoutes);
  app.use("/api", webhookRoutes);
  app.use("/api", customerRoutes);
  app.use("/api", orderRoutes);
  app.use("/api", aiRoutes);
  app.use("/api", campaignRoutes);
  app.use("/api", analyticsRoutes);
  app.use("/api", seedRoutes);
  app.use("/api", personaRoutes);

  app.use(notFound);
  app.use(errorHandler);

  server.listen(env.port, env.host, () => {
    console.log(`CRM backend listening on http://${env.host}:${env.port} (db: ${mode})`);
  });
}

bootstrap().catch((err) => {
  console.error("Fatal bootstrap error:", err);
  process.exit(1);
});
