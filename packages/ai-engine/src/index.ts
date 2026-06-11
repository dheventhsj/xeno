/**
 * AI Orchestrator — the brain of XenoPilot
 * Multi-step reasoning engine with intent classification, tool chaining,
 * session memory, and explainable decisions.
 */
import { prisma, Channel } from "@xenopilot/database";
import type { CampaignDraft } from "@xenopilot/shared";
import { CHANNEL_RATES } from "@xenopilot/shared";
import { filterToPrisma, parseAudiencePrompt } from "./audience";
import { parseAudiencePromptLLM } from "./llm-parser";
import { classifyIntent, type ClassifiedIntent } from "./intent-classifier";
import { startReasoning, addStep, finalizeReasoning, formatReasoningForDisplay, type ReasoningChain } from "./reasoning-engine";
import { getOrCreateSession, saveSession, updateContext, type SessionMessage } from "./session-manager";
import { forecastCampaign } from "./forecast-engine";
import { analyzeChurn } from "./churn-detector";

const DAY = 86400000;

// ─── Tool 1: Customer Analyzer ───────────────────────────────────────
export async function analyzeCustomer(customerId: string) {
  const c = await prisma.customer.findUnique({
    where: { id: customerId },
    include: {
      orders: { orderBy: { createdAt: "desc" }, take: 5 },
      communications: { orderBy: { createdAt: "desc" }, take: 5, include: { campaign: true } },
      timeline: { orderBy: { createdAt: "desc" }, take: 10 }
    }
  });
  if (!c) throw new Error("Customer not found");
  const daysSince = c.lastOrderDate ? Math.round((Date.now() - c.lastOrderDate.getTime()) / DAY) : 999;

  let riskLevel: "low" | "medium" | "high" | "critical" = "low";
  if (c.churnScore >= 0.75) riskLevel = "critical";
  else if (c.churnScore >= 0.5) riskLevel = "high";
  else if (c.churnScore >= 0.3) riskLevel = "medium";

  const predictedDate = daysSince < 30
    ? new Date(Date.now() + 14 * DAY).toISOString().slice(0, 10)
    : daysSince < 60
      ? new Date(Date.now() + 45 * DAY).toISOString().slice(0, 10)
      : new Date(Date.now() + 90 * DAY).toISOString().slice(0, 10);

  let summary = "";
  if (riskLevel === "critical") summary = "Critical churn risk — immediate win-back needed. High-LTV customer disengaging rapidly.";
  else if (riskLevel === "high") summary = "Elevated churn risk — proactive retention campaign recommended.";
  else if (c.ltvScore > 20000) summary = "High-LTV loyal customer — prioritize exclusive experiences and early access.";
  else if (c.engagementScore > 70) summary = "Highly engaged — excellent candidate for upsell and cross-sell campaigns.";
  else summary = "Standard engagement profile — nurture with personalized content.";

  return {
    customer: {
      id: c.id, name: c.name, email: c.email, phone: c.phone,
      city: c.city, category: c.preferredCategory, channel: c.preferredChannel
    },
    scores: {
      churnScore: c.churnScore,
      ltvScore: c.ltvScore,
      purchaseProbability: c.purchaseProb,
      engagementScore: c.engagementScore,
      riskLevel,
      daysSinceLastOrder: daysSince
    },
    predictedNextPurchase: predictedDate,
    summary,
    recentOrders: c.orders.map(o => ({ amount: o.amount, category: o.category, date: o.createdAt })),
    recentCampaigns: c.communications.map(comm => ({
      campaign: comm.campaign?.goal ?? "Unknown",
      channel: comm.channel,
      status: comm.status,
      date: comm.createdAt
    })),
    timeline: c.timeline.map(t => ({
      type: t.eventType, title: t.title, detail: t.detail, date: t.createdAt
    }))
  };
}

