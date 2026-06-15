import { NextResponse } from "next/server";
import { prisma } from "@xenopilot/database";
import { buildCustomerWhere, parseSortParams } from "@/lib/customer-filters";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "50", 10));

  const where = buildCustomerWhere({
    q: searchParams.get("q") ?? undefined,
    status: searchParams.get("status"),
    city: searchParams.get("city"),
    category: searchParams.get("category"),
    ltvRange: searchParams.get("ltvRange"),
  });

  const { orderField, orderDir } = parseSortParams(
    searchParams.get("sort") ?? "ltvScore",
    searchParams.get("dir") ?? "desc"
  );

  const [items, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      orderBy: { [orderField]: orderDir },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.customer.count({ where }),
  ]);

  return NextResponse.json({ items, total, page });
}
