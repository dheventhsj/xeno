import { NextResponse } from "next/server";
import { buildChannelPreviews, regenerateMessagePreview } from "@xenopilot/ai-engine";
import type { Channel } from "@xenopilot/database";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.json();
  const { goal, variants, customerName, channel, regenerate, tone, category, allChannels } = body as {
    goal: string;
    variants?: { a: string; b: string; c: string };
    customerName?: string;
    channel?: Channel;
    regenerate?: boolean;
    tone?: string;
    category?: string;
    allChannels?: boolean;
  };

  if (!goal?.trim()) return NextResponse.json({ error: "goal required" }, { status: 400 });

  const toneVal = tone ?? "friendly";
  const name = customerName ?? "Sarah";
  const cat = category ?? "skincare";

  if (regenerate && allChannels) {
    const previews = await buildChannelPreviews(goal, "EMAIL", variants, name, toneVal, cat);
    const flat: Record<string, { subject?: string; body: string; tone?: string }> = {};
    for (const [ch, p] of Object.entries(previews)) {
      flat[ch] = { subject: p.subject, body: p.body, tone: toneVal };
    }
    return NextResponse.json({ previews: flat });
  }

  if (regenerate && channel) {
    const single = await regenerateMessagePreview(goal, channel, "A", toneVal, name, cat);
    return NextResponse.json({ previews: { [channel]: { subject: single.subject, body: single.body, tone: toneVal } } });
  }

  const previews = await buildChannelPreviews(
    goal,
    (channel as Channel) ?? "EMAIL",
    variants ? { a: variants.a, b: variants.b, c: variants.c } : undefined,
    name,
    toneVal,
    cat
  );

  const flat: Record<string, { subject?: string; body: string; tone?: string }> = {};
  for (const [ch, p] of Object.entries(previews)) {
    flat[ch] = { subject: p.subject, body: p.body, tone: toneVal };
  }
  return NextResponse.json({ previews: flat });
}
