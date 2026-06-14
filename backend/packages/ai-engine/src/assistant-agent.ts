/**
 * Pulse Assistant Agent — context-aware RAG-powered assistant
 */
import { respondToChat, isCasualChat } from "./chat-responder";
import { lookupCustomerByQuery } from "./customer-lookup";
import { buildRagContext, formatRagForPrompt, type PageContext } from "./rag-retriever";
import { answerTechnicalQuestion } from "./technical-knowledge";
import { scanOpportunities } from "./opportunity-radar";
import { findLookalikes } from "./lookalike-engine";
import { generateWarRoomReport } from "./campaign-war-room";
import { getChannelPerformanceMemories } from "./marketing-memory";
import type { SessionMessage } from "./session-manager";

export type AssistantToolStep = {
  tool: string;
  status: "running" | "done";
  detail?: string;
};

export type AssistantResult = {
  reply: string;
  toolSteps: AssistantToolStep[];
  suggestedActions?: { label: string; prompt: string; type: string }[];
  source: "rules" | "rag" | "gemini" | "openai" | "technical";
};

const QUICK_ACTIONS = [
  { label: "🔥 High Churn Customers", prompt: "Show high churn customers and how many are at risk", type: "query" },
  { label: "🚀 Launch Campaign", prompt: "Generate a win-back campaign for dormant beauty customers", type: "campaign" },
  { label: "📈 Revenue Insights", prompt: "Which campaign generated the most revenue?", type: "query" },
  { label: "🎯 Find VIP Customers", prompt: "Who are my VIP customers?", type: "query" },
  { label: "💡 Generate AI Insights", prompt: "Show me insights on campaign performance", type: "query" }
];

export function getQuickActions() {
  return QUICK_ACTIONS;
}

