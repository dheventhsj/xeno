import { NextResponse } from "next/server";
import { seedDatabase } from "@xenopilot/database/seed";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: Request) {
  const { customers = 2000 } = (await req.json().catch(() => ({}))) as { customers?: number };
  const result = await seedDatabase(Math.min(customers, 10000));
  return NextResponse.json(result);
}
