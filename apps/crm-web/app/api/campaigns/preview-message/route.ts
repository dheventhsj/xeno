import { NextResponse } from "next/server";
import { buildChannelPreviews, regenerateMessagePreview } from "@xenopilot/ai-engine";
import type { Channel } from "@xenopilot/database";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.json();
  const { goal, variants, customerName, channel, regenerate } = body as {
    goal: string;
    variants?: { a: string; b: string; c: string };
    customerName?: string;
    channel?: Channel;
    regenerate?: boolean;
  };

  if (!goal?.trim()) return NextResponse.json({ error: "goal required" }, { status: 400 });

  if (regenerate && channel) {
    const single = await regenerateMessagePreview(goal, channel);
    return NextResponse.json({ previews: { [channel]: { subject: single.subject, body: single.body } } });
  }

  const previews = await buildChannelPreviews(
    goal,
    (channel as Channel) ?? "EMAIL",
    variants ? { a: variants.a, b: variants.b, c: variants.c } : undefined,
    customerName ?? "Sarah"
  );

  const flat: Record<string, { subject?: string; body: string }> = {};
  for (const [ch, p] of Object.entries(previews)) {
    flat[ch] = { subject: p.subject, body: p.body };
  }
  return NextResponse.json({ previews: flat });
}
