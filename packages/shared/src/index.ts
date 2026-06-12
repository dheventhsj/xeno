import type { Channel, EventType } from "@xenopilot/database";

/** Channel simulation rates per master spec */
export const CHANNEL_RATES: Record<
  Channel,
  { delivered: number; readOrOpen: number; click: number; convert: number }
> = {
  WHATSAPP: { delivered: 0.98, readOrOpen: 0.85, click: 0.25, convert: 0.12 },
  SMS: { delivered: 0.95, readOrOpen: 0.6, click: 0.12, convert: 0.04 },
  EMAIL: { delivered: 0.9, readOrOpen: 0.45, click: 0.15, convert: 0.05 },
  RCS: { delivered: 0.96, readOrOpen: 0.78, click: 0.22, convert: 0.08 }
};

export const CATEGORIES = ["Skincare", "Beauty", "Fashion", "Coffee", "Electronics", "Fitness"] as const;

export type CampaignDraft = {
  goal: string;
  segment: {
    name: string;
    definition: Record<string, unknown>;
    count: number;
    reasoning: string[];
    revenuePotential: number;
    churnRisk: number;
  };
  channel: { recommended: Channel; confidence: number; rationale: string };
  messages: { variantA: string; variantB: string; variantC: string; subject?: string };
  forecast: {
    openRate: number;
    clickRate: number;
    conversionRate: number;
    revenue: number;
    intervals?: {
      openRate: { low: number; mid: number; high: number };
      clickRate: { low: number; mid: number; high: number };
      conversionRate: { low: number; mid: number; high: number };
      revenue: { low: number; mid: number; high: number };
    };
  };
  channelBattle?: {
    results: { channel: Channel; openRate: number; conversionRate: number; revenue: { mid: number }; roi: number; recommended: boolean }[];
    winner: Channel;
    rationale: string;
  };
};

export type ReceiptPayload = {
  communicationId: string;
  campaignId: string;
  customerId: string;
  eventType: EventType;
  eventId: string;
  timestamp: string;
  meta?: Record<string, unknown>;
};

export const FUNNEL_STAGES: EventType[] = ["SENT", "DELIVERED", "OPENED", "CLICKED", "CONVERTED"];