// ─── Tool 2: Audience Generator ──────────────────────────────────────
export async function generateAudience(prompt: string) {
  const llmParsed = await parseAudiencePromptLLM(prompt);
  const { filter, reasoning, name } = llmParsed ?? parseAudiencePrompt(prompt);
  const parseSource = llmParsed?.source ?? "heuristic";
  const where = filterToPrisma(filter);
  const [count, agg, byCity, byCategory, byChannel] = await Promise.all([
    prisma.customer.count({ where }),
    prisma.customer.aggregate({
      where,
      _avg: { totalSpend: true, churnScore: true, ltvScore: true, engagementScore: true, purchaseProb: true, avgOrderValue: true }
    }),
    prisma.customer.groupBy({ by: ["city"], where, _count: { id: true }, orderBy: { _count: { id: "desc" } }, take: 5 }),
    prisma.customer.groupBy({ by: ["preferredCategory"], where, _count: { id: true }, orderBy: { _count: { id: "desc" } }, take: 5 }),
    prisma.customer.groupBy({ by: ["preferredChannel"], where, _count: { id: true }, orderBy: { _count: { id: "desc" } }, take: 4 })
  ]);

  const avgSpend = agg._avg.totalSpend ?? 0;
  const avgAOV = agg._avg.avgOrderValue ?? 2500;

  return {
    name,
    definition: filter,
    count,
    reasoning,
    parseSource,
    prompt,
    revenuePotential: Math.round(count * avgAOV * 0.12),
    churnRisk: Math.round((agg._avg.churnScore ?? 0.5) * 100) / 100,
    demographics: {
      cities: byCity.map(c => ({ name: c.city ?? "Unknown", count: c._count.id })),
      categories: byCategory.map(c => ({ name: c.preferredCategory, count: c._count.id })),
      channels: byChannel.map(c => ({ name: c.preferredChannel, count: c._count.id })),
      avgSpend: Math.round(avgSpend),
      avgEngagement: Math.round(agg._avg.engagementScore ?? 0),
      avgChurn: Math.round((agg._avg.churnScore ?? 0) * 100) / 100,
      avgPurchaseProb: Math.round((agg._avg.purchaseProb ?? 0) * 100) / 100
    }
  };
}

// ─── Tool 3: Channel Strategist ──────────────────────────────────────
export async function recommendChannel(where: ReturnType<typeof filterToPrisma>) {
  const rows = await prisma.customer.groupBy({
    by: ["preferredChannel"],
    where,
    _count: { id: true }
  });
  let best: Channel = "WHATSAPP";
  let bestCount = 0;
  for (const r of rows) {
    if (r._count.id > bestCount) {
      bestCount = r._count.id;
      best = r.preferredChannel as Channel;
    }
  }
  const total = rows.reduce((s, r) => s + r._count.id, 0);
  const pct = total > 0 ? Math.round((bestCount / total) * 100) : 0;
  const rates = CHANNEL_RATES[best];

  // Also calculate scores for all channels for comparison
  const channelScores = rows.map(r => {
    const ch = r.preferredChannel as Channel;
    const chRates = CHANNEL_RATES[ch];
    const preference = total > 0 ? r._count.id / total : 0;
    const effectiveness = chRates.readOrOpen * chRates.click * chRates.convert;
    const score = preference * 0.4 + effectiveness * 0.6;
    return { channel: ch, preference: Math.round(preference * 100), effectiveness: Math.round(effectiveness * 10000) / 100, score: Math.round(score * 100) / 100 };
  });
  channelScores.sort((a, b) => b.score - a.score);

  return {
    recommended: best,
    confidence: total > 0 ? Math.min(0.95, 0.5 + bestCount / total) : 0.6,
    rationale: total > 0
      ? `${pct}% of audience prefers ${best} — expected ${Math.round(rates.readOrOpen * 100)}% read/open rate, ${Math.round(rates.click * 100)}% CTR.`
      : `Defaulting to WhatsApp for highest engagement rates.`,
    alternatives: channelScores
  };
}

