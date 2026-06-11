import { NextResponse } from "next/server";
import { prisma } from "@xenopilot/database";
import { generateAudience } from "@xenopilot/ai-engine";

export const runtime = "nodejs";

export async function GET() {
  const segments = await prisma.segment.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { _count: { select: { campaigns: true } } }
  });
  return NextResponse.json(segments);
}

export async function POST(req: Request) {
  const { prompt } = (await req.json()) as { prompt?: string };
  if (!prompt?.trim()) return NextResponse.json({ error: "prompt required" }, { status: 400 });

  const audience = await generateAudience(prompt);

  const segment = await prisma.segment.create({
    data: {
      name: audience.name,
      description: prompt,
      aiReasoning: JSON.stringify(audience.reasoning),
      segmentDefinition: JSON.stringify(audience.definition),
      customerCount: audience.count,
      revenuePotential: audience.revenuePotential,
      churnRisk: audience.churnRisk,
      demographics: JSON.stringify(audience.demographics)
    }
  });

  return NextResponse.json({
    ...segment,
    demographics: audience.demographics,
    parseSource: audience.parseSource,
    appliedFilters: audience.definition
  });
}
