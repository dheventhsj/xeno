/**
 * Conversational chat — greetings, help, and real-time CRM Q&A
 */
import { prisma } from "@xenopilot/database";
import type { SessionMessage } from "./session-manager";
import { lookupCustomerByQuery } from "./customer-lookup";
import { looksLikeGreeting, hasCampaignSignals, shouldRedirectToCrmTopics, outOfScopeReply, isClearlyOffTopic } from "./chat-patterns";

export { looksLikeGreeting, outOfScopeReply, CRM_TOPIC_SUGGESTIONS } from "./chat-patterns";

export type ChatResponse = {
  reply: string;
  thinkingSteps: string[];
  source: "rules" | "gemini" | "openai";
};

/** Fuzzy greeting match — hi, hii, heyy, hello, etc. */
function greetingReply(message: string): string | null {
  const m = message.trim().toLowerCase();
  const hr = new Date().getHours();
  const timeGreeting = hr < 12 ? "Good morning" : hr < 17 ? "Good afternoon" : "Good evening";

  if (looksLikeGreeting(message)) {
    return `${timeGreeting}! 👋 Hi there — I'm **Pulse Assistant**, your AI marketing copilot for **Pulse CRM**.\n\nHow can I help you today? Ask about customers, campaigns, or audiences — or describe a marketing goal and I'll build a campaign for you.`;
  }
  if (/^good (morning|afternoon|evening|night)[!.?\s]*$/i.test(m)) {
    return `${timeGreeting}! How can I help with your marketing today?`;
  }
  if (/^(thanks|thank you|thx|ty)[!.?\s]*$/i.test(m)) {
    return "You're welcome! Let me know if you need anything else.";
  }
  if (/^(bye|goodbye|see you|later)[!.?\s]*$/i.test(m)) {
    return "Goodbye! I'll be here whenever you need campaign insights or help.";
  }
  if (/^(how are you|how r u|how're you)[?.!\s]*$/i.test(m)) {
    return "I'm running smoothly and ready to help! Your CRM data is live — ask me about customers, churn, campaigns, or describe a goal to orchestrate.";
  }
  if (/^(who are you|what are you)[?.!\s]*$/i.test(m)) {
    return "I'm **Pulse Assistant** — an AI marketing operator built into **Pulse CRM**. I segment shoppers, recommend channels, write campaign copy, forecast revenue, and answer questions about your data in real time.";
  }
  if (/^(help|what can you do|what do you do|how do i use this)[?.!\s]*$/i.test(m)) {
    return `**Here's what I can do:**\n\n• **Chat** — say hi, ask questions, get instant answers\n• **Audience analysis** — "Find dormant beauty shoppers in Mumbai"\n• **Campaign planning** — "Re-engage high-value customers at risk of churn"\n• **Insights** — "Show me campaign performance" or "Who are my top customers?"\n• **Launch** — review the draft I generate and execute with one click\n\nTry: *"How many customers do we have?"* or *"Shoppers with churn over 50%"*`;
  }
  return null;
}

async function getLiveCrmContext() {
  const [customerCount, atRisk, dormant, campaignCount, analytics, topCity] = await Promise.all([
    prisma.customer.count(),
    prisma.customer.count({ where: { churnScore: { gte: 0.6 } } }),
    prisma.customer.count({ where: { daysSinceOrder: { gte: 45 } } }),
    prisma.campaign.count(),
    prisma.campaignAnalytics.aggregate({
      _sum: { sent: true, delivered: true, opened: true, converted: true, revenue: true }
    }),
    prisma.customer.groupBy({
      by: ["city"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 1
    })
  ]);

  const s = analytics._sum;
  const openRate = s.delivered && s.opened ? Math.round((s.opened / s.delivered) * 100) : 0;

  return {
    customerCount,
    atRiskCount: atRisk,
    dormantCount: dormant,
    campaignCount,
    totalRevenue: Math.round(s.revenue ?? 0),
    totalConversions: s.converted ?? 0,
    openRate,
    topCity: topCity[0]?.city ?? "N/A",
    topCityCount: topCity[0]?._count.id ?? 0
  };
}

async function answerFromData(message: string): Promise<string | null> {
  const m = message.toLowerCase();
  const ctx = await getLiveCrmContext();

  if (/(dormant|inactive).*(how many|count|number)/.test(m) || /how many.*(dormant|inactive)/.test(m)) {
    return `**${ctx.dormantCount.toLocaleString("en-IN")} customers** haven't ordered in 45+ days (dormant segment).`;
  }
  if (/(how many|total|count).*(customer|shopper|buyer)/.test(m)) {
    return `You have **${ctx.customerCount.toLocaleString("en-IN")} customers** in the database right now.`;
  }
  if (/(churn|at.?risk).*(how many|count|number)/.test(m) || /how many.*(churn|at.?risk)/.test(m)) {
    return `**${ctx.atRiskCount.toLocaleString("en-IN")} customers** currently have a churn score ≥ 60% (at-risk segment).`;
  }
  if (/(campaign|campaigns).*(how many|count|running)/.test(m) || /how many.*campaign/.test(m)) {
    return `You have **${ctx.campaignCount} campaigns** in the system${ctx.totalConversions > 0 ? ` with **${ctx.totalConversions.toLocaleString("en-IN")} total conversions**` : ""}.`;
  }
  if (/(revenue|sales|earnings)/.test(m) && /(total|campaign|how much)/.test(m)) {
    return ctx.totalRevenue > 0
      ? `Total campaign-attributed revenue is **₹${ctx.totalRevenue.toLocaleString("en-IN")}**.`
      : `No campaign revenue recorded yet — launch your first campaign to start tracking!`;
  }
  if (/(open rate|read rate|performance)/.test(m)) {
    return ctx.openRate > 0
      ? `Your overall campaign open/read rate is **${ctx.openRate}%** across ${ctx.campaignCount} campaigns.`
      : `No delivery data yet. Launch a campaign to see performance metrics.`;
  }
  if (/(top city|biggest city|which city)/.test(m)) {
    return `Your largest customer base is **${ctx.topCity}** with **${ctx.topCityCount.toLocaleString("en-IN")} shoppers**.`;
  }
  if (/^(status|overview|summary|dashboard)[?.!\s]*$/i.test(m.trim())) {
    return `**Quick snapshot:**\n• ${ctx.customerCount.toLocaleString("en-IN")} customers\n• ${ctx.atRiskCount.toLocaleString("en-IN")} at-risk (churn ≥ 60%)\n• ${ctx.dormantCount.toLocaleString("en-IN")} dormant (45+ days)\n• ${ctx.campaignCount} campaigns · ${ctx.openRate}% open rate\n• Top city: ${ctx.topCity} (${ctx.topCityCount})`;
  }
  return null;
}

async function chatWithGemini(message: string, history: SessionMessage[], crmContext: Awaited<ReturnType<typeof getLiveCrmContext>>) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;

  const model = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

  const historyText = history.slice(-8).map(h => `${h.role === "user" ? "User" : "Assistant"}: ${h.content}`).join("\n");
  const system = `You are Pulse Assistant, a friendly AI marketing copilot inside Pulse CRM (GlowMart tenant).
You ONLY answer questions about CRM data, customers, campaigns, audiences, marketing insights, and campaign planning.
If the user asks anything unrelated (weather, sports, recipes, general trivia, homework, politics, etc.), politely say you can only help with Pulse CRM marketing data and suggest relevant questions like customer counts, churn, campaign performance, or launching a campaign.
Answer naturally and concisely (2-4 sentences unless listing data).
Use **bold** for key numbers. You have LIVE data:
- ${crmContext.customerCount} total customers
- ${crmContext.atRiskCount} at-risk (churn ≥ 60%)
- ${crmContext.dormantCount} dormant (45+ days inactive)
- ${crmContext.campaignCount} campaigns, ${crmContext.openRate}% open rate
- ₹${crmContext.totalRevenue.toLocaleString("en-IN")} campaign revenue
- Top city: ${crmContext.topCity} (${crmContext.topCityCount} customers)
For campaign creation, suggest the user describe their goal. Be warm for greetings.`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: `${system}\n\nRecent conversation:\n${historyText}\n\nUser: ${message}\n\nAssistant:` }]
      }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 512 }
    })
  });

  if (!res.ok) return null;
  const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? null;
}

