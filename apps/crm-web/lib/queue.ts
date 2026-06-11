import { Queue, Worker } from "bullmq";
import axios from "axios";

const CHANNEL_URL = process.env.CHANNEL_SERVICE_URL ?? "http://localhost:5001";
const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";

export type DispatchJob = {
  communicationId: string;
  campaignId: string;
  customerId: string;
  channel: string;
  recipient: { email?: string; phone?: string };
  message: { body: string; subject?: string };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let queue: Queue<any, any, string> | null = null;

const connection = { url: REDIS_URL, maxRetriesPerRequest: null };

export function getDispatchQueue(): Queue<DispatchJob> | null {
  if (process.env.DISABLE_REDIS === "1") return null;
  if (queue) return queue as Queue<DispatchJob>;
  try {
    queue = new Queue("campaign:dispatch", { connection });
    return queue as Queue<DispatchJob>;
  } catch {
    return null;
  }
}

export function createDispatchWorker() {
  return new Worker<DispatchJob>(
    "campaign:dispatch",
    async (job) => {
      await axios.post(`${CHANNEL_URL}/send`, job.data, { timeout: 8000 });
    },
    { connection, concurrency: 25 }
  );
}
