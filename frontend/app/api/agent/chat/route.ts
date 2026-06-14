import { NextResponse } from "next/server";
import { orchestrate } from "@xenopilot/ai-engine";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { message, sessionId } = (await req.json()) as { message?: string; sessionId?: string };
  if (!message?.trim()) return NextResponse.json({ error: "message required" }, { status: 400 });
  try {
    const result = await orchestrate(message, sessionId);
    return NextResponse.json(result);
  } catch (e: any) {
    console.error("Agent error:", e);
    return NextResponse.json({ error: e.message ?? "Agent error" }, { status: 500 });
  }
}
