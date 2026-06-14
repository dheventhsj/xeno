import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"]
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export * from "@prisma/client";

export type Channel = "WHATSAPP" | "SMS" | "EMAIL" | "RCS";
export type CampaignStatus = "DRAFT" | "SCHEDULED" | "QUEUED" | "RUNNING" | "PAUSED" | "DELIVERED" | "COMPLETED" | "FAILED";
export type CommunicationStatus = "QUEUED" | "SENT" | "DELIVERED" | "FAILED" | "OPENED" | "READ" | "CLICKED" | "CONVERTED";
export type EventType = "SENT" | "DELIVERED" | "FAILED" | "OPENED" | "READ" | "CLICKED" | "CONVERTED";

export const CampaignStatus = {
  DRAFT: "DRAFT",
  SCHEDULED: "SCHEDULED",
  QUEUED: "QUEUED",
  RUNNING: "RUNNING",
  PAUSED: "PAUSED",
  DELIVERED: "DELIVERED",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED"
} as const;

export const CommunicationStatus = {
  QUEUED: "QUEUED",
  SENT: "SENT",
  DELIVERED: "DELIVERED",
  FAILED: "FAILED",
  OPENED: "OPENED",
  READ: "READ",
  CLICKED: "CLICKED",
  CONVERTED: "CONVERTED"
} as const;

export const EventType = {
  SENT: "SENT",
  DELIVERED: "DELIVERED",
  FAILED: "FAILED",
  OPENED: "OPENED",
  READ: "READ",
  CLICKED: "CLICKED",
  CONVERTED: "CONVERTED"
} as const;
