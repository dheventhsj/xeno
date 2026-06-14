import { createDispatchWorker } from "../lib/queue";

console.log("XenoPilot dispatch worker starting...");
const worker = createDispatchWorker();
worker.on("completed", (j) => console.log("dispatched", j.id));
worker.on("failed", (j, e) => console.error("failed", j?.id, e.message));
