"use client";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  Sparkles, Users, Megaphone, TrendingUp, AlertTriangle,
  ArrowRight, Zap, Target, DollarSign, Activity, ChevronRight,
  Terminal, Sliders, RefreshCw
} from "lucide-react";
import clsx from "clsx";

async function fetchOverview() {
  const r = await fetch("/api/analytics/overview");
  if (!r.ok) throw new Error("API error");
  return r.json();
}

async function fetchCampaigns() {
  const r = await fetch("/api/campaigns");
  if (!r.ok) throw new Error("API error");
  return r.json();
}

export default function DashboardPage() {
  const router = useRouter();
  const [promptInput, setPromptInput] = useState("");
  const [greeting, setGreeting] = useState("Good day");
  const [simulationProfile, setSimulationProfile] = useState("standard");
  const [filterType, setFilterType] = useState<"ALL" | "CONVERTED" | "FAILED">("ALL");

  // Load active simulation profile
  useEffect(() => {
    fetch("/api/settings/simulation-profile")
      .then((res) => res.json())
      .then((data) => {
        if (data.profile) setSimulationProfile(data.profile);
      })
      .catch((err) => console.error(err));
  }, []);

  const changeSimulationProfile = async (profile: string) => {
    setSimulationProfile(profile);
    try {
      await fetch("/api/settings/simulation-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile })
      });
    } catch (err) {
      console.error("Failed to update simulation profile", err);
    }
  };

  // Poll live events
  const { data: liveEvents, isLoading: isEventsLoading } = useQuery({
    queryKey: ["liveEvents"],
    queryFn: async () => {
      const r = await fetch("/api/analytics/live-events");
      if (!r.ok) throw new Error("API error");
      return r.json();
    },
    refetchInterval: 2500
  });
  
  const { data: overview, isLoading: isOverviewLoading, error, refetch: refetchOverview } = useQuery({ 
    queryKey: ["overview"], 
    queryFn: fetchOverview, 
    refetchInterval: 10000 
  });

  const { data: campaigns, isLoading: isCampaignsLoading, refetch: refetchCampaigns } = useQuery({
    queryKey: ["campaigns"],
    queryFn: fetchCampaigns,
    refetchInterval: 10000
  });

  useEffect(() => {
    const hr = new Date().getHours();
    if (hr < 12) setGreeting("Good morning");
    else if (hr < 17) setGreeting("Good afternoon");
    else setGreeting("Good evening");
  }, []);

  async function seed() {
    await fetch("/api/seed", { 
      method: "POST", 
      body: JSON.stringify({ customers: 5000 }), 
      headers: { "Content-Type": "application/json" } 
    });
    refetchOverview();
    refetchCampaigns();
  }

  const handlePromptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptInput.trim()) return;
    router.push(`/copilot?q=${encodeURIComponent(promptInput.trim())}`);
  };

  const k = overview?.kpis;
  const health = overview?.customerHealth;
  const runningCampaigns = campaigns?.filter((c: any) => c.status === "RUNNING") || [];
  
  const kpiCards = [
    { 
      label: "Total Customers", 
      value: k?.customers, 
      icon: Users, 
      format: (v: number) => v?.toLocaleString("en-IN") ?? "0" 
    },
    { 
      label: "Active Campaigns", 
      value: k?.running, 
      icon: Activity, 
      format: (v: number) => v ?? "0" 
    },
    { 
      label: "Total Revenue", 
      value: k?.revenue, 
      icon: DollarSign, 
      format: (v: number) => `₹${Math.round(v ?? 0).toLocaleString("en-IN")}` 
    },
    { 
      label: "Conversion Rate", 
      value: k?.conversionRate, 
      icon: TrendingUp, 
      format: (v: number) => `${v ?? 0}%` 
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header section */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.04] pb-6">
        <div>
          <div className="flex items-center gap-2.5 text-xs text-[#8A8A8A]">
            <span className="live-dot" />
            <span className="uppercase tracking-widest font-semibold">System status: active</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white mt-1.5 font-sans">
            {greeting}, Admin
          </h1>
          <p className="mt-1 text-sm text-[#8A8A8A]">
            Here is the live calibration of XenoPilot marketing operations.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Simulation profile control */}
          <div className="flex items-center gap-2 bg-[#141414]/80 border border-white/[0.08] rounded-lg px-3 py-1 h-9">
            <Sliders size={12} className="text-[#8A8A8A]" />
            <select
              value={simulationProfile}
              onChange={(e) => changeSimulationProfile(e.target.value)}
              className="bg-transparent text-[11px] text-[#CFCFCF] border-0 focus:outline-none focus:ring-0 cursor-pointer font-medium font-mono uppercase tracking-wider"
              style={{ background: "transparent", border: "none" }}
            >
              <option value="standard" className="bg-[#141414] text-[#CFCFCF]">Standard Sim</option>
              <option value="black-friday" className="bg-[#141414] text-green-400">Black Friday (20x Speed)</option>
              <option value="outage" className="bg-[#141414] text-red-400">Carrier Outage (100% Fail)</option>
              <option value="high-churn" className="bg-[#141414] text-amber-400">Low Engagement</option>
            </select>
          </div>

          <button onClick={seed} className="btn-secondary text-xs h-9">
            Seed Demo Data
          </button>
          
          <Link href="/copilot" className="btn-primary inline-flex items-center gap-2 text-xs h-9">
            <Sparkles size={14} className="fill-black" />
            Open Workspace
          </Link>
        </div>
      </div>

      {error && (
        <div className="glass border-red-500/30 p-4 text-red-300 text-sm flex items-center gap-2.5">
          <AlertTriangle size={18} className="text-red-400 shrink-0" />
          <span>
            Backend connection issue. Make sure the database matches. Push using:{" "}
            <code className="text-white bg-white/10 px-1.5 py-0.5 rounded">npm run db:push</code>
          </span>
        </div>
      )}

      {/* Inline AI Prompt Bar */}
      <div className="glass p-6 relative overflow-hidden bg-gradient-to-r from-white/[0.01] to-transparent border-white/[0.07]">
        <div className="absolute top-0 right-0 w-[400px] h-[300px] bg-purple-500/5 rounded-full blur-[100px] pointer-events-none -z-10" />
        <h2 className="text-sm font-semibold text-white/80 tracking-wide uppercase mb-3 flex items-center gap-2">
          <Sparkles size={14} className="text-[#8A8A8A]" />
          Command the AI Operator
        </h2>
        <form onSubmit={handlePromptSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              placeholder="e.g., Run a win-back campaign for dormant shoppers who haven't ordered in 45 days..."
              className="input pl-11 text-sm placeholder-white/30"
            />
            <Sparkles size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
          </div>
          <button type="submit" className="btn-primary flex items-center gap-2 text-sm px-6">
            Execute <ArrowRight size={14} />
          </button>
        </form>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs text-[#8A8A8A] mr-1">Or select recommended:</span>
          {[
            "Win back dormant customers",
            "Target high churn-risk shoppers",
            "VIP loyalty rewards series"
          ].map((s) => (
            <button 
              key={s} 
              type="button"
              onClick={() => setPromptInput(s)}
              className="chip text-[11px] py-1 border-white/[0.05] hover:border-white/25 transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* KPI ribbon */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((c, i) => (
          <div 
            key={c.label} 
            className={clsx(
              "glass p-6 hover:border-white/15 transition-all duration-300",
              "bg-gradient-to-b from-white/[0.02] to-transparent"
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#8A8A8A] uppercase tracking-wider">{c.label}</span>
              <c.icon size={15} className="text-white/30" />
            </div>
            <div className="mt-3 text-3xl font-bold tracking-tight text-white font-mono">
              {isOverviewLoading ? (
                <div className="h-8 w-24 bg-white/5 animate-pulse rounded" />
              ) : (
                c.format(c.value)
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Middle row: Live Campaign Feed & Customer Health */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Live Campaign Feed (Left & Center) */}
        <div className="lg:col-span-2 glass p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-semibold text-white/80 tracking-wide uppercase flex items-center gap-2">
              <Megaphone size={14} className="text-[#8A8A8A]" />
              Live Campaign Feed
            </h2>
            <Link href="/campaigns" className="text-xs text-[#8A8A8A] hover:text-white flex items-center gap-1">
              View All <ChevronRight size={12} />
            </Link>
          </div>

          {isCampaignsLoading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="h-16 w-full bg-white/5 animate-pulse rounded-xl" />
              ))}
            </div>
          ) : runningCampaigns.length > 0 ? (
            <div className="space-y-4">
              {runningCampaigns.map((c: any) => {
                const sent = c.analytics?.sent ?? 0;
                const delivered = c.analytics?.delivered ?? 0;
                const pct = sent > 0 ? Math.round((delivered / sent) * 100) : 0;
                return (
                  <Link 
                    key={c.id} 
                    href={`/campaigns/${c.id}`}
                    className="glass-inner glass-hover p-4 flex flex-wrap items-center justify-between gap-4 border-white/[0.04]"
                  >
                    <div className="flex-1 min-w-[200px]">
                      <div className="flex items-center gap-2">
                        <span className="live-dot" />
                        <span className="font-semibold text-sm text-white truncate max-w-[280px]">
                          {c.goal}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-xs text-[#8A8A8A]">
                        <span className="uppercase font-mono bg-white/[0.04] px-2 py-0.5 rounded text-[10px]">
                          {c.recommendedChannel}
                        </span>
                        <span>{c.totalRecipients.toLocaleString("en-IN")} recipients</span>
                      </div>
                    </div>
                    
                    <div className="w-[180px] flex flex-col justify-end gap-1.5">
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-[#8A8A8A]">Progress</span>
                        <span className="text-white font-medium">{pct}%</span>
                      </div>
                      <div className="score-bar">
                        <div className="score-fill score-fill-accent" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="glass-inner p-8 text-center flex flex-col items-center justify-center border-dashed border-white/[0.06]">
              <Megaphone size={24} className="text-white/20 mb-3" />
              <p className="text-sm text-[#8A8A8A] font-medium">No active campaigns running right now.</p>
              <p className="text-xs text-white/30 mt-1 max-w-sm">
                Describe a business objective above or open the Copilot workspace to design and launch one.
              </p>
            </div>
          )}
        </div>

        {/* Customer Health Distribution (Right) */}
        <div className="glass p-6">
          <h2 className="text-sm font-semibold text-white/80 tracking-wide uppercase mb-5 flex items-center gap-2">
            <Target size={14} className="text-[#8A8A8A]" />
            Customer Health
          </h2>
          {isOverviewLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 w-full bg-white/5 animate-pulse rounded" />
              ))}
            </div>
          ) : health ? (
            <div className="space-y-4">
              {[
                { label: "Healthy", count: health.healthy, pct: Math.round((health.healthy / Math.max(1, health.total)) * 100), color: "score-fill-success" },
                { label: "At Risk", count: health.atRisk, pct: Math.round((health.atRisk / Math.max(1, health.total)) * 100), color: "score-fill-warning" },
                { label: "Churning", count: health.churning, pct: Math.round((health.churning / Math.max(1, health.total)) * 100), color: "score-fill-danger" },
              ].map(item => (
                <div key={item.label} className="p-3 glass-inner border-white/[0.04]">
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-white/60 font-medium">{item.label}</span>
                    <span className="font-mono text-white font-semibold">
                      {item.count.toLocaleString("en-IN")}{" "}
                      <span className="text-[#8A8A8A] font-normal">({item.pct}%)</span>
                    </span>
                  </div>
                  <div className="score-bar">
                    <div className={clsx("score-fill", item.color)} style={{ width: `${item.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center py-8">
              <span className="text-xs text-[#8A8A8A]">No data loaded. Seed to begin.</span>
            </div>
          )}
        </div>
      </div>

      {/* Live Operational Telemetry Stream (Terminal UI) */}
      <div className="glass p-6 bg-[#080808]/90 border-white/[0.07] space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.04] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="relative flex items-center justify-center">
              <span className="absolute inline-flex h-2 w-2 rounded-full bg-green-500 opacity-75 animate-ping" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-white uppercase tracking-widest font-mono flex items-center gap-1.5">
                <Terminal size={12} className="text-[#8A8A8A]" />
                Live Telemetry pipeline
              </h2>
              <p className="text-[10px] text-[#8A8A8A] font-mono mt-0.5">
                Monitoring active callbacks from @xenopilot/channel-service
              </p>
            </div>
          </div>

          {/* Filtering buttons */}
          <div className="flex gap-1.5">
            {(["ALL", "CONVERTED", "FAILED"] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setFilterType(filter)}
                className={clsx(
                  "px-2.5 py-1 rounded text-[10px] font-mono transition-all border",
                  filterType === filter
                    ? "bg-white text-black border-white"
                    : "bg-transparent text-[#8A8A8A] border-white/[0.05] hover:border-white/20"
                )}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable logs area */}
        <div 
          className="font-mono text-[11px] leading-relaxed max-h-[260px] overflow-y-auto space-y-1.5 p-4 rounded-lg border border-white/[0.04] bg-[#030303]"
          style={{ scrollbarWidth: "thin" }}
        >
          {isEventsLoading && !liveEvents ? (
            <div className="text-center py-8 text-[#8A8A8A] animate-pulse flex items-center justify-center gap-2">
              <RefreshCw size={12} className="animate-spin" />
              Tapping telemetry feed...
            </div>
          ) : liveEvents?.length === 0 ? (
            <div className="text-center py-8 text-white/20">
              [SYSTEM] Telemetry pipeline clear. Awaiting campaign dispatches.
            </div>
          ) : (
            (() => {
              const filtered = liveEvents?.filter((ev: any) => {
                if (filterType === "ALL") return true;
                return ev.eventType === filterType;
              }) || [];
              
              if (filtered.length === 0) {
                return <div className="text-[#8A8A8A] text-center py-4">[SYSTEM] No telemetry matches filter.</div>;
              }

              return filtered.map((ev: any) => {
                let badgeColor = "text-[#8A8A8A]";
                let textColor = "text-white/60";
                let description = "";

                const ts = new Date(ev.timestamp).toLocaleTimeString();

                switch (ev.eventType) {
                  case "SENT":
                    badgeColor = "text-[#8A8A8A] bg-white/5 border-white/10";
                    textColor = "text-[#8A8A8A]";
                    description = `Dispatched ${ev.channel} message to ${ev.customerName} for Goal: "${ev.campaignGoal}"`;
                    break;
                  case "DELIVERED":
                    badgeColor = "text-teal-400 bg-teal-500/10 border-teal-500/20";
                    textColor = "text-white/80";
                    description = `Delivered to ${ev.customerName} via ${ev.channel} (Latency: ${ev.meta?.deliveryLatencyMs ?? 200}ms)`;
                    break;
                  case "OPENED":
                  case "READ":
                    badgeColor = "text-amber-400 bg-amber-500/10 border-amber-500/20";
                    textColor = "text-[#CFCFCF]";
                    description = `${ev.customerName} opened/read message (App: ${ev.meta?.app || "Mail Agent"}, Device: ${ev.meta?.device || "Desktop"}, IP: ${ev.meta?.ip || "Unknown"})`;
                    break;
                  case "CLICKED":
                    badgeColor = "text-orange-400 bg-orange-500/10 border-orange-500/20";
                    textColor = "text-white font-medium";
                    description = `${ev.customerName} clicked link in ${ev.channel} (Platform: ${ev.meta?.platform || "Mobile"})`;
                    break;
                  case "CONVERTED":
                    badgeColor = "text-green-400 bg-green-500/10 border-green-500/20 font-bold";
                    textColor = "text-green-300 font-semibold";
                    description = `Purchase complete! ${ev.customerName} ordered ${ev.meta?.itemsCount ?? 1} item(s) (+₹${Math.round(ev.meta?.orderAmount ?? 0).toLocaleString("en-IN")} via Stripe)`;
                    break;
                  case "FAILED":
                    badgeColor = "text-red-400 bg-red-500/10 border-red-500/20 font-bold";
                    textColor = "text-red-300";
                    description = `Delivery failed: ${ev.customerName} undelivered (${ev.meta?.errorText || ev.meta?.reason || "Carrier drop"}) [Code: ${ev.meta?.errorCode || "ERR_500"}]`;
                    break;
                }

                return (
                  <div key={ev.id} className="flex items-start gap-2 border-b border-white/[0.01] pb-1.5">
                    <span className="text-white/20 select-none shrink-0 font-medium font-sans">[{ts}]</span>
                    <span className={clsx("px-1.5 py-0.2 rounded border text-[9px] uppercase font-bold tracking-wider shrink-0", badgeColor)}>
                      {ev.eventType}
                    </span>
                    <span className={clsx("flex-1", textColor)}>
                      {description}
                    </span>
                  </div>
                );
              });
            })()
          )}
        </div>
      </div>

      {/* Bottom row: Recommended Actions & AI Insights */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recommended Actions */}
        <div className="glass p-6">
          <div className="flex items-center gap-2 mb-4">
            <Target size={14} className="text-[#8A8A8A]" />
            <h2 className="text-sm font-semibold text-white/80 tracking-wide uppercase">AI Recommended Actions</h2>
          </div>
          
          {isOverviewLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-16 w-full bg-white/5 animate-pulse rounded-xl" />
              ))}
            </div>
          ) : overview?.nextActions?.length > 0 ? (
            <div className="space-y-3">
              {overview.nextActions.slice(0, 3).map((a: any) => (
                <div 
                  key={a.type} 
                  className="glass-inner p-4 flex items-center justify-between gap-4 border-white/[0.04]"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={clsx(
                        "badge text-[9px] px-1.5 py-0.5", 
                        a.priority === "high" ? "badge-danger" : a.priority === "medium" ? "badge-warning" : "badge-info"
                      )}>
                        {a.priority ?? "medium"}
                      </span>
                      <span className="font-semibold text-sm text-white">{a.title}</span>
                    </div>
                    <p className="text-xs text-[#8A8A8A] mt-1">{a.detail}</p>
                    {a.impact > 0 && (
                      <div className="text-xs text-[#22C55E] mt-1 font-mono font-medium">
                        Est. revenue impact: +₹{a.impact.toLocaleString("en-IN")}
                      </div>
                    )}
                  </div>
                  
                  <button 
                    onClick={() => router.push(`/copilot?q=${encodeURIComponent(a.prompt)}`)}
                    className="btn-primary text-xs py-1.5 px-3 shrink-0 flex items-center gap-1.5"
                  >
                    Execute <Sparkles size={11} className="fill-black" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="glass-inner p-8 text-center text-[#8A8A8A] text-xs border-dashed border-white/[0.06]">
              No recommendations available. Load customer segments first.
            </div>
          )}
        </div>

        {/* AI Insights */}
        <div className="glass p-6">
          <div className="flex items-center gap-2 mb-4">
            <Zap size={14} className="text-[#8A8A8A]" />
            <h2 className="text-sm font-semibold text-white/80 tracking-wide uppercase">AI Insights</h2>
          </div>
          
          {isOverviewLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-4 w-full bg-white/5 animate-pulse rounded" />
              ))}
            </div>
          ) : overview?.insights?.length > 0 ? (
            <ul className="space-y-3">
              {overview.insights.map((insight: string, idx: number) => (
                <li key={idx} className="flex gap-3 text-xs leading-relaxed glass-inner p-3 border-white/[0.04]">
                  <Zap size={13} className="text-purple-400 shrink-0 mt-0.5" />
                  <span className="text-[#CFCFCF]">{insight}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="glass-inner p-8 text-center text-[#8A8A8A] text-xs border-dashed border-white/[0.06]">
              Insights will automatically generate once segment demographics update.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
