import { NextResponse } from "next/server";
import { analyzeCustomer } from "@xenopilot/ai-engine";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const result = await analyzeCustomer(id);
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 404 });
  }
}
