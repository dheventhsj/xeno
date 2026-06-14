"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { usePathname, useParams, useRouter } from "next/navigation";
import { Sparkles, X, Send, Loader2, Trash2, ChevronDown, Wrench } from "lucide-react";
import clsx from "clsx";

type Message = {
  role: "user" | "assistant";
  content: string;
  toolSteps?: { tool: string; status: string; detail?: string }[];
  suggestedActions?: { label: string; prompt: string; type: string }[];
};

const QUICK_CHIPS = [
  { label: "🔥 High Churn", prompt: "Who should I target next? Show high churn customers at risk" },
  { label: "🚀 Launch Campaign", prompt: "Generate a win-back campaign for dormant customers" },
  { label: "📈 Revenue", prompt: "Which campaign generated most revenue?" },
  { label: "🎯 VIP Customers", prompt: "Which customers are at risk among VIP segment?" },
  { label: "💡 AI Insights", prompt: "Show me insights on campaign performance" },
];

const TECH_CHIPS = [
  { label: "Webhook flow", prompt: "Explain webhook flow and async callbacks" },
  { label: "Queue processing", prompt: "Explain queue processing for campaign dispatch" },
  { label: "Channel service", prompt: "How does channel service work?" },
  { label: "Comm lifecycle", prompt: "Explain communication lifecycle from SENT to CONVERTED" },
];

function getPageContext(pathname: string, params: Record<string, string | string[]>) {
  const ctx: Record<string, string> = { page: pathname };
  if (params.id && pathname.includes("/customers")) ctx.customerId = String(params.id);
  if (params.id && pathname.includes("/campaigns")) ctx.campaignId = String(params.id);
  return ctx;
}

