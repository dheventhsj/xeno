/**
 * AI Message Preview — channel-specific formatted previews
 */
import type { Channel } from "@xenopilot/database";

export type ChannelPreview = {
  channel: Channel;
  subject?: string;
  body: string;
  characterCount: number;
  variant: "A" | "B" | "C";
};

export async function buildChannelPreviews(
  goal: string,
  channel: Channel,
  variants?: { a: string; b: string; c: string; subject?: string },
  customerName = "Sarah",
  tone = "friendly",
  category = "skincare"
): Promise<Record<Channel, ChannelPreview>> {
  const { generateMessages } = await import("./index");
  const toneKey = tone === "luxury" ? "premium" : tone === "friendly" ? "emotional" : tone;
  const channels: Channel[] = ["EMAIL", "SMS", "WHATSAPP", "RCS"];
  const result = {} as Record<Channel, ChannelPreview>;
  const firstName = customerName.split(" ")[0]!;

  for (const ch of channels) {
    const generated = generateMessages(goal, ch, toneKey);
    let body = variants?.a ?? generated.variantA;
    let subject = variants?.subject ?? generated.subject;

    if (ch === "EMAIL") {
      subject = tone === "luxury"
        ? `An Exclusive Invitation for ${firstName}`
        : (subject ?? "Exclusive Offer for Premium Customers");
      body = `Hi ${firstName},\n\nWe noticed you love ${category} products.\nEnjoy 15% off on our latest collection.\n\n${body.replace(/\{\{name\}\}/g, firstName)}`;
      subject = subject.replace(/\{\{name\}\}/g, firstName);
    } else if (ch === "SMS") {
      body = `Hi ${firstName}! Enjoy 15% off on ${category}. ${body.replace(/\{\{name\}\}/g, firstName).slice(0, 80)}`;
    } else {
      body = body.replace(/\{\{name\}\}/g, firstName);
    }

    if (ch === "WHATSAPP" && !body.includes("*")) {
      body = `*Hi ${firstName}!* 👋\n\nWe noticed you love *${category}* products.\nEnjoy *15% off* on our latest collection.\n\n${body}\n\n_Tap to shop now →_`;
    }
    if (ch === "RCS") {
      body = `📱 ${firstName}, your ${category} picks are ready!\n\n✨ 15% off exclusive offer\n\n${body}\n\n┌─────────────────────┐\n│  View Collection    │\n│  Shop Now →         │\n└─────────────────────┘`;
    }

    result[ch] = {
      channel: ch,
      subject: ch === "EMAIL" ? subject : undefined,
      body,
      characterCount: body.length,
      variant: "A",
    };
  }
  return result;
}

export async function regenerateMessagePreview(
  goal: string,
  channel: Channel,
  variant: "A" | "B" | "C" = "A",
  tone = "friendly",
  customerName = "Sarah",
  category = "skincare"
) {
  const all = await buildChannelPreviews(goal, channel, undefined, customerName, tone, category);
  const preview = all[channel];
  return {
    body: preview.body,
    subject: preview.subject,
    tone,
    variant,
  };
}
