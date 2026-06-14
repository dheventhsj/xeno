import { NextResponse } from "next/server";
import { prisma } from "@xenopilot/database";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "50", 10));
  const q = (searchParams.get("q") ?? "").trim();
  const sortBy = searchParams.get("sort") ?? "ltvScore";
  const sortDir = searchParams.get("dir") === "asc" ? "asc" as const : "desc" as const;

  const match = q ? { contains: q, mode: "insensitive" as const } : null;

  const where = match
    ? {
        OR: [
          { name: match },
          { email: match },
          { city: match },
          { phone: match },
          { preferredCategory: match },
          { preferredChannel: match },
        ],
      }
    : {};

  const validSorts = ["name", "city", "preferredCategory", "ltvScore", "churnScore", "totalSpend", "engagementScore", "lastOrderDate", "createdAt"];
  const orderField = validSorts.includes(sortBy) ? sortBy : "ltvScore";

  const [items, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      orderBy: { [orderField]: sortDir },
      skip: (page - 1) * limit,
      take: limit
    }),
    prisma.customer.count({ where })
  ]);

  return NextResponse.json({ items, total, page });
}
