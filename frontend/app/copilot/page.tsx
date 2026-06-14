"use client";
import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Send, Sparkles, Rocket, ChevronDown, ChevronUp, ChevronRight, Brain, Loader2, MessageSquare, CheckCircle2, Play } from "lucide-react";
import type { CampaignDraft } from "@xenopilot/shared";
import clsx from "clsx";
import { ThinkingTimeline } from "@/components/ThinkingTimeline";
import { MessagePreviewPanel } from "@/components/MessagePreviewPanel";
import { ExecutionTimelineModal } from "@/components/ExecutionTimelineModal";
import { ExecutionLogPanel } from "@/components/ExecutionLogPanel";
import { useAnimatedThinkingTimeline } from "@/hooks/useAnimatedThinkingTimeline";

const STARTERS = [
  "Hi",
  "How many customers do we have?",
  "Show me insights on campaign performance",
  "Who are my top customers by lifetime value?",
  "Find at-risk shoppers with churn over 50%"
];

type Message = {
  role: "user" | "assistant";
  content: string;
  draft?: CampaignDraft | null;
  reasoning?: string[];
  thinkingSteps?: string[];
  chatMode?: "casual" | "task";
  timestamp: string;
};

export default function CopilotPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-white/50">Loading Copilot...</div>}>
      <CopilotContent />
    </Suspense>
  );
}

