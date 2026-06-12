/**
 * Customer lookup by name — "who is diya", "tell me about priya", etc.
 */
import { prisma } from "@xenopilot/database";
import { buildCustomerTwin } from "./customer-twin";

const LOOKUP_PATTERNS = [
  /(?:who is|who'?s)\s+(?!my\s+(?:top|best|vip|highest))([a-z][a-z\s'-]{0,40})/i,
  /(?:tell me about|about|details (?:of|for|on)|profile (?:of|for)|lookup|find|search for|show me)\s+(?:customer\s+)?([a-z][a-z\s'-]{0,40})/i,
  /(?:customer|shopper|buyer)\s+(?:named|called)\s+([a-z][a-z\s'-]{0,40})/i,
  /^([a-z][a-z\s'-]{1,30})\s+(?:profile|details|info)$/i
];

const STOP_NAMES = new Set([
  "my", "the", "our", "top", "best", "vip", "high", "churn", "at", "risk",
  "customer", "customers", "shopper", "shoppers", "campaign", "audience"
]);

export function extractCustomerSearchTerm(message: string): string | null {
  const trimmed = message.trim();
  if (/who are (?:my )?(?:top|best|vip|highest)/i.test(trimmed)) return null;
  if (/how many|how much|campaign|audience|churn|dormant|revenue|insight/i.test(trimmed) && !/who is|tell me about|profile/i.test(trimmed)) {
    return null;
  }

  for (const re of LOOKUP_PATTERNS) {
    const m = trimmed.match(re);
    if (!m?.[1]) continue;
    const term = m[1].trim().replace(/[?.!]+$/, "");
    const firstWord = term.split(/\s+/)[0]?.toLowerCase();
    if (!firstWord || STOP_NAMES.has(firstWord) || term.length < 2) continue;
    return term;
  }
  return null;
}

function formatProfile(c: Awaited<ReturnType<typeof fetchCustomerByTerm>>[0]): string {
  if (!c) return "";

  const twin = buildCustomerTwin({
    name: c.name,
    totalSpend: c.totalSpend,
    orderCount: c.orderCount,
    churnScore: c.churnScore,
    ltvScore: c.ltvScore,
    engagementScore: c.engagementScore,
    purchaseProb: c.purchaseProb,
    daysSinceOrder: c.daysSinceOrder,
    preferredCategory: c.preferredCategory,
    preferredChannel: c.preferredChannel,
    city: c.city,
    orders: c.orders.map(o => ({ amount: o.amount, category: o.category, date: o.createdAt })),
    communications: c.communications.map(comm => ({
      channel: comm.channel,
      status: comm.status,
      date: comm.createdAt
    }))
  });

  const risk =
    c.churnScore >= 0.75 ? "Critical" :
    c.churnScore >= 0.5 ? "High" :
    c.churnScore >= 0.3 ? "Medium" : "Low";

  let reply = `**Customer Profile: ${c.name}**\n\n`;
  reply += `**Contact**\n`;
  reply += `• Email: ${c.email}\n`;
  if (c.phone) reply += `• Phone: ${c.phone}\n`;
  if (c.city) reply += `• City: ${c.city}\n`;
  reply += `\n**AI Scores**\n`;
  reply += `• Churn risk: **${Math.round(c.churnScore * 100)}%** (${risk})\n`;
  reply += `• LTV score: **₹${Math.round(c.ltvScore).toLocaleString("en-IN")}**\n`;
  reply += `• Engagement: **${Math.round(c.engagementScore)}/100**\n`;
  reply += `• Purchase probability: **${Math.round(c.purchaseProb * 100)}%**\n`;
  reply += `• Total spend: **₹${Math.round(c.totalSpend).toLocaleString("en-IN")}** (${c.orderCount} orders)\n`;
  reply += `• Days since last order: **${c.daysSinceOrder}**\n`;
  reply += `\n**Preferences**\n`;
  reply += `• Category: ${c.preferredCategory}\n`;
  reply += `• Best channel: ${c.preferredChannel}\n`;
  reply += `\n**Customer DNA:** ${twin.dna.tags.join(" · ")}\n`;
  reply += `\n**AI Summary:** ${twin.aiSummary}\n`;

  if (c.orders.length > 0) {
    reply += `\n**Recent Orders**\n`;
    for (const o of c.orders) {
      reply += `• ${o.category} — ₹${Math.round(o.amount).toLocaleString("en-IN")} (${new Date(o.createdAt).toLocaleDateString()})\n`;
    }
  }

  if (c.communications.length > 0) {
    reply += `\n**Recent Campaigns**\n`;
    for (const comm of c.communications) {
      reply += `• ${comm.campaign?.goal?.slice(0, 40) ?? "Campaign"} via ${comm.channel} — ${comm.status}\n`;
    }
  }

  reply += `\n_View full profile in Customers → ${c.name}_`;
  return reply;
}

async function fetchCustomerByTerm(term: string) {
  const variants = [
    term,
    term.charAt(0).toUpperCase() + term.slice(1).toLowerCase(),
    term.toLowerCase(),
    term.toUpperCase()
  ];

  const seen = new Set<string>();
  const results = [];

  for (const v of variants) {
    const batch = await prisma.customer.findMany({
      where: {
        OR: [
          { name: { contains: v } },
          { email: { contains: v.toLowerCase() } }
        ]
      },
      take: 5,
      include: {
        orders: { orderBy: { createdAt: "desc" }, take: 3 },
        communications: {
          orderBy: { createdAt: "desc" },
          take: 3,
          include: { campaign: { select: { goal: true } } }
        }
      }
    });
    for (const c of batch) {
      if (!seen.has(c.id)) {
        seen.add(c.id);
        results.push(c);
      }
    }
  }

  // Prefer exact first-name match (e.g. "Diya" in "Diya Sharma")
  const termLower = term.toLowerCase();
  results.sort((a, b) => {
    const aFirst = a.name.toLowerCase().split(/\s+/)[0];
    const bFirst = b.name.toLowerCase().split(/\s+/)[0];
    if (aFirst === termLower && bFirst !== termLower) return -1;
    if (bFirst === termLower && aFirst !== termLower) return 1;
    return b.ltvScore - a.ltvScore;
  });

  return results;
}

export async function lookupCustomerByQuery(message: string): Promise<{ reply: string; count: number } | null> {
  const term = extractCustomerSearchTerm(message);
  if (!term) return null;

  const matches = await fetchCustomerByTerm(term);
  if (matches.length === 0) {
    return {
      reply: `No customer found matching **"${term}"**.\n\nTry the full name, or browse **Customers** in the sidebar.`,
      count: 0
    };
  }

  if (matches.length === 1) {
    return { reply: formatProfile(matches[0]), count: 1 };
  }

  // Multiple matches — full profile for best match + list others
  const primary = matches[0]!;
  let reply = formatProfile(primary);
  if (matches.length > 1) {
    reply += `\n\n---\n**Also found ${matches.length - 1} other customer${matches.length > 2 ? "s" : ""} matching "${term}":**\n`;
    for (const c of matches.slice(1, 5)) {
      reply += `• **${c.name}** (${c.city ?? "N/A"}) — LTV ₹${Math.round(c.ltvScore).toLocaleString("en-IN")} · Churn ${Math.round(c.churnScore * 100)}%\n`;
    }
    reply += `\nAsk **"who is ${matches[1]!.name.toLowerCase()}"** for another full profile.`;
  }
  return { reply, count: matches.length };
}
