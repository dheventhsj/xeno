/**
 * RAG Retriever — gather live CRM context for AI answers
 */
import { prisma } from "@xenopilot/database";
import { retrieveMarketingMemory } from "./marketing-memory";
import { scanOpportunities } from "./opportunity-radar";

export type PageContext = {
  page?: string;
  customerId?: string;
  campaignId?: string;
  audienceId?: string;
};

export type RagContext = {
  snippets: { source: string; text: string }[];
  memories: string[];
  pageContext: string;
};

export async function buildRagContext(query: string, pageCtx: PageContext = {}): Promise<RagContext> {
  const snippets: RagContext["snippets"] = [];

  // Page-specific context
  let pageContext = "";
  if (pageCtx.customerId) {
    const c = await prisma.customer.findUnique({ where: { id: pageCtx.customerId } });
    if (c) {
      pageContext = `Viewing customer: ${c.name}, LTV ₹${Math.round(c.ltvScore)}, churn ${Math.round(c.churnScore * 100)}%, ${c.preferredCategory}, ${c.city ?? "N/A"}`;
      snippets.push({ source: "customer", text: pageContext });
    }
  }
  if (pageCtx.campaignId) {
    const camp = await prisma.campaign.findUnique({
      where: { id: pageCtx.campaignId },
      include: { analytics: true, segment: true }
    });
    if (camp) {
      pageContext = `Viewing campaign: "${camp.goal}" via ${camp.recommendedChannel}, status ${camp.status}, ${camp.totalRecipients} recipients`;
      if (camp.analytics) {
        pageContext += `, ${camp.analytics.converted} conversions, ₹${Math.round(camp.analytics.revenue)} revenue`;
      }
      snippets.push({ source: "campaign", text: pageContext });
    }
  }
  if (pageCtx.audienceId) {
    const seg = await prisma.segment.findUnique({ where: { id: pageCtx.audienceId } });
    if (seg) {
      pageContext = `Viewing audience: "${seg.name}" — ${seg.customerCount} customers, reasoning: ${seg.aiReasoning}`;
      snippets.push({ source: "audience", text: pageContext });
    }
  }

  // Query-relevant live data
  const lower = query.toLowerCase();

  if (/(customer|churn|dormant|vip|shopper|buyer)/.test(lower)) {
    const [total, atRisk, dormant, vip] = await Promise.all([
      prisma.customer.count(),
      prisma.customer.count({ where: { churnScore: { gte: 0.6 } } }),
      prisma.customer.count({ where: { daysSinceOrder: { gte: 45 } } }),
      prisma.customer.count({ where: { ltvScore: { gte: 20000 } } })
    ]);
    snippets.push({
      source: "customers",
      text: `${total} total customers, ${atRisk} at-risk (churn≥60%), ${dormant} dormant (45d+), ${vip} VIP (LTV≥₹20k)`
    });
  }

  if (/(campaign|performance|revenue|conversion|underperform)/.test(lower)) {
    const campaigns = await prisma.campaign.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { analytics: true }
    });
    for (const c of campaigns) {
      snippets.push({
        source: "campaigns",
        text: `"${c.goal.slice(0, 60)}" — ${c.status}, ${c.recommendedChannel}, conv: ${c.analytics?.converted ?? 0}, rev: ₹${Math.round(c.analytics?.revenue ?? 0)}`
      });
    }
  }

  if (/(channel|whatsapp|sms|email|rcs)/.test(lower)) {
    const byChannel = await prisma.communication.groupBy({
      by: ["channel"],
      _count: { id: true },
      where: { status: { in: ["DELIVERED", "OPENED", "READ", "CLICKED", "CONVERTED"] } }
    });
    snippets.push({
      source: "channels",
      text: byChannel.map(c => `${c.channel}: ${c._count.id} delivered+`).join(", ")
    });
  }

  if (/(target|next|recommend|opportunity|should i)/.test(lower)) {
    const opps = await scanOpportunities();
    snippets.push({
      source: "opportunities",
      text: opps.slice(0, 3).map(o => `${o.title}: ${o.count} customers, ₹${o.revenueOpportunity} opportunity`).join("; ")
    });
  }

  const memories = (await retrieveMarketingMemory(query, 4)).map(m => m.insight);

  return { snippets, memories, pageContext };
}

export function formatRagForPrompt(ctx: RagContext): string {
  const parts: string[] = [];
  if (ctx.pageContext) parts.push(`Current page context: ${ctx.pageContext}`);
  if (ctx.snippets.length) {
    parts.push("Live CRM data:\n" + ctx.snippets.map(s => `[${s.source}] ${s.text}`).join("\n"));
  }
  if (ctx.memories.length) {
    parts.push("Marketing memory (learned from past campaigns):\n" + ctx.memories.map(m => `• ${m}`).join("\n"));
  }
  return parts.join("\n\n");
}
