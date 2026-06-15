import { NextResponse } from "next/server";
import { prisma } from "@xenopilot/database";

export const runtime = "nodejs";

export async function GET() {
  const [cities, categories] = await Promise.all([
    prisma.customer.groupBy({
      by: ["city"],
      where: { city: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    }),
    prisma.customer.groupBy({
      by: ["preferredCategory"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    }),
  ]);

  return NextResponse.json({
    cities: cities
      .filter(c => c.city)
      .map(c => ({ name: c.city!, count: c._count.id })),
    categories: categories.map(c => ({
      name: c.preferredCategory,
      count: c._count.id,
    })),
  });
}