// ─── Tool 4: Message Generator ───────────────────────────────────────
export function generateMessages(goal: string, channel: Channel, tone: string = "emotional") {
  const brand = "GlowMart";
  const channelFormats: Record<string, { maxLen: number; emoji: boolean; cta: boolean }> = {
    WHATSAPP: { maxLen: 200, emoji: true, cta: true },
    SMS: { maxLen: 120, emoji: false, cta: true },
    EMAIL: { maxLen: 400, emoji: true, cta: true },
    RCS: { maxLen: 200, emoji: true, cta: true },
  };
  const fmt = channelFormats[channel] ?? channelFormats.WHATSAPP;

  const templates: Record<string, Record<string, string[]>> = {
    emotional: {
      A: [`Hi {{name}}, we miss you at ${brand}! Your favourite picks are waiting — come back for a complimentary treat on us. ${fmt.emoji ? "💫" : ""}`],
      B: [`{{name}}, it's been a while! Your ${brand} cart misses you. Tap to rediscover what you love. ${fmt.emoji ? "❤️" : ""}`],
      C: [`We saved your spot, {{name}} ${fmt.emoji ? "☕" : ""} — ${brand} has something special just for you.`]
    },
    discount: {
      A: [`Hi {{name}}, here's 20% OFF your next ${brand} order! Use code GLOW20 — valid this week only. ${fmt.emoji ? "🎉" : ""}`],
      B: [`Flash sale for {{name}}: 25% off everything at ${brand}. Don't miss out! ${fmt.emoji ? "⚡" : ""}`],
      C: [`Last chance {{name}}! 30% off ends tonight at ${brand}. ${fmt.emoji ? "🔥" : ""}`]
    },
    premium: {
      A: [`Hi {{name}}, as a valued member, you've unlocked early access to our new collection at ${brand}. ${fmt.emoji ? "✨" : ""}`],
      B: [`Exclusive for {{name}}: VIP preview + free shipping on your next ${brand} order. ${fmt.emoji ? "👑" : ""}`],
      C: [`{{name}}, you're invited to our inner circle at ${brand}. Limited spots. ${fmt.emoji ? "💎" : ""}`]
    },
    urgent: {
      A: [`{{name}}, don't wait — your ${brand} favourites are selling fast! Shop now before they're gone. ${fmt.emoji ? "⏰" : ""}`],
      B: [`LAST CALL {{name}}: Your exclusive ${brand} offer expires in 24 hours. ${fmt.emoji ? "🚨" : ""}`],
      C: [`{{name}}, only a few left! Grab your ${brand} picks before midnight. ${fmt.emoji ? "⚡" : ""}`]
    },
    educational: {
      A: [`Hi {{name}}, discover 5 ways to elevate your routine with ${brand}'s bestsellers. ${fmt.emoji ? "📖" : ""}`],
      B: [`{{name}}, here's your personalised guide to getting the most from ${brand}. ${fmt.emoji ? "💡" : ""}`],
      C: [`Pro tip for {{name}}: ${brand} experts share their top picks for you. ${fmt.emoji ? "🌟" : ""}`]
    },
    neutral: {
      A: [`Hi {{name}}, check out what's new at ${brand} — curated just for you. ${fmt.emoji ? "🛍️" : ""}`],
      B: [`{{name}}, your personalised ${brand} recommendations are ready. ${fmt.emoji ? "✨" : ""}`],
      C: [`Something special for {{name}} at ${brand} — tap to explore. ${fmt.emoji ? "🎁" : ""}`]
    }
  };

  // Detect tone from goal if not already set
  let resolvedTone = tone;
  if (resolvedTone === "neutral" || resolvedTone === "emotional") {
    const lower = goal.toLowerCase();
    if (/discount|offer|sale|%|coupon|deal|save|free/i.test(lower)) resolvedTone = "discount";
    else if (/premium|vip|loyal|exclusive|inner circle/i.test(lower)) resolvedTone = "premium";
    else if (/urgent|asap|last chance|ending|expires/i.test(lower)) resolvedTone = "urgent";
    else if (/learn|discover|tips|guide|how to/i.test(lower)) resolvedTone = "educational";
    else if (/miss|love|special|win.?back|re.?engage|dormant/i.test(lower)) resolvedTone = "emotional";
  }

  const toneTemplates = templates[resolvedTone] ?? templates.neutral;
  const subject = channel === "EMAIL" ? `${brand}: Something special for {{name}}` : undefined;

  return {
    variantA: toneTemplates.A[0],
    variantB: toneTemplates.B[0],
    variantC: toneTemplates.C[0],
    subject,
    tone: resolvedTone
  };
}

