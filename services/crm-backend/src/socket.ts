import type { Server as HTTPServer } from "http";
import { Server } from "socket.io";
import { corsOrigin } from "./config/env";

export function createIo(server: HTTPServer): Server {
  const io = new Server(server, {
    cors: {
      origin: corsOrigin(),
      methods: ["GET", "POST"]
    }
  });
  io.on("connection", (socket) => {
    // Clients join a per-campaign room to receive that campaign's live events.
    socket.on("join:campaign", (campaignId: string) => {
      socket.join(campaignId);
    });
    // A global firehose room for dashboards / live monitor.
    socket.join("global");
  });
  return io;
}
