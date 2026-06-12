import { NextResponse } from "next/server";
import { runAssistant, getOrCreateSession, saveSession, type SessionMessage } from "@xenopilot/ai-engine";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
  const body = (await req.json()) as {
    message?: string;
    sessionId?: string;
    pageContext?: { page?: string; customerId?: string; campaignId?: string; audienceId?: string };
    clearHistory?: boolean;
  };

  if (!body.message?.trim()) {
    return NextResponse.json({ error: "message required" }, { status: 400 });
  }

  const session = await getOrCreateSession(body.sessionId);
  const history: SessionMessage[] = body.clearHistory ? [] : session.messages;

  session.messages.push({ role: "user", content: body.message, timestamp: new Date().toISOString() });

  const result = await runAssistant(body.message, history, body.pageContext ?? {});

  session.messages.push({
    role: "assistant",
    content: result.reply,
    timestamp: new Date().toISOString()
  });
  await saveSession(session.id, session.messages, { ...session.context, turnCount: session.context.turnCount + 1 });

  return NextResponse.json({ ...result, sessionId: session.id });
  } catch (e: unknown) {
    console.error("Assistant error:", e);
    const msg = e instanceof Error ? e.message : "Assistant error";
    return NextResponse.json({ error: msg, reply: "Sorry, something went wrong. Please try again." }, { status: 500 });
  }
}
