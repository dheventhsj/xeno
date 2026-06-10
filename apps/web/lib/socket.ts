import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

function resolveSocketUrl(): string {
  if (process.env.NEXT_PUBLIC_CRM_SOCKET_URL) return process.env.NEXT_PUBLIC_CRM_SOCKET_URL;
  if (typeof window !== "undefined") return `http://${window.location.hostname}:4000`;
  return "http://localhost:4000";
}

export function getSocket() {
  if (socket) return socket;
  socket = io(resolveSocketUrl(), { transports: ["websocket"] });
  return socket;
}
