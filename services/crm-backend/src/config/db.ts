import mongoose from "mongoose";
import { env } from "./env";

/**
 * Connects to MongoDB.
 *
 * - If MONGO_URI is set, we connect to that (managed/local Mongo).
 * - If it is empty OR the connection fails, we transparently spin up an
 *   in-memory MongoDB (mongodb-memory-server). This makes the product "just
 *   run" on a LAN machine without requiring a MongoDB install. Data is seeded
 *   in one click, so non-persistence across restarts is an acceptable tradeoff
 *   for a demo (in production MONGO_URI points at a managed cluster).
 *
 * Tradeoff: in production you would always point MONGO_URI at a managed
 * cluster with replication, backups, and proper indexes. The in-memory server
 * is purely a zero-friction default for this assignment.
 */
export async function connectToDatabase(): Promise<{ mode: "external" | "memory" }> {
  mongoose.set("strictQuery", true);

  if (env.mongoUri) {
    try {
      await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 4000 } as any);
      console.log("Connected to MongoDB via MONGO_URI");
      return { mode: "external" };
    } catch (err) {
      console.warn(
        "Could not reach MONGO_URI, falling back to in-memory MongoDB:",
        (err as Error).message
      );
    }
  }

  // Lazy import so the dependency is only loaded when needed.
  const { MongoMemoryServer } = await import("mongodb-memory-server");
  const mem = await MongoMemoryServer.create({ instance: { dbName: "xeno_crm" } });
  // Keep a reference so the GC never collects (and kills) the server.
  (globalThis as any).__xenoMem = mem;
  await mongoose.connect(mem.getUri(), { serverSelectionTimeoutMS: 8000 } as any);
  console.log(`Connected to in-memory MongoDB at ${mem.getUri()}`);

  mongoose.connection.on("error", (e) => console.error("Mongo connection error:", e?.message));
  process.on("exit", () => mem.stop().catch(() => undefined));
  return { mode: "memory" };
}