// ─── Tool 5: Campaign Planner (orchestrates all tools) ───────────────
export async function planCampaign(goal: string, reasoning: ReasoningChain, onProgress?: (msg: any) => void): Promise<{ draft: CampaignDraft; reasoning: ReasoningChain }> {
  const notify = (step: any) => { if (onProgress) onProgress({ type: "thought", step }); };
  // Step 1: Analyze audience
  addStep(reasoning, "Audience Analysis", `Parsing goal: "${goal}"`, "Extracting segment criteria from natural language", 0.85);
  const segment = await generateAudience(goal);
  addStep(reasoning, "Audience Analysis",
    `Found ${segment.count.toLocaleString("en-IN")} matching customers`,
    `Segment "${segment.name}" — avg spend ₹${segment.demographics.avgSpend.toLocaleString("en-IN")}, churn risk ${Math.round(segment.churnRisk * 100)}%`,
    segment.count > 0 ? 0.9 : 0.3,
    { count: segment.count, churnRisk: segment.churnRisk }
  );
  notify(reasoning.steps[reasoning.steps.length - 1]);

  // Step 2: Channel recommendation
  const where = filterToPrisma(segment.definition as any);
  const channel = await recommendChannel(where);
  addStep(reasoning, "Channel Selection",
    `Analyzed channel preferences across ${segment.count} customers`,
    `${channel.recommended} selected — ${channel.rationale}`,
    channel.confidence,
    { channel: channel.recommended, confidence: channel.confidence }
  );
  notify(reasoning.steps[reasoning.steps.length - 1]);

  // Step 3: Message generation
  const messages = generateMessages(goal, channel.recommended);
  addStep(reasoning, "Message Generation",
    `Generated 3 A/B/C variants with "${messages.tone}" tone`,
    `Messages optimized for ${channel.recommended} format`,
    0.8
  );
  notify(reasoning.steps[reasoning.steps.length - 1]);

  // Step 4: Performance forecast (Monte Carlo)
  const avgOV = segment.demographics.avgSpend > 0 ? Math.round(segment.demographics.avgSpend / 3) : 2500;
  const engBoost = segment.demographics.avgEngagement > 60 ? 1.15 : segment.demographics.avgEngagement > 40 ? 1.0 : 0.85;
  const forecast = forecastCampaign(segment.count, channel.recommended, avgOV, engBoost);
  addStep(reasoning, "Performance Forecast",
    `Ran ${forecast.simulations} Monte Carlo simulations`,
    `Expected revenue ₹${forecast.revenue.mid.toLocaleString("en-IN")} (₹${forecast.revenue.low.toLocaleString("en-IN")} – ₹${forecast.revenue.high.toLocaleString("en-IN")})`,
    forecast.confidence,
    { revenue: forecast.revenue, openRate: forecast.openRate }
  );
  notify(reasoning.steps[reasoning.steps.length - 1]);

  const draft: CampaignDraft = {
    goal,
    segment: {
      name: segment.name,
      definition: segment.definition as Record<string, unknown>,
      count: segment.count,
      reasoning: segment.reasoning,
      revenuePotential: segment.revenuePotential,
      churnRisk: segment.churnRisk
    },
    channel: {
      recommended: channel.recommended,
      confidence: channel.confidence,
      rationale: channel.rationale
    },
    messages: {
      variantA: messages.variantA,
      variantB: messages.variantB,
      variantC: messages.variantC,
      subject: messages.subject
    },
    forecast: {
      openRate: forecast.openRate.mid,
      clickRate: forecast.clickRate.mid,
      conversionRate: forecast.conversionRate.mid,
      revenue: forecast.revenue.mid
    }
  };

  return { draft, reasoning: finalizeReasoning(reasoning) };
}

