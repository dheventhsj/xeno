"use client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BarChart3, Zap, Target, TrendingUp, Users, ArrowUpRight, CheckCircle2, AlertTriangle, Activity, RefreshCw } from "lucide-react";
import Link from "next/link";
import clsx from "clsx";
import { seedRequestHeaders } from "@/lib/seed-client";

export default function AnalyticsPage() {
  const qc = useQueryClient();
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["overview"],
    queryFn: async () => {
      const r = await fetch("/api/analytics/overview");
      if (!r.ok) throw new Error("API error");
      return r.json();
    },
    refetchInterval: 15000
  });

  const k = data?.kpis;
  const health = data?.customerHealth;
  const funnel = data?.funnel;
  const channelPerf = data?.channelPerformance;
  const maxFunnel = funnel ? Math.max(...funnel.map((s: any) => s.count), 1) : 1;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.04] pb-6">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white flex items-center gap-2">
            <BarChart3 size={20} className="text-[#8A8A8A]" />
            Intelligence & Analytics
          </h1>
          <p className="text-xs text-[#8A8A8A] mt-1">
            Real-time campaign delivery telemetry, customer health status, and AI insights.
          </p>
        </div>
        <button 
          onClick={() => refetch()} 
          className="btn-secondary flex items-center gap-1.5 text-xs py-1.5 px-3"
        >
          <RefreshCw size={12} className={clsx(isLoading && "animate-spin")} />
          <span>Refresh stats</span>
        </button>
        {(k?.deliveryRate ?? 0) === 0 && (
          <button
            onClick={async () => {
              const r = await fetch("/api/analytics/seed-demo", { method: "POST", headers: seedRequestHeaders() });
              if (r.ok) await qc.invalidateQueries({ queryKey: ["overview"] });
            }}
            className="btn-primary text-xs py-1.5 px-3"
          >
            Load demo analytics
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 animate-slide-up">
        {[
          { label: "Delivery Rate", value: `${k?.deliveryRate ?? 0}%`, sub: "Successfully received" },
          { label: "Open Rate", value: `${k?.openRate ?? 0}%`, sub: "Read messages" },
          { label: "Click Rate", value: `${k?.clickRate ?? 0}%`, sub: "Link clicks" },
          { label: "Conversion Rate", value: `${k?.conversionRate ?? 0}%`, sub: "Purchase events triggered" },
        ].map((c, i) => (
          <div key={c.label} className="glass p-5 bg-gradient-to-b from-white/[0.01] to-transparent">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#8A8A8A] uppercase tracking-wider font-semibold">{c.label}</span>
              <TrendingUp size={14} className="text-white/20" />
            </div>
            <div className="text-2xl font-extrabold mt-2 text-white font-mono">
              {isLoading ? "—" : c.value}
            </div>
            <div className="text-[10px] text-[#8A8A8A] mt-1">{c.sub}</div>
          </div>
        ))}
      </div>

      {/* Funnel & Health */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Engagement Funnel */}
        {funnel && funnel[0]?.count > 0 ? (
          <div className="glass p-6">
            <h2 className="text-xs font-semibold text-white/70 uppercase tracking-widest mb-6 flex items-center gap-2">
              <Activity size={12} /> Funnel Drop-off Telemetry
            </h2>
            <div className="space-y-4">
              {funnel.map((stage: any, i: number) => {
                const width = Math.max(5, (stage.count / maxFunnel) * 100);
                const colors = ["bg-white", "bg-white/80", "bg-white/60", "bg-white/40", "bg-white/20"];
                const textColors = ["text-black", "text-black", "text-black", "text-white", "text-white"];
                const dropoff = i > 0 && funnel[i - 1].count > 0
                  ? Math.round(((funnel[i - 1].count - stage.count) / funnel[i - 1].count) * 100)
                  : 0;
                return (
                  <div key={stage.stage} className="flex items-center gap-4">
                    <div className="w-20 text-[10px] text-[#8A8A8A] text-right shrink-0 font-medium font-mono">{stage.stage}</div>
                    <div className="flex-1 bg-white/[0.02] border border-white/[0.04] h-7 rounded-lg overflow-hidden">
                      <div 
                        className={clsx("h-full flex items-center px-3 font-semibold transition-all duration-700", colors[i] || "bg-[#525252]", textColors[i] || "text-white")}
                        style={{ width: `${width}%` }}
                      >
                        <span className="text-[10px] font-mono">{stage.count.toLocaleString("en-IN")}</span>
                      </div>
                    </div>
                    <div className="w-16 shrink-0 text-left font-mono">
                      {dropoff > 0 ? (
                        <span className="text-xs text-red-400">-{dropoff}%</span>
                      ) : (
                        <span className="text-[10px] text-white/10">—</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="glass p-8 text-center text-[#8A8A8A] text-xs">
            Generate segment/campaign to calculate conversion funnel metrics.
          </div>
        )}

        {/* Customer Health */}
        {health ? (
          <div className="glass p-6 space-y-5">
            <div className="flex items-center gap-2 border-b border-white/[0.04] pb-3">
              <Users size={14} className="text-[#8A8A8A]" />
              <h2 className="text-xs font-semibold text-white/70 uppercase tracking-widest">Customer Health Distribution</h2>
            </div>
            
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Healthy", count: health.healthy, pct: Math.round((health.healthy / Math.max(1, health.total)) * 100), color: "text-green-400", bg: "bg-green-500" },
                { label: "At Risk", count: health.atRisk, pct: Math.round((health.atRisk / Math.max(1, health.total)) * 100), color: "text-amber-400", bg: "bg-amber-500" },
                { label: "Churning", count: health.churning, pct: Math.round((health.churning / Math.max(1, health.total)) * 100), color: "text-red-400", bg: "bg-red-500" },
              ].map(h => (
                <div key={h.label} className="glass-inner p-3 text-center bg-white/[0.01] border-white/[0.04]">
                  <div className={clsx("text-lg font-bold font-mono", h.color)}>
                    {isLoading ? "—" : h.count.toLocaleString("en-IN")}
                  </div>
                  <div className="text-[9px] text-[#8A8A8A] font-semibold uppercase mt-1">
                    {h.label} ({h.pct}%)
                  </div>
                </div>
              ))}
            </div>

            {/* Stacked bar */}
            <div className="h-2 rounded-full overflow-hidden flex bg-white/5 border border-white/[0.06]">
              <div className="bg-green-500 transition-all duration-700" style={{ width: `${(health.healthy / Math.max(1, health.total)) * 100}%` }} />
              <div className="bg-amber-500 transition-all duration-700" style={{ width: `${(health.atRisk / Math.max(1, health.total)) * 100}%` }} />
              <div className="bg-red-500 transition-all duration-700" style={{ width: `${(health.churning / Math.max(1, health.total)) * 100}%` }} />
            </div>
          </div>
        ) : null}
      </div>

      {/* Channel Performance table */}
      {channelPerf && channelPerf.length > 0 && (
        <div className="glass p-6 bg-[#0a0a0a]/60 border-white/[0.06]">
          <h2 className="text-xs font-semibold text-white/70 uppercase tracking-widest mb-4">Channel Performance Matrix</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/[0.06] bg-white/[0.01]" style={{ borderColor: "var(--border)" }}>
                  <th className="p-3 text-[#8A8A8A] font-semibold uppercase tracking-wider">Channel</th>
                  <th className="p-3 text-right text-[#8A8A8A] font-semibold uppercase tracking-wider">Sent</th>
                  <th className="p-3 text-right text-[#8A8A8A] font-semibold uppercase tracking-wider">Delivered</th>
                  <th className="p-3 text-right text-[#8A8A8A] font-semibold uppercase tracking-wider">Open Rate</th>
                  <th className="p-3 text-right text-[#8A8A8A] font-semibold uppercase tracking-wider">CTR</th>
                  <th className="p-3 text-right text-[#8A8A8A] font-semibold uppercase tracking-wider">Conversion</th>
                  <th className="p-3 text-right text-[#8A8A8A] font-semibold uppercase tracking-wider">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {channelPerf.map((ch: any) => (
                  <tr key={ch.channel} className="hover:bg-white/[0.01] transition-colors">
                    <td className="p-3 font-semibold text-white uppercase font-mono">{ch.channel}</td>
                    <td className="p-3 text-right text-[#CFCFCF] font-mono">{ch.sent.toLocaleString("en-IN")}</td>
                    <td className="p-3 text-right text-[#CFCFCF] font-mono">{ch.delivered.toLocaleString("en-IN")}</td>
                    <td className="p-3 text-right">
                      <span className={clsx("font-semibold font-mono", ch.openRate > 50 ? "text-green-400" : ch.openRate > 30 ? "text-amber-400" : "text-red-400")}>
                        {ch.openRate}%
                      </span>
                    </td>
                    <td className="p-3 text-right font-medium text-[#CFCFCF] font-mono">{ch.clickRate}%</td>
                    <td className="p-3 text-right font-medium text-[#CFCFCF] font-mono">{ch.conversionRate}%</td>
                    <td className="p-3 text-right font-bold text-white font-mono">₹{Math.round(ch.revenue).toLocaleString("en-IN")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* AI Insights + Next Actions */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* AI Insights */}
        <div className="glass p-6">
          <div className="flex items-center gap-2 mb-4">
            <Zap size={14} className="text-[#8A8A8A]" />
            <h2 className="text-xs font-semibold text-white/70 uppercase tracking-widest">AI Operational Insights</h2>
          </div>
          
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-4 w-full bg-white/5 animate-pulse rounded" />
              ))}
            </div>
          ) : data?.insights?.length > 0 ? (
            <ul className="space-y-3">
              {data.insights.map((insight: string, idx: number) => (
                <li key={idx} className="flex gap-3 text-xs leading-relaxed glass-inner p-3 border-white/[0.04] bg-white/[0.01]">
                  <Zap size={13} className="text-purple-400 shrink-0 mt-0.5" />
                  <span className="text-[#CFCFCF]">{insight}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center py-6 text-xs text-[#8A8A8A]">
              Operational insights will populate once customer activity triggers campaign logs.
            </div>
          )}
        </div>

        {/* Recommended Actions */}
        <div className="glass p-6">
          <div className="flex items-center gap-2 mb-4">
            <Target size={14} className="text-[#8A8A8A]" />
            <h2 className="text-xs font-semibold text-white/70 uppercase tracking-widest">AI Recommended Actions</h2>
          </div>
          
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-16 w-full bg-white/5 animate-pulse rounded-xl" />
              ))}
            </div>
          ) : data?.nextActions?.length > 0 ? (
            <div className="space-y-3">
              {data.nextActions.slice(0, 4).map((a: any) => (
                <div 
                  key={a.type} 
                  className="glass-inner p-4 flex items-center justify-between gap-4 border-white/[0.04] bg-white/[0.01]"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={clsx(
                        "badge text-[9px] px-1.5 py-0.5", 
                        a.priority === "high" ? "badge-danger" : "badge-warning"
                      )}>
                        {a.priority}
                      </span>
                      <span className="font-semibold text-sm text-white">{a.title}</span>
                    </div>
                    <p className="text-xs text-[#8A8A8A] mt-1">{a.detail}</p>
                  </div>
                  
                  <Link 
                    href={`/copilot?q=${encodeURIComponent(a.prompt)}`}
                    className="btn-primary text-xs py-1.5 px-3 shrink-0 flex items-center gap-1"
                  >
                    Run <ArrowUpRight size={12} />
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-xs text-[#8A8A8A]">
              No recommendations at this time.
            </div>
          )}
        </div>
      </div>

      {/* Platform Summary stats */}
      {k && (
        <div className="glass p-6 bg-gradient-to-b from-white/[0.02] to-transparent">
          <h2 className="text-xs font-semibold text-white/70 uppercase tracking-widest mb-5">Platform Aggregates Summary</h2>
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-5">
            {[
              { label: "Shoppers Tracked", value: k.customers?.toLocaleString("en-IN") },
              { label: "Total Campaigns", value: k.campaigns },
              { label: "Active Threads", value: k.running },
              { label: "Saved Segment Cohorts", value: k.segments },
              { label: "Aggregated Yield", value: `₹${Math.round(k.revenue).toLocaleString("en-IN")}` },
            ].map(s => (
              <div key={s.label} className="glass-inner p-4 text-center bg-white/[0.01] border-white/[0.04]">
                <div className="text-lg font-black text-white font-mono">{isLoading ? "—" : s.value}</div>
                <div className="text-[10px] text-[#8A8A8A] mt-2 font-semibold uppercase">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
