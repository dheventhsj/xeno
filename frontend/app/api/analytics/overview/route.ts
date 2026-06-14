import { NextResponse } from "next/server";
import { prisma } from "@xenopilot/database";
import { getOverview } from "@xenopilot/analytics";

export const runtime = "nodejs";

export async function GET() {
  try {
    return NextResponse.json(await getOverview());
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("overview error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