function CopilotContent() {
  const params = useSearchParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [casualLoading, setCasualLoading] = useState(false);
  const [chatMode, setChatMode] = useState<"casual" | "task" | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [launchedCampaigns, setLaunchedCampaigns] = useState<Set<string>>(new Set());
  const [thinkingSteps, setThinkingSteps] = useState<string[]>([]);
  const [expandedReasoning, setExpandedReasoning] = useState<number | null>(null);
  const [activeTabs, setActiveTabs] = useState<Record<number, "A" | "B" | "C">>({});
  const [showRawLogs, setShowRawLogs] = useState(false);
  const [timelineSteps, setTimelineSteps] = useState<any[]>([]);
  const { steps: launchSteps, durationMs: launchDuration, running: launchRunning, runWithTimeline } = useAnimatedThinkingTimeline();
  const [showLaunchTimeline, setShowLaunchTimeline] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = params.get("q");
    if (q && messages.length === 0) {
      setInput(q);
      chat(q);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, thinkingSteps]);

  async function chat(text?: string) {
    const msg = text ?? input;
    if (!msg.trim()) return;
    setLoading(true);
    setInput("");
    setThinkingSteps([]);
    setTimelineSteps([]);
    setChatMode(null);
    const likelyCasual = /^(hi|hello|hey|thanks|help|how many|how are you|who are you|status|overview|good morning|good afternoon)/i.test(msg.trim());
    setCasualLoading(likelyCasual);

    const userMsg: Message = { role: "user", content: msg, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);

    setThinkingSteps(likelyCasual ? ["💬 Thinking..."] : ["🔍 Initializing AI Engine..."]);

    try {
      const url = new URL("/api/agent/stream", window.location.origin);
      url.searchParams.set("message", msg);
      if (sessionId) url.searchParams.set("sessionId", sessionId);

      const eventSource = new EventSource(url.toString());

      eventSource.onmessage = (e) => {
        const data = JSON.parse(e.data);
        if (data.type === "timeline") {
          setTimelineSteps(data.steps ?? []);
        } else if (data.type === "thought") {
          setThinkingSteps(prev => {
            if (!data.step) return prev;
            let txt = "";
            if (data.step.action) {
              txt = `⚙️ [${data.step.action}] ${data.step.description || ""}`;
            } else if (data.step.phase) {
              txt = `🤖 [${data.step.phase}] ${data.step.conclusion || data.step.observation || ""}`;
            } else {
              txt = data.step.title || data.step.detail || "Thinking...";
            }
            return [...prev, txt];
          });
        } else if (data.type === "done") {
          eventSource.close();
          const result = data.result;
          if (result.sessionId) setSessionId(result.sessionId);
          setChatMode(result.chatMode ?? "task");
          
          if (result.thinkingTimeline) setTimelineSteps(result.thinkingTimeline);
          setMessages(prev => [...prev, {
            role: "assistant",
            content: result.reply,
            draft: result.draft ?? null,
            reasoning: result.reasoning ?? [],
            thinkingSteps: result.thinkingSteps ?? [],
            chatMode: result.chatMode ?? "task",
            timestamp: new Date().toISOString()
          }]);
          setLoading(false);
          setCasualLoading(false);
          setThinkingSteps([]);
        } else if (data.type === "error") {
          eventSource.close();
          fallbackChat(msg);
        }
      };

      eventSource.onerror = () => {
        eventSource.close();
        fallbackChat(msg);
      };
    } catch {
      await fallbackChat(msg);
    }
  }

  async function fallbackChat(msg: string) {
    try {
      const r = await fetch("/api/agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, sessionId })
      });
      const result = await r.json();
      if (result.sessionId) setSessionId(result.sessionId);
      setChatMode(result.chatMode ?? "task");
      setMessages(prev => [...prev, {
        role: "assistant",
        content: result.reply ?? "Sorry, something went wrong.",
        draft: result.draft ?? null,
        reasoning: result.reasoning ?? [],
        thinkingSteps: result.thinkingSteps ?? [],
        chatMode: result.chatMode ?? "task",
        timestamp: new Date().toISOString()
      }]);
    } catch {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Sorry, something went wrong. Please try again.",
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setLoading(false);
      setCasualLoading(false);
      setThinkingSteps([]);
    }
  }

  async function launch(draft: CampaignDraft, msgIdx: number) {
    setShowLaunchTimeline(true);
    try {
      await runWithTimeline(async () => {
        const create = await fetch("/api/campaigns", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ draft })
        });
        const campaign = await create.json();
        await fetch(`/api/campaigns/${campaign.id}/launch`, { method: "POST" });
        setLaunchedCampaigns(prev => new Set([...prev, String(msgIdx)]));
      }, { includeLaunch: true, goal: `Launch: ${draft.goal}` });
    } finally {
      setLoading(false);
    }
  }

  // Get current execution phase based on raw log contents
  const getPhaseStatus = (phaseIndex: number) => {
    // 0: Intent, 1: Audience, 2: Channel, 3: Message, 4: Forecast
    const hasLogMatch = (keywords: string[]) => 
      thinkingSteps.some(step => keywords.some(k => step.toLowerCase().includes(k)));

    const currentPhase = 
      hasLogMatch(["forecast", "simulation", "expected_revenue"]) ? 4 :
      hasLogMatch(["variant", "generate_message", "subject"]) ? 3 :
      hasLogMatch(["channel", "whatsapp", "sms", "email", "rcs"]) ? 2 :
      hasLogMatch(["segment", "audience", "count", "customer"]) ? 1 : 0;

    if (currentPhase > phaseIndex) return "completed";
    if (currentPhase === phaseIndex) return "active";
    return "pending";
  };

  return (
    <div className="flex flex-col h-[calc(100vh-48px)]">
      {/* Header */}
      <div className="shrink-0 mb-6 animate-fade-in flex items-center justify-between border-b border-white/[0.04] pb-4">
        <div>
          <h1 className="flex items-center gap-2.5 text-xl font-bold text-white">
            <div className="grid h-7 w-7 place-items-center rounded-lg bg-white/5 border border-white/10">
              <Brain size={14} className="text-white" />
            </div>
            <span>AI Copilot Workspace</span>
          </h1>
          <p className="mt-1 text-xs text-[#8A8A8A]">
            Chat naturally or describe a marketing goal — I'll answer questions and build campaigns in real time.
          </p>
        </div>
        {sessionId && (
          <div className="text-[10px] font-mono text-white/40 bg-white/[0.03] border border-white/[0.06] rounded-md px-2 py-1">
            Session: {sessionId.substring(0, 8)}...
          </div>
        )}
      </div>

      {/* Chat messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-6 pb-6 pr-2">
        {messages.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center h-full text-center animate-fade-in py-12">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-[#141414] border border-white/8 mb-4">
              <Sparkles size={20} className="text-white/60 animate-pulse" />
            </div>
            <h2 className="text-base font-bold text-white mb-2">Hi! I'm your AI marketing copilot.</h2>
            <p className="text-xs text-[#8A8A8A] max-w-sm mb-6 leading-relaxed">
              Say <strong className="text-white/80">hi</strong>, ask about your customers, or describe a campaign goal — I'll respond instantly with live data from your CRM.
            </p>
            <div className="flex flex-col gap-2 w-full max-w-md">
              {STARTERS.map(s => (
                <button 
                  key={s} 
                  onClick={() => { setInput(s); chat(s); }}
                  className="glass p-3 text-xs text-left text-white/70 hover:text-white border-white/[0.04] hover:border-white/15 transition-all text-center flex items-center justify-between group"
                >
                  <span className="truncate">{s}</span>
                  <ChevronRight size={12} className="text-white/20 group-hover:text-white transition-colors" />
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={clsx("animate-slide-up space-y-4", msg.role === "user" ? "flex flex-col items-end" : "flex flex-col items-start")}>
            {msg.role === "user" ? (
              <div className="max-w-xl rounded-2xl rounded-tr-md bg-white/[0.04] border border-white/[0.08] px-4 py-3 text-xs text-white font-medium">
                {msg.content}
              </div>
            ) : (
              <div className="w-full max-w-3xl space-y-4">
                {/* AI Text Bubble */}
                <div className="glass p-5 bg-gradient-to-b from-white/[0.01] to-transparent border-white/[0.06]">
                  <div className="flex items-center gap-2 mb-3 border-b border-white/[0.03] pb-2.5">
                    <div className="h-5 w-5 rounded-md bg-[#F5F5F5] grid place-items-center shrink-0">
                      <Sparkles size={11} className="text-black fill-black" />
                    </div>
                    <span className="text-xs font-semibold text-white/70">Pulse Assistant</span>
                  </div>
                  
                  <div 
                    className="text-xs leading-relaxed whitespace-pre-wrap text-[#CFCFCF]"
                    dangerouslySetInnerHTML={{ __html: msg.content.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>') }}
                  />

                  {/* Reasoning steps dropdown */}
                  {msg.reasoning && msg.reasoning.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-white/[0.03]">
                      <button
                        onClick={() => setExpandedReasoning(expandedReasoning === i ? null : i)}
                        className="flex items-center gap-2 text-[11px] text-[#8A8A8A] hover:text-white transition-colors"
                      >
                        <Brain size={12} />
                        <span>AI Reasoning Chain ({msg.reasoning.length} operations)</span>
                        {expandedReasoning === i ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      </button>
                      {expandedReasoning === i && (
                        <div className="mt-3 space-y-2.5 pl-3 border-l border-white/10 animate-fade-in">
                          {msg.reasoning.map((step, si) => (
                            <div key={si} className="text-[11px] text-[#8A8A8A] leading-relaxed"
                              dangerouslySetInnerHTML={{ __html: step.replace(/\*\*(.*?)\*\*/g, '<strong class="text-[#CFCFCF]">$1</strong>') }}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Campaign Config & Draft Card */}
                {msg.draft && (
                  <div className="glass p-6 border-white/[0.08] bg-[#121212]/80 space-y-5 animate-scale-in">
                    <div className="flex items-center justify-between border-b border-white/[0.04] pb-3.5">
                      <h3 className="font-semibold flex items-center gap-2 text-xs uppercase tracking-wider text-white">
                        <Rocket size={14} className="text-white/60" /> Proposed Campaign Configuration
                      </h3>
                      <span className="badge badge-success text-[10px]">Ready to launch</span>
                    </div>

                    {/* Rich KPIs Forecast Grid */}
                    <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
                      {[
                        { 
                          label: "Audience size", 
                          value: msg.draft.segment.count.toLocaleString("en-IN"), 
                          sub: "Target segment" 
                        },
                        { 
                          label: "Channel Rec", 
                          value: msg.draft.channel.recommended, 
                          sub: `${Math.round(msg.draft.channel.confidence * 100)}% confidence` 
                        },
                        { 
                          label: "Expected open", 
                          value: `${Math.round(msg.draft.forecast.openRate * 100)}%`, 
                          sub: "Predicted rate" 
                        },
                        { 
                          label: "Est. Revenue", 
                          value: `₹${Math.round(msg.draft.forecast.revenue).toLocaleString("en-IN")}`, 
                          sub: "Predicted yield" 
                        },
                      ].map(m => (
                        <div key={m.label} className="glass-inner p-3 bg-white/[0.01]">
                          <div className="text-[9px] text-[#8A8A8A] uppercase tracking-wider font-semibold">{m.label}</div>
                          <div className="text-base font-bold mt-1 text-white font-mono">{m.value}</div>
                          <div className="text-[9px] text-[#8A8A8A] mt-0.5">{m.sub}</div>
                        </div>
                      ))}
                    </div>

                    {/* A/B/C Copy Variants Tabs */}
                    <div className="glass-inner p-4 bg-white/[0.01] space-y-3">
                      <div className="flex items-center justify-between border-b border-white/[0.04] pb-2">
                        <span className="text-[9px] text-[#8A8A8A] uppercase tracking-wider font-semibold">
                          Generated Message Variants
                        </span>
                        
                        <div className="flex gap-1.5">
                          {(["A", "B", "C"] as const).map((variant) => {
                            const active = (activeTabs[i] ?? "A") === variant;
                            return (
                              <button
                                key={variant}
                                type="button"
                                onClick={() => setActiveTabs(prev => ({ ...prev, [i]: variant }))}
                                className={clsx(
                                  "px-2.5 py-0.5 rounded text-[10px] font-semibold transition-all border",
                                  active 
                                    ? "bg-white text-black border-white" 
                                    : "bg-transparent text-[#8A8A8A] border-white/[0.06] hover:border-white/20"
                                )}
                              >
                                Variant {variant}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="text-xs text-[#CFCFCF] leading-relaxed bg-[#0a0a0a]/30 p-3 rounded-lg border border-white/[0.02] min-h-[50px] whitespace-pre-wrap">
                        {(activeTabs[i] ?? "A") === "A" && msg.draft.messages.variantA}
                        {(activeTabs[i] ?? "A") === "B" && msg.draft.messages.variantB}
                        {(activeTabs[i] ?? "A") === "C" && msg.draft.messages.variantC}
                      </div>
                    </div>

                    {/* Segment reasons — Explainability */}
                    <div className="glass-inner p-3 border-emerald-500/10">
                      <div className="text-[9px] text-emerald-400 uppercase font-semibold mb-1.5">Why was this selected?</div>
                      <div className="flex flex-wrap gap-1.5">
                        {msg.draft.segment.reasoning.map(r => (
                          <span key={r} className="chip text-[10px] py-0.5 border-emerald-500/20 text-emerald-300">
                            ✓ {r}
                          </span>
                        ))}
                      </div>
                    </div>

                    <MessagePreviewPanel
                      goal={msg.draft.goal}
                      variants={{
                        a: msg.draft.messages.variantA,
                        b: msg.draft.messages.variantB,
                        c: msg.draft.messages.variantC
                      }}
                    />

                    {/* Control launch block */}
                    {!launchedCampaigns.has(String(i)) ? (
                      <button
                        onClick={() => launch(msg.draft!, i)}
                        disabled={loading || msg.draft!.segment.count === 0}
                        className="btn-primary w-full flex items-center justify-center gap-2 text-xs py-2.5"
                      >
                        <Play size={12} className="fill-black" />
                        Execute campaign to {msg.draft.segment.count.toLocaleString("en-IN")} customers
                      </button>
                    ) : (
                      <div className="flex items-center gap-2 text-[#22C55E] text-xs p-3 glass-inner bg-green-500/[0.01] border-green-500/10 font-semibold rounded-lg">
                        <CheckCircle2 size={14} className="text-green-500 shrink-0" />
                        Campaign generated & dispatched. Monitor real-time outcomes on the Campaigns board.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {/* Simple loader for chat messages */}
        {loading && casualLoading && (
          <div className="flex items-center gap-2 text-xs text-[#8A8A8A] animate-fade-in pl-1">
            <Loader2 size={13} className="animate-spin text-purple-400" />
            <span>Thinking...</span>
          </div>
        )}

        {/* Phase-based Processing thinking UI — campaign tasks only */}
        {loading && !casualLoading && timelineSteps.length > 0 && (
          <div className="glass p-5 max-w-3xl border-white/[0.08] animate-fade-in">
            <div className="text-xs font-semibold text-white/80 uppercase tracking-wide mb-4 flex items-center gap-2">
              <Loader2 size={13} className="text-purple-400 animate-spin" />
              AI Thinking Timeline
            </div>
            <ThinkingTimeline steps={timelineSteps} compact />
          </div>
        )}

        {loading && !casualLoading && thinkingSteps.length > 0 && timelineSteps.length === 0 && (
          <div className="glass p-5 max-w-3xl border-white/[0.08] bg-[#101010]/80 space-y-4 animate-fade-in">
            <div className="flex items-center justify-between border-b border-white/[0.04] pb-2.5">
              <div className="flex items-center gap-2">
                <Loader2 size={13} className="text-purple-400 animate-spin" />
                <span className="text-xs font-semibold text-white/80 uppercase tracking-wide">
                  AI Marketing Operator Orchestration
                </span>
              </div>
              <button 
                onClick={() => setShowRawLogs(!showRawLogs)}
                className="text-[10px] text-[#8A8A8A] hover:text-white flex items-center gap-1 font-mono transition-colors"
              >
                {showRawLogs ? "Hide raw events" : "Show raw events"}
                {showRawLogs ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
              </button>
            </div>

            {/* Structured o1-style phase checkpoints */}
            <div className="grid gap-3 grid-cols-1 md:grid-cols-5">
              {[
                { name: "Parse Objective", key: "intent" },
                { name: "Audience Target", key: "segment" },
                { name: "Optimize Channel", key: "channel" },
                { name: "Write Copy", key: "copy" },
                { name: "Simulate Yield", key: "forecast" }
              ].map((phase, idx) => {
                const status = getPhaseStatus(idx);
                return (
                  <div 
                    key={phase.name} 
                    className={clsx(
                      "p-3 rounded-lg border text-center transition-all",
                      status === "completed" && "bg-green-500/[0.03] border-green-500/20 text-[#22C55E]",
                      status === "active" && "bg-purple-500/[0.03] border-purple-500/30 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.05)]",
                      status === "pending" && "bg-transparent border-white/[0.03] text-white/30"
                    )}
                  >
                    <div className="text-[10px] font-bold tracking-tight">{phase.name}</div>
                    <div className="mt-1 flex items-center justify-center">
                      {status === "completed" && <CheckCircle2 size={12} className="text-[#22C55E]" />}
                      {status === "active" && <Loader2 size={12} className="animate-spin text-purple-400" />}
                      {status === "pending" && <span className="h-1.5 w-1.5 rounded-full bg-white/20" />}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Expandable Raw log records */}
            {showRawLogs && (
              <div className="p-3 rounded-lg bg-black/40 border border-white/[0.03] max-h-36 overflow-y-auto space-y-1 font-mono text-[9px] text-[#8A8A8A] animate-fade-in">
                {thinkingSteps.map((step, idx) => (
                  <div key={idx} className="truncate">{step}</div>
                ))}
              </div>
            )}
            
            <div className="flex gap-1 items-center pl-1">
              <span className="text-[10px] text-[#8A8A8A] mr-2">Orchestrating workflows...</span>
              <span className="thinking-dot" />
              <span className="thinking-dot" />
              <span className="thinking-dot" />
            </div>
          </div>
        )}
      </div>

      {/* Footer message prompt panel */}
      <details className="shrink-0 mb-3 glass p-3 border-white/[0.04]">
        <summary className="text-[10px] font-semibold text-white/60 uppercase tracking-widest cursor-pointer">AI Execution Logs</summary>
        <div className="mt-3"><ExecutionLogPanel /></div>
      </details>
      <div className="shrink-0 pt-4 border-t border-white/[0.04]" style={{ borderColor: "var(--border)" }}>
        <div className="flex gap-2.5">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && chat()}
            placeholder="Say hi, ask a question, or describe a campaign goal..."
            className="input text-xs"
            disabled={loading}
          />
          <button 
            onClick={() => chat()} 
            disabled={loading || !input.trim()} 
            className="btn-primary flex items-center gap-1.5 shrink-0 text-xs px-5"
          >
            {loading ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
            <span>{loading ? "Sending..." : "Send"}</span>
          </button>
        </div>
      </div>

      <ExecutionTimelineModal
        open={showLaunchTimeline && (launchRunning || launchSteps.some(s => s.status === "completed"))}
        title="AI Thinking Timeline — Execute Campaign"
        steps={launchSteps}
        durationMs={launchDuration}
        onClose={() => setShowLaunchTimeline(false)}
      />
    </div>
  );
}
