import { NextResponse } from "next/server";
import { findLookalikes } from "@xenopilot/ai-engine";
import { prisma } from "@xenopilot/database";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { seedIds, expansionFactor } = (await req.json()) as { seedIds?: string[]; expansionFactor?: number };

  let ids = seedIds;
  if (!ids?.length) {
    const top = await prisma.customer.findMany({
      orderBy: { ltvScore: "desc" },
      take: 10,
      select: { id: true }
    });
    ids = top.map(c => c.id);
  }

  const result = await findLookalikes(ids, expansionFactor ?? 2.5, 200);
  return NextResponse.json(result);
}