async function chatWithOpenAI(message: string, history: SessionMessage[], crmContext: Awaited<ReturnType<typeof getLiveCrmContext>>) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;

  const { default: OpenAI } = await import("openai");
  const client = new OpenAI({ apiKey: key });

  const system = `You are Pulse Assistant, a friendly AI marketing copilot for Pulse CRM (GlowMart tenant).
You ONLY help with CRM customers, campaigns, audiences, and marketing insights.
If asked anything unrelated, politely redirect to CRM topics — do not answer off-topic questions.
Live data: ${crmContext.customerCount} customers, ${crmContext.atRiskCount} at-risk, ${crmContext.dormantCount} dormant, ${crmContext.campaignCount} campaigns, ${crmContext.openRate}% open rate, ₹${crmContext.totalRevenue} revenue.
Reply naturally and concisely. Use **bold** for numbers.`;

  const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
    { role: "system", content: system },
    ...history.slice(-8).map(h => ({ role: h.role as "user" | "assistant", content: h.content })),
    { role: "user", content: message }
  ];

  const completion = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
    temperature: 0.7,
    max_tokens: 512,
    messages
  });

  return completion.choices[0]?.message?.content?.trim() ?? null;
}

export function isCasualChat(message: string): boolean {
  const t = message.trim();
  if (looksLikeGreeting(t)) return true;
  return /^(h+i+|he+y+|hello+|how are you|who are you|what can you do|help|thanks|thank you|thx|bye|goodbye|status|overview|ok|okay|cool|nice|sure|got it|good morning|good afternoon|good evening)[!.?\s]*$/i.test(t);
}

