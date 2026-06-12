import { NextResponse } from "next/server";
import { scanOpportunities } from "@xenopilot/ai-engine";

export const runtime = "nodejs";

export async function GET() {
  const opportunities = await scanOpportunities();
  return NextResponse.json(opportunities);
}