// ─── Tool 6: Insight Generator ───────────────────────────────────────
export async function generateInsights() {
  const [byCity, byCategory, totals, campaignCount] = await Promise.all([
    prisma.customer.groupBy({
      by: ["city"],
      _avg: { purchaseProb: true, churnScore: true },
      _count: { id: true },
      orderBy: { _avg: { purchaseProb: "desc" } },
      take: 3
    }),
    prisma.customer.groupBy({
      by: ["preferredCategory"],
      _avg: { totalSpend: true },
      _sum: { totalSpend: true },
      orderBy: { _avg: { totalSpend: "desc" } },
      take: 3
    }),
    prisma.campaignAnalytics.aggregate({
      _sum: { converted: true, revenue: true, opened: true, delivered: true, sent: true, clicked: true }
    }),
    prisma.campaign.count()
  ]);

  const insights: string[] = [];

  if (byCity[0]?.city) {
    insights.push(`Customers from ${byCity[0].city} show ${Math.round((byCity[0]._avg.purchaseProb ?? 0) * 100)}% purchase probability — prioritize this geo for conversion campaigns.`);
  }
  if (byCity.length > 1 && byCity[0]._avg.purchaseProb && byCity[1]._avg.purchaseProb) {
    const diff = ((byCity[0]._avg.purchaseProb - byCity[1]._avg.purchaseProb) / byCity[1]._avg.purchaseProb * 100).toFixed(0);
    if (Number(diff) > 10) {
      insights.push(`${byCity[0].city} converts ${diff}% better than ${byCity[1].city} — consider geo-targeted campaigns.`);
    }
  }
  if (byCategory[0]?.preferredCategory) {
    insights.push(`${byCategory[0].preferredCategory} buyers have highest avg spend (₹${Math.round(byCategory[0]._avg.totalSpend ?? 0).toLocaleString("en-IN")}).`);
  }
  const s = totals._sum;
  if (s.delivered && s.opened) {
    const openRate = Math.round((s.opened / s.delivered) * 100);
    insights.push(`Overall open/read rate is ${openRate}% across ${campaignCount} campaigns.`);
  }
  if (s.delivered && s.clicked) {
    const ctr = Math.round((s.clicked / s.delivered) * 100);
    insights.push(`Click-through rate: ${ctr}% — ${ctr > 15 ? "above" : "below"} industry average.`);
  }
  if (s.revenue && s.revenue > 0) {
    insights.push(`Total campaign revenue: ₹${Math.round(s.revenue).toLocaleString("en-IN")} from ${s.converted ?? 0} conversions.`);
  }

  if (insights.length === 0) insights.push("Launch your first campaign to unlock AI insights.");
  return insights;
}

// ─── Tool 7: Next Best Action ────────────────────────────────────────
export async function nextBestActions() {
  const [atRisk, highLtv, dormant, newCustomers, totalCustomers] = await Promise.all([
    prisma.customer.count({ where: { churnScore: { gte: 0.6 } } }),
    prisma.customer.count({ where: { ltvScore: { gte: 20000 } } }),
    prisma.customer.count({ where: { daysSinceOrder: { gte: 45 } } }),
    prisma.customer.count({ where: { daysSinceOrder: { lte: 15 }, totalSpend: { lte: 3000 } } }),
    prisma.customer.count()
  ]);

  const actions = [];
  if (dormant > 0)
    actions.push({
      type: "WIN_BACK",
      title: "Win-back campaign for dormant shoppers",
      detail: `${dormant.toLocaleString("en-IN")} customers inactive 45+ days`,
      prompt: "Re-engage dormant customers with an emotional win-back offer",
      priority: dormant / totalCustomers > 0.3 ? "high" : "medium",
      impact: Math.round(dormant * 2500 * 0.08)
    });
  if (atRisk > 0)
    actions.push({
      type: "RETENTION",
      title: "Retention push for at-risk segment",
      detail: `${atRisk.toLocaleString("en-IN")} customers with churn score ≥ 60%`,
      prompt: "Prevent churn for at-risk customers with a loyalty discount",
      priority: "high",
      impact: Math.round(atRisk * 3000 * 0.12)
    });
  if (highLtv > 0)
    actions.push({
      type: "LOYALTY",
      title: "VIP loyalty campaign",
      detail: `${highLtv.toLocaleString("en-IN")} high-LTV customers`,
      prompt: "Reward loyal high-value customers with an exclusive premium offer",
      priority: "medium",
      impact: Math.round(highLtv * 5000 * 0.15)
    });
  if (newCustomers > 0)
    actions.push({
      type: "ONBOARDING",
      title: "Welcome series for new customers",
      detail: `${newCustomers.toLocaleString("en-IN")} new customers to nurture`,
      prompt: "Create a welcome campaign for new customers with product recommendations",
      priority: "medium",
      impact: Math.round(newCustomers * 1500 * 0.2)
    });
  if (actions.length === 0)
    actions.push({
      type: "ACQUISITION",
      title: "Cross-sell campaign",
      detail: "Engage mid-tier shoppers",
      prompt: "Cross-sell fitness products to engaged coffee buyers",
      priority: "low",
      impact: 50000
    });

  // Sort by impact
  actions.sort((a, b) => (b.impact ?? 0) - (a.impact ?? 0));
  return actions;
}