export function XenoCopilot() {
  const pathname = usePathname() ?? "/";
  const params = useParams() ?? {};
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [toolSteps, setToolSteps] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, toolSteps]);

  const send = useCallback(async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setInput("");
    setLoading(true);
    setToolSteps([]);
    setMessages(prev => [...prev, { role: "user", content: msg }]);

    const toolSequence = ["Querying Customers", "Analyzing Campaigns", "Retrieving Analytics", "Generating Insights"];
    let ti = 0;
    const toolInterval = setInterval(() => {
      if (ti < toolSequence.length) {
        setToolSteps(prev => [...prev, `✓ ${toolSequence[ti]}`]);
        ti++;
      }
    }, 400);

    try {
      const r = await fetch("/api/agent/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: msg,
          sessionId,
          pageContext: getPageContext(pathname, params as Record<string, string | string[]>)
        })
      });
      const data = await r.json();
      if (!r.ok) {
        setMessages(prev => [...prev, {
          role: "assistant",
          content: data.reply ?? data.error ?? "Sorry, something went wrong.",
          timestamp: new Date().toISOString()
        }]);
        return;
      }
      if (data.sessionId) setSessionId(data.sessionId);
      if (data.toolSteps) setToolSteps(data.toolSteps.map((t: any) => `✓ ${t.tool}${t.detail ? `: ${t.detail}` : ""}`));

      setMessages(prev => [...prev, {
        role: "assistant",
        content: data.reply ?? "Sorry, I couldn't process that.",
        toolSteps: data.toolSteps,
        suggestedActions: data.suggestedActions,
      }]);

      // Campaign action routing
      if (/generate.*campaign|launch.*campaign|win-back|re-engage/i.test(msg) && data.reply?.includes("draft")) {
        // user can follow up in full copilot
      }
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Connection error. Please try again." }]);
    } finally {
      clearInterval(toolInterval);
      setLoading(false);
    }
  }, [input, loading, sessionId, pathname, params]);

  async function clearHistory() {
    setMessages([]);
    setSessionId(null);
    await fetch("/api/agent/assistant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "hi", clearHistory: true })
    }).catch(() => {});
  }

  function renderMarkdown(text: string) {
    return text
      .replace(/\*\*(.*?)\*\*/g, "<strong class='text-white font-semibold'>$1</strong>")
      .replace(/\n/g, "<br/>");
  }

  return (
    <>
      {/* Floating trigger */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-white text-black px-5 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.4)] hover:scale-105 transition-transform font-semibold text-sm"
        >
          <Sparkles size={16} className="fill-black" />
          Pulse Assistant
        </button>
      )}

      {/* Panel */}
      {open && (
        <div className="fixed bottom-6 right-6 z-50 w-[400px] max-w-[calc(100vw-2rem)] h-[560px] max-h-[calc(100vh-3rem)] flex flex-col rounded-2xl border border-white/10 bg-[#0a0a0a]/95 backdrop-blur-xl shadow-[0_24px_64px_rgba(0,0,0,0.6)] animate-scale-in">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-white grid place-items-center">
                <Sparkles size={13} className="text-black fill-black" />
              </div>
              <div>
                <div className="text-sm font-bold text-white">Pulse Assistant</div>
                <div className="text-[9px] text-[#8A8A8A] font-mono">
                  {pathname === "/" ? "Mission Control" : pathname.replace("/", "").split("/")[0] || "app"}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={clearHistory} title="Clear history" className="p-1.5 rounded-lg hover:bg-white/5 text-[#8A8A8A] hover:text-white">
                <Trash2 size={14} />
              </button>
              <button onClick={() => router.push("/copilot")} title="Open full workspace" className="p-1.5 rounded-lg hover:bg-white/5 text-[#8A8A8A] hover:text-white">
                <ChevronDown size={14} className="rotate-[-90deg]" />
              </button>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-white/5 text-[#8A8A8A] hover:text-white">
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.length === 0 && (
              <div className="text-center py-8 px-2">
                <Sparkles size={24} className="text-purple-400 mx-auto mb-3 animate-pulse" />
                <p className="text-xs text-[#CFCFCF] leading-relaxed">
                  Ask business or technical questions. I have live access to your customers, campaigns, and analytics.
                </p>
                <div className="flex flex-wrap gap-1.5 mt-4 justify-center">
                  {QUICK_CHIPS.map(c => (
                    <button key={c.label} onClick={() => send(c.prompt)} className="chip text-[10px] py-1 border-white/10 hover:border-white/25">
                      {c.label}
                    </button>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t border-white/[0.04]">
                  <div className="text-[9px] text-[#8A8A8A] uppercase font-semibold mb-2">Technical</div>
                  <div className="flex flex-wrap gap-1.5 justify-center">
                    {TECH_CHIPS.map(c => (
                      <button key={c.label} onClick={() => send(c.prompt)} className="chip text-[10px] py-1 border-white/10 hover:border-white/25 font-mono">
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={clsx("text-xs", m.role === "user" ? "flex justify-end" : "")}>
                {m.role === "user" ? (
                  <div className="bg-white/10 border border-white/10 rounded-2xl rounded-tr-sm px-3 py-2 max-w-[85%] text-white">
                    {m.content}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {m.toolSteps && m.toolSteps.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {m.toolSteps.map((t, ti) => (
                          <span key={ti} className="inline-flex items-center gap-1 text-[9px] text-emerald-400/80 bg-emerald-500/5 border border-emerald-500/10 rounded px-1.5 py-0.5">
                            <Wrench size={8} /> {t.tool}
                          </span>
                        ))}
                      </div>
                    )}
                    <div
                      className="text-[#CFCFCF] leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(m.content) }}
                    />
                    {m.suggestedActions && m.suggestedActions.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {m.suggestedActions.map((a, ai) => (
                          <button
                            key={ai}
                            onClick={() => a.type === "campaign" ? router.push(`/copilot?prompt=${encodeURIComponent(a.prompt)}`) : send(a.prompt)}
                            className="chip text-[9px] py-1 border-purple-500/20 text-purple-300 hover:border-purple-500/40"
                          >
                            {a.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="space-y-1.5">
                {toolSteps.map((t, i) => (
                  <div key={i} className="text-[10px] text-purple-300/80 font-mono animate-fade-in">{t}</div>
                ))}
                <div className="flex items-center gap-2 text-[10px] text-[#8A8A8A]">
                  <Loader2 size={12} className="animate-spin text-purple-400" />
                  Thinking...
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="px-3 py-3 border-t border-white/[0.06]">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && send()}
                placeholder="Ask anything about your CRM..."
                className="input text-xs flex-1 py-2 h-9"
                disabled={loading}
              />
              <button onClick={() => send()} disabled={loading || !input.trim()} className="btn-primary h-9 px-3">
                {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