async function answerWithLLM(message: string, ragPrompt: string, history: SessionMessage[]) {
  if (process.env.GEMINI_API_KEY) {
    const model = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`;
    const historyText = history.slice(-6).map(h => `${h.role}: ${h.content}`).join("\n");
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `You are Pulse Assistant — AI marketing analyst for Pulse CRM (GlowMart). Use ONLY the provided context. Be concise, use **bold** for numbers. Answer business and technical questions.\n\n${ragPrompt}\n\nHistory:\n${historyText}\n\nUser: ${message}\n\nAssistant:`
          }]
        }],
        generationConfig: { temperature: 0.5, maxOutputTokens: 600 }
      })
    });
    if (res.ok) {
      const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) return { reply: text.trim(), source: "gemini" as const };
    }
  }

  if (process.env.OPENAI_API_KEY) {
    const { default: OpenAI } = await import("openai");
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      temperature: 0.5,
      max_tokens: 600,
      messages: [
        { role: "system", content: `You are Pulse Assistant for Pulse CRM (GlowMart).\n${ragPrompt}` },
        ...history.slice(-6).map(h => ({ role: h.role as "user" | "assistant", content: h.content })),
        { role: "user", content: message }
      ]
    });
    const reply = completion.choices[0]?.message?.content;
    if (reply) return { reply: reply.trim(), source: "openai" as const };
  }

  return null;
}

export async function runAssistant(
  message: string,
  history: SessionMessage[] = [],
  pageCtx: PageContext = {},
  onTool?: (step: AssistantToolStep) => void
): Promise<AssistantResult> {
  const toolSteps: AssistantToolStep[] = [];
  const emit = (tool: string, detail?: string) => {
    toolSteps.push({ tool, status: "done", detail });
    onTool?.({ tool, status: "done", detail });
  };

  // Technical questions first
  const technical = answerTechnicalQuestion(message);
  if (technical) {
    emit("Architecture Knowledge Base");
    return { reply: technical, toolSteps, source: "technical", suggestedActions: QUICK_ACTIONS.slice(0, 3) };
  }

  // Greetings & simple chat — skip RAG pipeline
  if (isCasualChat(message)) {
    const chat = await respondToChat(message, history);
    emit("Conversation");
    return {
      reply: chat.reply,
      toolSteps: [...toolSteps, ...chat.thinkingSteps.map(t => ({ tool: t, status: "done" as const }))],
      source: chat.source === "gemini" || chat.source === "openai" ? chat.source : "rules",
      suggestedActions: QUICK_ACTIONS
    };
  }

  // Customer profile lookup — "who is diya"
  const customerLookup = await lookupCustomerByQuery(message);
  if (customerLookup) {
    emit("Customer Analyzer", customerLookup.count === 1 ? "Full profile" : `${customerLookup.count} matches`);
    return {
      reply: customerLookup.reply,
      toolSteps,
      source: "rules",
      suggestedActions: QUICK_ACTIONS.slice(0, 3)
    };
  }

  onTool?.({ tool: "Retrieving Analytics", status: "running" });
  let rag;
  try {
    rag = await buildRagContext(message, pageCtx);
  } catch {
    rag = { snippets: [], memories: [], pageContext: "" };
  }
  emit("Retrieving Analytics", `${rag.snippets.length} data snippets`);

  if (/(lookalike|similar customer|find similar)/i.test(message)) {
    onTool?.({ tool: "Querying Customers", status: "running" });
    const topCustomers = await import("@xenopilot/database").then(({ prisma }) =>
      prisma.customer.findMany({ orderBy: { ltvScore: "desc" }, take: 5, select: { id: true } })
    );
    const lookalikes = await findLookalikes(topCustomers.map(c => c.id), 3, 100);
    emit("Querying Customers", `${lookalikes.expandedSize} lookalikes found`);
    return {
      reply: `**Lookalike Audience Found**\n\n• Seed: top ${lookalikes.seedSize} VIP customers\n• Expanded: **${lookalikes.expandedSize}** similar shoppers\n• Avg similarity: **${Math.round(lookalikes.similarity * 100)}%**\n• Revenue potential: ~₹${Math.round(lookalikes.expandedSize * 2500 * 0.1).toLocaleString("en-IN")}\n\nSay "Generate campaign for lookalike audience" to launch.`,
      toolSteps,
      source: "rag",
      suggestedActions: [{ label: "🚀 Launch for lookalikes", prompt: "Generate campaign targeting lookalike VIP customers", type: "campaign" }]
    };
  }

  if (pageCtx.campaignId && /(why|post.?mortem|war room|underperform|succeed|fail)/i.test(message)) {
    onTool?.({ tool: "Analyzing Campaigns", status: "running" });
    const report = await generateWarRoomReport(pageCtx.campaignId);
    emit("Analyzing Campaigns", report.status);
    let reply = `**Campaign War Room — ${report.status.toUpperCase()}**\n\n${report.headline}\n\n`;
    if (report.successes.length) reply += `**✓ Successes:**\n${report.successes.map(s => `• ${s}`).join("\n")}\n\n`;
    if (report.failures.length) reply += `**✗ Issues:**\n${report.failures.map(s => `• ${s}`).join("\n")}\n\n`;
    reply += `**Next:** ${report.nextCampaign.title}\n${report.revenueImpact}`;
    return {
      reply,
      toolSteps,
      source: "rag",
      suggestedActions: [{ label: "🚀 Launch next campaign", prompt: report.nextCampaign.prompt, type: "campaign" }]
    };
  }

  if (/(opportunity|radar|what should i target)/i.test(message)) {
    onTool?.({ tool: "Generating Insights", status: "running" });
    const opps = await scanOpportunities();
    emit("Generating Insights");
    const memories = await getChannelPerformanceMemories();
    let reply = `**Opportunity Radar**\n\n${opps.slice(0, 5).map(o =>
      `${o.icon} **${o.title}** — ${o.count.toLocaleString("en-IN")} customers · ₹${o.revenueOpportunity.toLocaleString("en-IN")} opportunity · ${Math.round(o.confidence * 100)}% confidence`
    ).join("\n")}`;
    if (memories.length) reply += `\n\n**Marketing Memory:**\n${memories.slice(0, 2).map(m => `• ${m}`).join("\n")}`;
    return {
      reply,
      toolSteps,
      source: "rag",
      suggestedActions: opps.slice(0, 2).map(o => ({ label: `🚀 ${o.title}`, prompt: o.prompt, type: "campaign" }))
    };
  }

  // RAG-enhanced LLM or fallback to chat responder
  const ragPrompt = formatRagForPrompt(rag);
  const llm = await answerWithLLM(message, ragPrompt, history);
  if (llm) {
    emit("Generating Insights");
    return { reply: llm.reply, toolSteps, source: llm.source, suggestedActions: QUICK_ACTIONS.slice(0, 3) };
  }

  onTool?.({ tool: "Querying Customers", status: "running" });
  const chat = await respondToChat(message, history);
  emit("Querying Customers");
  return {
    reply: rag.memories.length
      ? `${chat.reply}\n\n**From marketing memory:**\n${rag.memories.slice(0, 2).map(m => `• ${m}`).join("\n")}`
      : chat.reply,
    toolSteps: [...toolSteps, ...chat.thinkingSteps.map(t => ({ tool: t, status: "done" as const }))],
    source: "rag",
    suggestedActions: QUICK_ACTIONS
  };
}
