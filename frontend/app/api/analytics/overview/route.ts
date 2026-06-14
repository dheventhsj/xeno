import { NextResponse } from "next/server";
import { prisma } from "@xenopilot/database";
import { getOverview } from "@xenopilot/analytics";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(await getOverview());
}
