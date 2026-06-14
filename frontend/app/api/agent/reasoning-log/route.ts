import { NextResponse } from "next/server";
import { persistReasoningLog, getRecentReasoningLogs } from "@xenopilot/ai-engine";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(50, parseInt(searchParams.get("limit") ?? "10", 10));
  const logs = await getRecentReasoningLogs(limit);
  return NextResponse.json({ logs });
}

export async function POST(req: Request) {
  const { goal, steps, durationMs, sessionId } = await req.json();
  if (!goal || !steps) return NextResponse.json({ error: "goal and steps required" }, { status: 400 });
  const log = await persistReasoningLog(goal, steps, durationMs ?? 0, sessionId);
  return NextResponse.json({ ok: true, logId: log?.id });
}
