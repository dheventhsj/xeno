import { NextResponse } from "next/server";
import { orchestrate } from "@xenopilot/ai-engine";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const message = searchParams.get("message");
  const sessionId = searchParams.get("sessionId");

  if (!message?.trim()) return new NextResponse("Message required", { status: 400 });

  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  const encoder = new TextEncoder();

  const send = (data: any) => {
    writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
  };

  orchestrate(message, sessionId ?? undefined, (msg) => {
    send(msg);
  }).then((result) => {
    send({ type: "done", result });
    writer.close();
  }).catch((err) => {
    send({ type: "error", error: err.message });
    writer.close();
  });

  return new NextResponse(stream.readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive"
    }
  });
}
