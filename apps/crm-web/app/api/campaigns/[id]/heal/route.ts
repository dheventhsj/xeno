import { NextResponse } from "next/server";
import { applyHealing } from "@xenopilot/ai-engine";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { suggestionIndex } = (await req.json().catch(() => ({}))) as { suggestionIndex?: number };
  try {
    const result = await applyHealing(id, suggestionIndex ?? 0);
    return NextResponse.json({ ok: true, ...result });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Heal failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
