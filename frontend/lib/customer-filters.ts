import type { Prisma } from "@xenopilot/database";

export type CustomerStatusFilter = "all" | "healthy" | "elevated" | "high" | "dormant";
export type LtvRangeFilter = "all" | "low" | "mid" | "high";

export const STATUS_OPTIONS: { value: CustomerStatusFilter; label: string }[] = [
  { value: "all", label: "All Statuses" },
  { value: "healthy", label: "Healthy" },
  { value: "elevated", label: "Elevated Risk" },
  { value: "high", label: "High Risk" },
  { value: "dormant", label: "Dormant (45+ days)" },
];

export const LTV_RANGE_OPTIONS: { value: LtvRangeFilter; label: string }[] = [
  { value: "all", label: "All LTV Ranges" },
  { value: "low", label: "LTV under ₹50K" },
  { value: "mid", label: "LTV ₹50K – ₹2L" },
  { value: "high", label: "LTV above ₹2L" },
];

export const SORT_OPTIONS: { value: string; label: string; dir: "asc" | "desc" }[] = [
  { value: "ltvScore:desc", label: "LTV — highest first", dir: "desc" },
  { value: "ltvScore:asc", label: "LTV — lowest first", dir: "asc" },
  { value: "churnScore:desc", label: "Churn risk — highest first", dir: "desc" },
  { value: "churnScore:asc", label: "Churn risk — lowest first", dir: "asc" },
  { value: "engagementScore:desc", label: "Engagement — highest first", dir: "desc" },
  { value: "lastOrderDate:desc", label: "Last order — newest first", dir: "desc" },
  { value: "lastOrderDate:asc", label: "Last order — oldest first", dir: "asc" },
  { value: "name:asc", label: "Name — A to Z", dir: "asc" },
  { value: "name:desc", label: "Name — Z to A", dir: "desc" },
];

export function buildCustomerWhere(params: {
  q?: string;
  status?: string | null;
  city?: string | null;
  category?: string | null;
  ltvRange?: string | null;
}): Prisma.CustomerWhereInput {
  const and: Prisma.CustomerWhereInput[] = [];
  const q = params.q?.trim();

  if (q) {
    and.push({
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { city: { contains: q, mode: "insensitive" } },
        { phone: { contains: q, mode: "insensitive" } },
        { preferredCategory: { contains: q, mode: "insensitive" } },
        { preferredChannel: { contains: q, mode: "insensitive" } },
      ],
    });
  }

  switch (params.status) {
    case "healthy":
      and.push({ churnScore: { lt: 0.4 } });
      break;
    case "elevated":
      and.push({ churnScore: { gte: 0.4, lt: 0.7 } });
      break;
    case "high":
      and.push({ churnScore: { gte: 0.7 } });
      break;
    case "dormant":
      and.push({ daysSinceOrder: { gte: 45 } });
      break;
  }

  if (params.city && params.city !== "all") {
    and.push({ city: { equals: params.city, mode: "insensitive" } });
  }

  if (params.category && params.category !== "all") {
    and.push({ preferredCategory: { equals: params.category, mode: "insensitive" } });
  }

  switch (params.ltvRange) {
    case "low":
      and.push({ ltvScore: { lt: 50_000 } });
      break;
    case "mid":
      and.push({ ltvScore: { gte: 50_000, lt: 200_000 } });
      break;
    case "high":
      and.push({ ltvScore: { gte: 200_000 } });
      break;
  }

  return and.length ? { AND: and } : {};
}

export function parseSortParams(sortBy: string, sortDir: string) {
  const validSorts = [
    "name", "city", "preferredCategory", "ltvScore", "churnScore",
    "totalSpend", "engagementScore", "lastOrderDate", "createdAt",
  ];
  const orderField = validSorts.includes(sortBy) ? sortBy : "ltvScore";
  const orderDir = sortDir === "asc" ? "asc" as const : "desc" as const;
  return { orderField, orderDir };
}

export function filtersToSearchParams(filters: {
  q?: string;
  status?: string;
  city?: string;
  category?: string;
  ltvRange?: string;
  sort?: string;
  dir?: string;
  page?: number;
  limit?: number;
}) {
  const params = new URLSearchParams();
  if (filters.q?.trim()) params.set("q", filters.q.trim());
  if (filters.status && filters.status !== "all") params.set("status", filters.status);
  if (filters.city && filters.city !== "all") params.set("city", filters.city);
  if (filters.category && filters.category !== "all") params.set("category", filters.category);
  if (filters.ltvRange && filters.ltvRange !== "all") params.set("ltvRange", filters.ltvRange);
  if (filters.sort) params.set("sort", filters.sort);
  if (filters.dir) params.set("dir", filters.dir);
  if (filters.page) params.set("page", String(filters.page));
  if (filters.limit) params.set("limit", String(filters.limit));
  return params;
}
