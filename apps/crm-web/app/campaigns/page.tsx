"use client";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Megaphone, Sparkles, ChevronRight, Activity, Calendar, Award } from "lucide-react";
import clsx from "clsx";

export default function CampaignsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["campaigns"],
    queryFn: async () => {
      const r = await fetch("/api/campaigns");
      if (!r.ok) throw new Error("API error");
      return r.json();
    },
    refetchInterval: 10000
  });

  function statusBadge(status: string) {
    switch (status) {
      case "RUNNING": 
        return (
          <span className="badge badge-success flex items-center gap-1.5 text-[10px] py-0.5 px-2">
            <span className="live-dot" /> Running
          </span>
        );
      case "COMPLETED": 
        return (
          <span className="badge badge-info flex items-center gap-1 text-[10px] py-0.5 px-2 bg-blue-500/10 border-blue-500/20 text-blue-300">
            Completed
          </span>
        );
      case "DRAFT": 
        return (
          <span className="badge badge-warning flex items-center gap-1 text-[10px] py-0.5 px-2">
            Draft
          </span>
        );
      case "SCHEDULED": 
        return (
          <span className="badge badge-purple flex items-center gap-1 text-[10px] py-0.5 px-2">
            Scheduled
          </span>
        );
      case "FAILED": 
        return (
          <span className="badge badge-danger flex items-center gap-1 text-[10px] py-0.5 px-2">
            Failed
          </span>
        );
      default: 
        return <span className="badge text-[10px] py-0.5 px-2">{status}</span>;
    }
  }

  const running = data?.filter?.((c: any) => c.status === "RUNNING") ?? [];
  const completed = data?.filter?.((c: any) => c.status === "COMPLETED") ?? [];
  const drafts = data?.filter?.((c: any) => c.status === "DRAFT" || c.status === "SCHEDULED") ?? [];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.04] pb-6">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white flex items-center gap-2">
            <Megaphone size={20} className="text-[#8A8A8A]" />
            Campaign War Room
          </h1>
          <p className="text-xs text-[#8A8A8A] mt-1">
            {isLoading ? "Loading orchestration history..." : `${data?.length ?? 0} total campaigns managed`}
          </p>
        </div>
        <Link href="/copilot" className="btn-primary inline-flex items-center gap-2 text-xs">
          <Sparkles size={13} className="fill-black" /> Create with AI
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 w-full bg-white/5 animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="space-y-8">
          {/* Active Campaigns */}
          {running.length > 0 && (
            <div className="space-y-4 animate-slide-up">
              <h2 className="text-xs font-semibold text-white/70 uppercase tracking-widest flex items-center gap-2">
                <Activity size={12} className="text-green-500 animate-pulse" /> Active Campaign Threads
              </h2>
              <div className="grid gap-4">
                {running.map((c: any) => {
                  const sent = c.analytics?.sent ?? 0;
                  const delivered = c.analytics?.delivered ?? 0;
                  const opened = c.analytics?.opened ?? 0;
                  const converted = c.analytics?.converted ?? 0;
                  
                  const openPct = delivered > 0 ? Math.round((opened / delivered) * 100) : 0;
                  const convPct = delivered > 0 ? Math.round((converted / delivered) * 100) : 0;

                  return (
                    <Link 
                      key={c.id} 
                      href={`/campaigns/${c.id}`} 
                      className="glass glass-hover p-6 block group"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-6">
                        <div className="flex-1 min-w-[280px] space-y-2">
                          <div className="flex items-center gap-2">
                            {statusBadge(c.status)}
                            <span className="font-bold text-white text-base tracking-tight truncate max-w-[320px]">
                              {c.segment?.name ?? "Custom AI Audience"}
                            </span>
                          </div>
                          <p className="text-xs text-[#8A8A8A] leading-relaxed max-w-xl">
                            <span className="font-semibold text-white/90">Goal:</span> {c.goal}
                          </p>
                          <div className="flex flex-wrap items-center gap-3 text-[11px] text-white/40 pt-1">
                            <span className="bg-white/[0.04] px-2 py-0.5 rounded font-mono uppercase text-[9px]">
                              {c.recommendedChannel}
                            </span>
                            <span>·</span>
                            <span>{c.totalRecipients.toLocaleString("en-IN")} customers</span>
                            <span>·</span>
                            <span>forecast ₹{Math.round(c.expectedRevenue).toLocaleString("en-IN")}</span>
                          </div>
                        </div>

                        {c.analytics && (
                          <div className="grid grid-cols-4 gap-6 text-center border-l border-white/[0.05] pl-6 min-w-[320px]">
                            <div>
                              <div className="text-[9px] text-[#8A8A8A] font-semibold uppercase tracking-wider">Sent</div>
                              <div className="font-bold text-sm text-white mt-1 font-mono">{sent.toLocaleString("en-IN")}</div>
                            </div>
                            <div>
                              <div className="text-[9px] text-[#8A8A8A] font-semibold uppercase tracking-wider">Delivered</div>
                              <div className="font-bold text-sm text-white mt-1 font-mono">{delivered.toLocaleString("en-IN")}</div>
                            </div>
                            <div>
                              <div className="text-[9px] text-[#8A8A8A] font-semibold uppercase tracking-wider">Conv. Rate</div>
                              <div className="font-bold text-sm text-[#22C55E] mt-1 font-mono">{convPct}%</div>
                            </div>
                            <div>
                              <div className="text-[9px] text-[#8A8A8A] font-semibold uppercase tracking-wider">Revenue</div>
                              <div className="font-bold text-sm text-white mt-1 font-mono">₹{Math.round(c.analytics.revenue).toLocaleString("en-IN")}</div>
                            </div>
                          </div>
                        )}
                        
                        <div className="flex items-center shrink-0 self-center">
                          <ChevronRight size={16} className="text-white/20 group-hover:text-white transition-colors" />
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Completed Campaigns */}
          {completed.length > 0 && (
            <div className="space-y-4 animate-slide-up">
              <h2 className="text-xs font-semibold text-[#8A8A8A] uppercase tracking-widest flex items-center gap-2">
                <Award size={12} /> Executed Operations
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                {completed.map((c: any) => {
                  const sent = c.analytics?.sent ?? 0;
                  const converted = c.analytics?.converted ?? 0;
                  const revenue = c.analytics?.revenue ?? 0;
                  const rate = sent > 0 ? Math.round((converted / sent) * 100) : 0;

                  return (
                    <Link 
                      key={c.id} 
                      href={`/campaigns/${c.id}`} 
                      className="glass glass-hover p-5 flex flex-wrap items-center justify-between gap-4 group"
                    >
                      <div className="flex-1 min-w-[200px] space-y-1">
                        <div className="flex items-center gap-2">
                          {statusBadge(c.status)}
                          <span className="font-bold text-white text-sm tracking-tight truncate max-w-[200px]">
                            {c.segment?.name ?? "AI Audience"}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#8A8A8A] truncate max-w-[240px]">
                          {c.goal}
                        </p>
                        <div className="flex items-center gap-2 text-[10px] text-white/40 pt-1">
                          <span className="bg-white/[0.04] px-1.5 py-0.5 rounded text-[8px] uppercase font-mono">
                            {c.recommendedChannel}
                          </span>
                          <span>·</span>
                          <span>{rate}% conv.</span>
                        </div>
                      </div>
                      
                      <div className="text-right border-l border-white/[0.04] pl-4 min-w-[100px]">
                        <div className="text-[9px] text-[#8A8A8A] uppercase tracking-wider font-semibold">Yield</div>
                        <div className="text-sm font-bold text-white font-mono mt-0.5">
                          ₹{Math.round(revenue).toLocaleString("en-IN")}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Drafts */}
          {drafts.length > 0 && (
            <div className="space-y-4 animate-slide-up">
              <h2 className="text-xs font-semibold text-[#8A8A8A] uppercase tracking-widest flex items-center gap-2">
                <Calendar size={12} /> Scheduled & Draft Configurations
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {drafts.map((c: any) => (
                  <div key={c.id} className="glass p-5 flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {statusBadge(c.status)}
                        <span className="font-bold text-white text-sm tracking-tight truncate max-w-[160px]">
                          {c.segment?.name ?? "Config Draft"}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#8A8A8A] truncate max-w-[200px]">
                        {c.goal}
                      </p>
                      <div className="text-[10px] text-white/40 pt-1 font-mono">
                        Forecast Yield: ₹{Math.round(c.expectedRevenue).toLocaleString("en-IN")}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!isLoading && data?.length === 0 && (
        <div className="glass p-12 text-center animate-fade-in max-w-lg mx-auto border-dashed border-white/[0.08]">
          <Megaphone size={32} className="text-white/10 mx-auto mb-4" />
          <h2 className="text-base font-bold text-white mb-1">No campaigns launched</h2>
          <p className="text-xs text-[#8A8A8A] mb-5 max-w-sm mx-auto leading-relaxed">
            You haven't initiated any AI-targeted customer campaigns yet. Head over to the Copilot workspace to design one.
          </p>
          <Link href="/copilot" className="btn-primary inline-flex items-center gap-2 text-xs">
            <Sparkles size={12} className="fill-black" /> Run AI Operator
          </Link>
        </div>
      )}
    </div>
  );
}
