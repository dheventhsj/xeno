import { NextResponse } from "next/server";
import { after } from "next/server";
import { seedDatabase } from "@xenopilot/database/seed";
import { requireSeedAuth } from "@/lib/seed-auth";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: Request) {
  const denied = requireSeedAuth(req);
  if (denied) return denied;
  const { customers = 2000 } = (await req.json().catch(() => ({}))) as { customers?: number };
  const cap = process.env.NODE_ENV === "production" ? 2000 : 10000;
  const count = Math.min(customers, cap);

  if (process.env.NODE_ENV === "production") {
    after(async () => {
      try {
        await seedDatabase(count);
      } catch (e) {
        console.error("background seed failed", e);
      }
    });
    return NextResponse.json({ status: "started", targetCustomers: count });
  }

  try {
    const result = await seedDatabase(count);
    return NextResponse.json({ status: "completed", ...result });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Seed failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
