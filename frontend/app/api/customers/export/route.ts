import { NextResponse } from "next/server";
import { prisma } from "@xenopilot/database";

export const runtime = "nodejs";
export const maxDuration = 60;

const CSV_HEADERS = [
  "id",
  "name",
  "email",
  "phone",
  "city",
  "preferred_category",
  "preferred_channel",
  "total_spend",
  "order_count",
  "last_order_date",
  "churn_score",
  "ltv_score",
  "engagement_score",
  "purchase_prob",
  "avg_order_value",
  "days_since_order",
  "created_at",
  "updated_at",
] as const;

function escapeCsv(value: unknown): string {
  if (value == null) return "";
  const s = value instanceof Date ? value.toISOString() : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function buildWhere(q: string) {
  const match = q ? { contains: q, mode: "insensitive" as const } : null;
  if (!match) return {};
  return {
    OR: [
      { name: match },
      { email: match },
      { city: match },
      { phone: match },
      { preferredCategory: match },
      { preferredChannel: match },
    ],
  };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  const where = buildWhere(q);

  const customers = await prisma.customer.findMany({
    where,
    orderBy: { ltvScore: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      city: true,
      preferredCategory: true,
      preferredChannel: true,
      totalSpend: true,
      orderCount: true,
      lastOrderDate: true,
      churnScore: true,
      ltvScore: true,
      engagementScore: true,
      purchaseProb: true,
      avgOrderValue: true,
      daysSinceOrder: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const rows = [
    CSV_HEADERS.join(","),
    ...customers.map(c =>
      [
        c.id,
        c.name,
        c.email,
        c.phone,
        c.city,
        c.preferredCategory,
        c.preferredChannel,
        c.totalSpend,
        c.orderCount,
        c.lastOrderDate?.toISOString() ?? "",
        c.churnScore,
        c.ltvScore,
        c.engagementScore,
        c.purchaseProb,
        c.avgOrderValue,
        c.daysSinceOrder,
        c.createdAt.toISOString(),
        c.updatedAt.toISOString(),
      ].map(escapeCsv).join(",")
    ),
  ];

  const csv = rows.join("\r\n");
  const filename = `pulse-crm-customers-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