// ─── Main Orchestrator ───────────────────────────────────────────────
export type OrchestrateResult = {
  reply: string;
  draft: CampaignDraft | null;
  actions: { type: string; payload: any }[];
  reasoning: string[];
  sessionId: string;
  thinkingSteps: string[];
};

export async function orchestrate(message: string, sessionId?: string, onProgress?: (msg: any) => void): Promise<OrchestrateResult> {
  // Session management
  const session = await getOrCreateSession(sessionId);
  const reasoning = startReasoning();
  const thinkingSteps: string[] = [];

  // Classify intent
  const classified = classifyIntent(message);
  addStep(reasoning, "Intent Classification",
    `Input: "${message.slice(0, 80)}${message.length > 80 ? "..." : ""}"`,
    `Intent: ${classified.intent} (${Math.round(classified.confidence * 100)}% confidence), Tone: ${classified.tone}`,
    classified.confidence
  );
  if (onProgress) onProgress({ type: "thought", step: reasoning.steps[reasoning.steps.length - 1] });
  thinkingSteps.push(`🔍 Understanding intent: ${classified.intent}`);

  // Save user message
  session.messages.push({
    role: "user",
    content: message,
    timestamp: new Date().toISOString()
  });

  let result: OrchestrateResult;

  switch (classified.intent) {
    case "CUSTOMER_LOOKUP": {
      thinkingSteps.push("📊 Looking up customer data...");
      const customers = await prisma.customer.findMany({
        orderBy: { ltvScore: "desc" },
        take: 5,
        select: { id: true, name: true, city: true, ltvScore: true, churnScore: true, preferredCategory: true, engagementScore: true, totalSpend: true }
      });
      const reply = `Here are your top 5 customers by lifetime value:\n\n${customers.map((c, i) =>
        `**${i + 1}. ${c.name}** (${c.city}) — LTV ₹${Math.round(c.ltvScore).toLocaleString("en-IN")} · Churn ${Math.round(c.churnScore * 100)}% · ${c.preferredCategory}`
      ).join("\n")}`;
      result = {
        reply, draft: null,
        actions: [{ type: "VIEW_CUSTOMERS", payload: {} }],
        reasoning: formatReasoningForDisplay(finalizeReasoning(reasoning)),
        sessionId: session.id,
        thinkingSteps
      };
      break;
    }

    case "GET_INSIGHTS": {
      thinkingSteps.push("📈 Analyzing performance data...");
      thinkingSteps.push("🧠 Generating AI insights...");
      const insights = await generateInsights();
      const actions = await nextBestActions();
      const churn = await analyzeChurn();

      addStep(reasoning, "Insight Generation", `Analyzed performance data`, insights.join(" | "), 0.9);
      if (onProgress) onProgress({ type: "thought", step: reasoning.steps[reasoning.steps.length - 1] });

      let reply = `**📊 AI Insights:**\n${insights.map(i => `• ${i}`).join("\n")}`;
      reply += `\n\n**⚠️ Churn Status:** ${churn.churnVelocity.toUpperCase()} — ${churn.totalAtRisk + churn.totalChurning} customers at risk`;
      reply += `\n\n**🎯 Top Recommendation:** ${actions[0]?.title ?? "Launch a campaign"}`;
      if (actions[0]?.impact) reply += ` (est. ₹${actions[0].impact.toLocaleString("en-IN")} impact)`;

      result = {
        reply, draft: null,
        actions: [{ type: "VIEW_ANALYTICS", payload: {} }],
        reasoning: formatReasoningForDisplay(finalizeReasoning(reasoning)),
        sessionId: session.id,
        thinkingSteps
      };
      break;
    }

    case "ANALYZE_AUDIENCE": {
      thinkingSteps.push("👥 Analyzing customer segments...");
      thinkingSteps.push("📊 Computing demographics...");
      const audience = await generateAudience(message);
      addStep(reasoning, "Audience Analysis",
        `Found ${audience.count} customers matching criteria`,
        `Segment: "${audience.name}"`,
        0.85
      );
      if (onProgress) onProgress({ type: "thought", step: reasoning.steps[reasoning.steps.length - 1] });

      let reply = `**Audience: ${audience.name}**\n\n`;
      reply += `• **${audience.count.toLocaleString("en-IN")}** matching customers\n`;
      reply += `• Avg spend: ₹${audience.demographics.avgSpend.toLocaleString("en-IN")}\n`;
      reply += `• Churn risk: ${Math.round(audience.churnRisk * 100)}%\n`;
      reply += `• Revenue potential: ₹${audience.revenuePotential.toLocaleString("en-IN")}\n\n`;
      reply += `**Criteria:** ${audience.reasoning.join(" · ")}`;

      if (audience.demographics.cities.length > 0) {
        reply += `\n\n**Top cities:** ${audience.demographics.cities.slice(0, 3).map(c => `${c.name} (${c.count})`).join(", ")}`;
      }

      result = {
        reply, draft: null,
        actions: [{ type: "VIEW_AUDIENCE", payload: audience }],
        reasoning: formatReasoningForDisplay(finalizeReasoning(reasoning)),
        sessionId: session.id,
        thinkingSteps
      };
      break;
    }

    case "CREATE_CAMPAIGN":
    default: {
      thinkingSteps.push("🎯 Analyzing target audience...");
      thinkingSteps.push("📡 Evaluating channel performance...");
      thinkingSteps.push("✍️ Generating message variants...");
      thinkingSteps.push("📊 Running performance simulations...");
      if (onProgress) onProgress({ type: "thought", step: { title: "Campaign Planning", detail: "Orchestrating tools..." } });

      const { draft, reasoning: finalReasoning } = await planCampaign(message, reasoning, onProgress);

      addStep(finalReasoning, "Campaign Ready",
        "All components assembled",
        `Campaign targeting ${draft.segment.count.toLocaleString("en-IN")} shoppers via ${draft.channel.recommended} — forecast ₹${draft.forecast.revenue.toLocaleString("en-IN")} revenue`,
        finalReasoning.overallConfidence
      );
      if (onProgress) onProgress({ type: "thought", step: finalReasoning.steps[finalReasoning.steps.length - 1] });

      let reply = `I found **${draft.segment.count.toLocaleString("en-IN")} shoppers** matching "${draft.segment.name}".\n\n`;
      reply += `**📡 Channel:** ${draft.channel.recommended} (${Math.round(draft.channel.confidence * 100)}% confidence)\n`;
      reply += `**📊 Forecast:** ${Math.round(draft.forecast.openRate * 100)}% open · ${Math.round(draft.forecast.conversionRate * 100)}% conversion · ₹${draft.forecast.revenue.toLocaleString("en-IN")} revenue\n\n`;
      reply += `Review the campaign draft below and launch when ready.`;

      thinkingSteps.push("✅ Campaign draft ready for review");

      result = {
        reply,
        draft,
        actions: [{ type: "CREATE_CAMPAIGN_DRAFT", payload: draft }],
        reasoning: formatReasoningForDisplay(finalizeReasoning(finalReasoning)),
        sessionId: session.id,
        thinkingSteps
      };
      break;
    }
  }

  // Save session
  session.messages.push({
    role: "assistant",
    content: result.reply,
    timestamp: new Date().toISOString(),
    draft: result.draft
  });
  const newContext = updateContext(session.context, result.draft, message);
  await saveSession(session.id, session.messages, newContext);

  return result;
}

export { parseAudiencePrompt, filterToPrisma };
export { classifyIntent } from "./intent-classifier";
export { analyzeChurn } from "./churn-detector";
export { findLookalikes } from "./lookalike-engine";
export { estimateRevenue } from "./revenue-estimator";
export { forecastCampaign } from "./forecast-engine";
