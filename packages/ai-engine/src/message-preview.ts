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
  customerName = "Sarah"
): Promise<Record<Channel, ChannelPreview>> {
  const { generateMessages } = await import("./index");
  const channels: Channel[] = ["EMAIL", "SMS", "WHATSAPP", "RCS"];
  const result = {} as Record<Channel, ChannelPreview>;

  for (const ch of channels) {
    const generated = generateMessages(goal, ch);
    const variantKey = "A" as const;
    let body = variants?.a ?? generated.variantA;
    let subject = variants?.subject ?? generated.subject;

    if (ch === "EMAIL") {
      body = (variants?.a ?? generated.variantA).replace(/\{\{name\}\}/g, customerName);
      subject = (subject ?? `Exclusive Offer for Premium Customers`).replace(/\{\{name\}\}/g, customerName);
    } else if (ch === "SMS") {
      body = (variants?.a ?? generated.variantA).replace(/\{\{name\}\}/g, customerName.split(" ")[0]!);
    } else {
      body = (variants?.a ?? generated.variantA).replace(/\{\{name\}\}/g, customerName);
    }

    if (ch === "WHATSAPP" && !body.includes("*")) {
      body = `*Hi ${customerName.split(" ")[0]}!* 👋\n\n${body}\n\n_Tap to shop now →_`;
    }
    if (ch === "RCS") {
      body = `📱 ${body}\n\n[ View Collection ] [ Shop Now ]`;
    }

    result[ch] = {
      channel: ch,
      subject: ch === "EMAIL" ? subject : undefined,
      body,
      characterCount: body.length,
      variant: variantKey
    };
  }
  return result;
}

export async function regenerateMessagePreview(
  goal: string,
  channel: Channel,
  variant: "A" | "B" | "C" = "A",
  tone?: string
) {
  const { generateMessages } = await import("./index");
  const generated = generateMessages(goal, channel, tone ?? "emotional");
  const key = variant === "A" ? "variantA" : variant === "B" ? "variantB" : "variantC";
  return {
    body: generated[key],
    subject: generated.subject,
    tone: generated.tone,
    variant
  };
}
