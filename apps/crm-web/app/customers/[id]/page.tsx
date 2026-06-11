"use client";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, User, Mail, Phone, MapPin, ShoppingBag,
  TrendingUp, AlertTriangle, Calendar, Sparkles, Target, ShieldCheck, Activity
} from "lucide-react";
import clsx from "clsx";

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading } = useQuery({
    queryKey: ["customer", id],
    queryFn: async () => {
      const r = await fetch(`/api/customers/${id}`);
      if (!r.ok) throw new Error("API error");
      return r.json();
    }
  });

  if (isLoading) return (
    <div className="flex items-center justify-center h-64 text-xs text-[#8A8A8A] font-mono">
      Retrieving customer profile diagnostics...
    </div>
  );

  if (!data?.customer) return (
    <div className="glass p-8 text-center max-w-md mx-auto my-12 border-dashed border-white/[0.08]">
      <ShieldCheck size={32} className="text-white/20 mx-auto mb-3" />
      <p className="text-sm text-[#8A8A8A]">Customer profile could not be loaded.</p>
      <Link href="/customers" className="btn-secondary mt-5 text-xs inline-block">Back to customers</Link>
    </div>
  );

  const { customer: c, scores: s, summary, predictedNextPurchase, recentOrders, recentCampaigns, timeline } = data;

  const scoreCards = [
    { 
      label: "Churn Risk", 
      value: `${Math.round(s.churnScore * 100)}%`, 
      fill: s.churnScore * 100, 
      color: s.churnScore > 0.6 ? "score-fill-danger" : s.churnScore > 0.35 ? "score-fill-warning" : "score-fill-success" 
    },
    { 
      label: "Lifetime Value Score", 
      value: `₹${Math.round(s.ltvScore).toLocaleString("en-IN")}`, 
      fill: Math.min(100, (s.ltvScore / 50000) * 100), 
      color: "score-fill-accent" 
    },
    { 
      label: "Engagement Intensity", 
      value: `${Math.round(s.engagementScore)}/100`, 
      fill: s.engagementScore, 
      color: s.engagementScore > 65 ? "score-fill-success" : s.engagementScore > 35 ? "score-fill-warning" : "score-fill-danger" 
    },
    { 
      label: "Purchase Probability", 
      value: `${Math.round(s.purchaseProbability * 100)}%`, 
      fill: s.purchaseProbability * 100, 
      color: "score-fill-accent" 
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <Link href="/customers" className="inline-flex items-center gap-1 text-xs text-[#8A8A8A] hover:text-white transition-colors mb-4">
          <ArrowLeft size={13} /> Back to customer directory
        </Link>

        {/* Profile Card Header */}
        <div className="glass p-6 bg-gradient-to-b from-white/[0.02] to-transparent">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-white/[0.04] border border-white/[0.08] grid place-items-center">
                <User size={20} className="text-white/70" />
              </div>
              <div className="space-y-1">
                <h1 className="text-xl font-extrabold text-white tracking-tight">{c.name}</h1>
                <div className="flex flex-wrap items-center gap-3 text-xs text-[#8A8A8A]">
                  <span className="flex items-center gap-1"><Mail size={11} /> {c.email}</span>
                  {c.phone && <span className="flex items-center gap-1"><Phone size={11} /> {c.phone}</span>}
                  {c.city && <span className="flex items-center gap-1"><MapPin size={11} /> {c.city}</span>}
                </div>
              </div>
            </div>
            
            <div className={clsx(
              "flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] uppercase tracking-wider font-semibold", 
              s.riskLevel === "critical" ? "border-red-500/20 bg-red-500/5 text-red-400" :
              s.riskLevel === "high" ? "border-amber-500/20 bg-amber-500/5 text-amber-400" :
              s.riskLevel === "medium" ? "border-yellow-500/20 bg-yellow-500/5 text-yellow-400" :
              "border-emerald-500/20 bg-emerald-500/5 text-emerald-400"
            )}>
              {s.riskLevel === "critical" || s.riskLevel === "high" ? <AlertTriangle size={12} /> : <TrendingUp size={12} />}
              {s.riskLevel} Churn Risk
            </div>
          </div>

          {/* AI Assessment Bar */}
          <div className="mt-5 p-4 rounded-xl bg-white/[0.01] border border-white/[0.06] flex items-start gap-3">
            <Sparkles size={14} className="text-purple-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-[10px] text-white/50 uppercase tracking-wider font-semibold mb-0.5">AI Engine Assessment</div>
              <p className="text-xs text-[#CFCFCF] leading-relaxed">{summary}</p>
            </div>
          </div>
        </div>
      </div>

      {/* AI Score Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 animate-slide-up">
        {scoreCards.map((sc, i) => (
          <div key={sc.label} className="glass p-5 bg-gradient-to-b from-white/[0.01] to-transparent">
            <div className="text-[9px] text-[#8A8A8A] uppercase tracking-wider font-semibold">{sc.label}</div>
            <div className="text-lg font-bold mt-1 text-white font-mono">{sc.value}</div>
            <div className="score-bar mt-3.5">
              <div className={clsx("score-fill", sc.color)} style={{ width: `${sc.fill}%` }} />
            </div>
          </div>
        ))}
      </div>

      {/* Detail row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Predictions & Prefs */}
        <div className="glass p-6 space-y-5">
          <div className="flex items-center gap-2 border-b border-white/[0.04] pb-3">
            <Calendar size={14} className="text-[#8A8A8A]" />
            <h2 className="text-xs font-semibold text-white/70 uppercase tracking-widest">Target & Channels</h2>
          </div>
          
          <div className="glass-inner p-4 bg-white/[0.01]">
            <div className="text-[10px] text-[#8A8A8A] uppercase tracking-wider font-semibold">Predicted Next Order Window</div>
            <div className="text-base font-bold mt-1 text-white font-mono">
              {predictedNextPurchase ? new Date(predictedNextPurchase).toLocaleDateString() : "Pending calculations"}
            </div>
            <div className="text-[10px] text-[#8A8A8A] mt-1 font-mono">
              {s.daysSinceLastOrder} days since last order recorded
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <span className="chip text-[10px] font-mono py-1 uppercase">Preferred Category: {c.category}</span>
            <span className="chip text-[10px] font-mono py-1 uppercase">Target Channel: {c.channel}</span>
          </div>
        </div>

        {/* Order History */}
        <div className="glass p-6">
          <div className="flex items-center gap-2 border-b border-white/[0.04] pb-3 mb-4">
            <ShoppingBag size={14} className="text-[#8A8A8A]" />
            <h2 className="text-xs font-semibold text-white/70 uppercase tracking-widest">Recent Purchases</h2>
          </div>
          
          <div className="space-y-2.5">
            {recentOrders?.length > 0 ? recentOrders.map((o: any, i: number) => (
              <div key={i} className="flex justify-between items-center p-3 glass-inner bg-white/[0.01] border-white/[0.04]">
                <div>
                  <span className="text-xs font-bold text-white uppercase font-mono">{o.category}</span>
                  <span className="text-[10px] text-[#8A8A8A] ml-2 font-mono">{new Date(o.date).toLocaleDateString()}</span>
                </div>
                <span className="text-xs font-bold text-white font-mono">₹{Math.round(o.amount).toLocaleString("en-IN")}</span>
              </div>
            )) : (
              <div className="text-center py-6 text-xs text-[#8A8A8A]">
                No orders recorded.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Campaigns & Activity History */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Campaign History */}
        <div className="glass p-6">
          <div className="flex items-center gap-2 border-b border-white/[0.04] pb-3 mb-4">
            <Target size={14} className="text-[#8A8A8A]" />
            <h2 className="text-xs font-semibold text-white/70 uppercase tracking-widest">AI Campaign Touches</h2>
          </div>
          
          <div className="space-y-2.5">
            {recentCampaigns?.length > 0 ? recentCampaigns.map((camp: any, i: number) => (
              <div key={i} className="flex justify-between items-center p-3 glass-inner bg-white/[0.01] border-white/[0.04]">
                <div>
                  <span className="text-xs font-semibold text-white truncate block max-w-[200px]">{camp.campaign}</span>
                  <span className="text-[10px] text-[#8A8A8A] font-mono mt-0.5 block">via {camp.channel}</span>
                </div>
                <span className={clsx(
                  "badge text-[9px] py-0.5", 
                  camp.status === "CONVERTED" ? "badge-success" : camp.status === "DELIVERED" ? "badge-info" : "badge-warning"
                )}>
                  {camp.status}
                </span>
              </div>
            )) : (
              <div className="text-center py-6 text-xs text-[#8A8A8A]">
                No campaign dispatches recorded.
              </div>
            )}
          </div>
        </div>

        {/* Activity Timeline */}
        <div className="glass p-6">
          <div className="flex items-center gap-2 border-b border-white/[0.04] pb-3 mb-6">
            <Activity size={14} className="text-[#8A8A8A]" />
            <h2 className="text-xs font-semibold text-white/70 uppercase tracking-widest">Events Timeline</h2>
          </div>
          
          {timeline?.length > 0 ? (
            <div className="space-y-5 border-l border-white/[0.08] pl-4 ml-2.5">
              {timeline.map((t: any, i: number) => (
                <div key={i} className="relative">
                  <div className="absolute -left-[20.5px] top-1 h-2 w-2 rounded-full bg-white/40 border border-[#141414]" />
                  <div className="text-xs font-bold text-white">{t.title}</div>
                  {t.detail && <p className="text-[11px] text-[#8A8A8A] mt-0.5">{t.detail}</p>}
                  <div className="text-[9px] text-white/20 font-mono mt-1">{new Date(t.date).toLocaleDateString()}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-xs text-[#8A8A8A]">
              No timeline history events found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
