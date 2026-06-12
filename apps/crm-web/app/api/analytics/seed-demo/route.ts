import { NextResponse } from "next/server";
import { seedDemoCampaigns } from "@xenopilot/database/seed-campaigns";
import { syncAllCampaignAnalytics } from "@xenopilot/analytics/sync-analytics";
import { getOverview } from "@xenopilot/analytics";

export const runtime = "nodejs";

/** Populate demo campaign analytics + refresh overview */
export async function POST() {
  try {
    await seedDemoCampaigns();
    await syncAllCampaignAnalytics();
    const overview = await getOverview();
    return NextResponse.json({ ok: true, overview });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Seed failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