function contextualFallback(
  message: string,
  history: SessionMessage[],
  ctx: Awaited<ReturnType<typeof getLiveCrmContext>>
): string {
  const m = message.trim();
  const lower = m.toLowerCase();

  if (/^(ok|okay|cool|nice|sure|got it|understood|alright|sounds good|great|awesome)[!.?\s]*$/i.test(m)) {
    const lastTopic = [...history].reverse().find(h => h.role === "assistant")?.content.slice(0, 80);
    return lastTopic
      ? "Got it! Want to go deeper on that, or try something else — customers, campaigns, or insights?"
      : "Sounds good! What would you like to explore — **customers**, **campaigns**, or **insights**?";
  }

  if (/^(yes|yeah|yep|please|go ahead)[!.?\s]*$/i.test(m)) {
    return "Sure — tell me what you'd like to do. For example: *\"How many customers are at risk?\"* or *\"Launch a win-back campaign for dormant shoppers.\"*";
  }

  if (/^(no|nope|not now|never mind|nevermind)[!.?\s]*$/i.test(m)) {
    return "No problem! I'm here whenever you need help with your CRM or marketing.";
  }

  if (/(customer|shopper|buyer|user)/i.test(lower) && !hasCampaignSignals(m)) {
    return `You have **${ctx.customerCount.toLocaleString("en-IN")} customers** in Pulse CRM right now (${ctx.atRiskCount.toLocaleString("en-IN")} at-risk). Try: *"Who are my top customers by LTV?"* or *"How many dormant customers?"*`;
  }

  if (/(campaign|performance|revenue|insight|analytics)/i.test(lower) && !hasCampaignSignals(m)) {
    return `You have **${ctx.campaignCount} campaigns** with **${ctx.openRate}%** open rate and **₹${ctx.totalRevenue.toLocaleString("en-IN")}** attributed revenue. Try: *"Show me campaign performance"* or *"Which segment should I target next?"*`;
  }

  if (isClearlyOffTopic(m) || shouldRedirectToCrmTopics(m)) {
    return outOfScopeReply(m);
  }

  return outOfScopeReply(m);
}

export async function respondToChat(message: string, history: SessionMessage[] = []): Promise<ChatResponse> {
  const greeting = greetingReply(message);
  if (greeting) {
    return { reply: greeting, thinkingSteps: ["💬 Greeting"], source: "rules" };
  }

  const dataAnswer = await answerFromData(message);
  if (dataAnswer) {
    return { reply: dataAnswer, thinkingSteps: ["📊 Querying live CRM data"], source: "rules" };
  }

  const customerLookup = await lookupCustomerByQuery(message);
  if (customerLookup) {
    return {
      reply: customerLookup.reply,
      thinkingSteps: ["👤 Customer Analyzer", customerLookup.count === 1 ? "Full profile loaded" : `${customerLookup.count} matches`],
      source: "rules"
    };
  }

  const crmContext = await getLiveCrmContext();

  if (shouldRedirectToCrmTopics(message)) {
    return {
      reply: outOfScopeReply(message),
      thinkingSteps: ["🚫 Out of scope"],
      source: "rules"
    };
  }

  if (process.env.GEMINI_API_KEY) {
    const gemini = await chatWithGemini(message, history, crmContext);
    if (gemini && !/out of scope/i.test(gemini)) {
      return { reply: gemini, thinkingSteps: ["🤖 Gemini AI"], source: "gemini" };
    }
  }

  if (process.env.OPENAI_API_KEY) {
    const openai = await chatWithOpenAI(message, history, crmContext);
    if (openai && !/out of scope/i.test(openai)) {
      return { reply: openai, thinkingSteps: ["🤖 OpenAI"], source: "openai" };
    }
  }

  return {
    reply: contextualFallback(message, history, crmContext),
    thinkingSteps: ["💬 CRM assistant"],
    source: "rules"
  };
}
