"use client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { Megaphone, Sparkles, ChevronRight, Activity, Calendar, Award, Plus, Loader2, X } from "lucide-react";
import clsx from "clsx";

const CHANNELS = ["WHATSAPP", "SMS", "EMAIL", "RCS"] as const;

export default function CampaignsPage() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [goal, setGoal] = useState("");
  const [channel, setChannel] = useState<(typeof CHANNELS)[number]>("WHATSAPP");
  const [creating, setCreating] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["campaigns"],
    queryFn: async () => {
      const r = await fetch("/api/campaigns");
      if (!r.ok) throw new Error("API error");
      return r.json();
    },
    refetchInterval: (query) => {
      const list = query.state.data as any[] | undefined;
      const hasQueued = list?.some((c) => c.status === "QUEUED" || c.status === "RUNNING");
      return hasQueued ? 2000 : 10000;
    }
  });

  async function createCampaign() {
    if (!goal.trim() || creating) return;
    setCreating(true);
    try {
      const r = await fetch("/api/campaigns/quick-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal: goal.trim(), channel })
      });
      if (!r.ok) throw new Error("Create failed");
      setGoal("");
      setShowCreate(false);
      qc.invalidateQueries({ queryKey: ["campaigns"] });
    } finally {
      setCreating(false);
    }
  }

  function statusBadge(status: string) {
    switch (status) {
      case "QUEUED":
        return (
          <span className="badge flex items-center gap-1.5 text-[10px] py-0.5 px-2 bg-amber-500/10 border-amber-500/30 text-amber-300">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" /> Queued
          </span>
        );
      case "DELIVERED":
        return (
          <span className="badge flex items-center gap-1.5 text-[10px] py-0.5 px-2 bg-teal-500/10 border-teal-500/30 text-teal-300">
            Delivered
          </span>
        );
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

  function CampaignCard({ c, compact = false }: { c: any; compact?: boolean }) {
    const sent = c.analytics?.sent ?? 0;
    const delivered = c.analytics?.delivered ?? 0;
    const converted = c.analytics?.converted ?? 0;
    const convPct = delivered > 0 ? Math.round((converted / delivered) * 100) : 0;

    if (compact) {
      return (
        <Link href={`/campaigns/${c.id}`} className="glass glass-hover p-5 flex flex-wrap items-center justify-between gap-4 group">
          <div className="flex-1 min-w-[200px] space-y-1">
            <div className="flex items-center gap-2">
              {statusBadge(c.status)}
              <span className="font-bold text-white text-sm tracking-tight truncate max-w-[200px]">
                {c.segment?.name ?? "Campaign"}
              </span>
            </div>
            <p className="text-[11px] text-[#8A8A8A] truncate max-w-[240px]">{c.goal}</p>
          </div>
          <div className="text-right border-l border-white/[0.04] pl-4 min-w-[100px]">
            <div className="text-[9px] text-[#8A8A8A] uppercase tracking-wider font-semibold">Delivered</div>
            <div className="text-sm font-bold text-teal-300 font-mono mt-0.5">{delivered.toLocaleString("en-IN")}</div>
          </div>
        </Link>
      );
    }

    return (
      <Link key={c.id} href={`/campaigns/${c.id}`} className="glass glass-hover p-6 block group">
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
              <span className="bg-white/[0.04] px-2 py-0.5 rounded font-mono uppercase text-[9px]">{c.recommendedChannel}</span>
              <span>·</span>
              <span>{c.totalRecipients.toLocaleString("en-IN")} customers</span>
              {c.status === "QUEUED" && (
                <>
                  <span>·</span>
                  <span className="text-amber-400/80">Dispatching in ~5s…</span>
                </>
              )}
            </div>
          </div>
          {c.analytics && c.status !== "QUEUED" && (
            <div className="grid grid-cols-4 gap-6 text-center border-l border-white/[0.05] pl-6 min-w-[320px]">
              <div>
                <div className="text-[9px] text-[#8A8A8A] font-semibold uppercase tracking-wider">Sent</div>
                <div className="font-bold text-sm text-white mt-1 font-mono">{sent.toLocaleString("en-IN")}</div>
              </div>
              <div>
                <div className="text-[9px] text-[#8A8A8A] font-semibold uppercase tracking-wider">Delivered</div>
                <div className="font-bold text-sm text-teal-300 mt-1 font-mono">{delivered.toLocaleString("en-IN")}</div>
              </div>
              <div>
                <div className="text-[9px] text-[#8A8A8A] font-semibold uppercase tracking-wider">Conv. Rate</div>
                <div className="font-bold text-sm text-[#22C55E] mt-1 font-mono">{convPct}%</div>
              </div>
              <div>
                <div className="text-[9px] text-[#8A8A8A] font-semibold uppercase tracking-wider">Revenue</div>
                <div className="font-bold text-sm text-white mt-1 font-mono">₹{Math.round(c.analytics.revenue ?? 0).toLocaleString("en-IN")}</div>
              </div>
            </div>
          )}
          <div className="flex items-center shrink-0 self-center">
            <ChevronRight size={16} className="text-white/20 group-hover:text-white transition-colors" />
          </div>
        </div>
      </Link>
    );
  }

  const queued = data?.filter?.((c: any) => c.status === "QUEUED") ?? [];
  const running = data?.filter?.((c: any) => c.status === "RUNNING") ?? [];
  const delivered = data?.filter?.((c: any) => c.status === "DELIVERED") ?? [];
  const completed = data?.filter?.((c: any) => c.status === "COMPLETED") ?? [];
  const drafts = data?.filter?.((c: any) => c.status === "DRAFT" || c.status === "SCHEDULED") ?? [];

  return (
    <div className="space-y-8 animate-fade-in">
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
        <div className="flex items-center gap-2">
          <button onClick={() => setShowCreate(true)} className="btn-secondary inline-flex items-center gap-2 text-xs">
            <Plus size={13} /> Create Campaign
          </button>
          <Link href="/copilot" className="btn-primary inline-flex items-center gap-2 text-xs">
            <Sparkles size={13} className="fill-black" /> Create with AI
          </Link>
        </div>
      </div>

      {showCreate && (
        <>
          <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={() => !creating && setShowCreate(false)} />
          <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 glass p-6 animate-scale-in border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-white">New Campaign</h2>
              <button onClick={() => setShowCreate(false)} className="p-1 text-[#8A8A8A] hover:text-white"><X size={16} /></button>
            </div>
            <p className="text-[11px] text-[#8A8A8A] mb-4">Campaign starts as <span className="text-amber-300">Queued</span>, then auto-delivers in ~5 seconds.</p>
            <label className="text-[10px] text-[#8A8A8A] uppercase font-semibold">Campaign goal</label>
            <textarea
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="e.g. Re-engage Mumbai coffee buyers via WhatsApp"
              className="input text-xs w-full mt-1 mb-3 min-h-[72px] py-2"
              disabled={creating}
            />
            <label className="text-[10px] text-[#8A8A8A] uppercase font-semibold">Channel</label>
            <div className="flex flex-wrap gap-1.5 mt-1 mb-5">
              {CHANNELS.map((ch) => (
                <button
                  key={ch}
                  type="button"
                  onClick={() => setChannel(ch)}
                  className={clsx(
                    "px-2.5 py-1 rounded text-[10px] font-semibold border",
                    channel === ch ? "bg-white text-black border-white" : "border-white/10 text-[#8A8A8A]"
                  )}
                >
                  {ch}
                </button>
              ))}
            </div>
            <button onClick={createCampaign} disabled={creating || !goal.trim()} className="btn-primary w-full text-xs py-2.5 flex items-center justify-center gap-2">
              {creating ? <><Loader2 size={13} className="animate-spin" /> Creating…</> : <>Launch as Queued</>}
            </button>
          </div>
        </>
      )}

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 w-full bg-white/5 animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="space-y-8">
          {queued.length > 0 && (
            <div className="space-y-4 animate-slide-up">
              <h2 className="text-xs font-semibold text-amber-400/90 uppercase tracking-widest flex items-center gap-2">
                <Activity size={12} className="animate-pulse" /> Queued — Awaiting Dispatch
              </h2>
              <div className="grid gap-4">{queued.map((c: any) => <CampaignCard key={c.id} c={c} />)}</div>
            </div>
          )}

          {(running.length > 0 || delivered.length > 0) && (
            <div className="space-y-4 animate-slide-up">
              <h2 className="text-xs font-semibold text-white/70 uppercase tracking-widest flex items-center gap-2">
                <Activity size={12} className="text-green-500 animate-pulse" /> Active Campaign Threads
              </h2>
              <div className="grid gap-4">
                {running.map((c: any) => <CampaignCard key={c.id} c={c} />)}
                {delivered.map((c: any) => <CampaignCard key={c.id} c={c} />)}
              </div>
            </div>
          )}

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
                    <Link key={c.id} href={`/campaigns/${c.id}`} className="glass glass-hover p-5 flex flex-wrap items-center justify-between gap-4 group">
                      <div className="flex-1 min-w-[200px] space-y-1">
                        <div className="flex items-center gap-2">
                          {statusBadge(c.status)}
                          <span className="font-bold text-white text-sm tracking-tight truncate max-w-[200px]">{c.segment?.name ?? "AI Audience"}</span>
                        </div>
                        <p className="text-[11px] text-[#8A8A8A] truncate max-w-[240px]">{c.goal}</p>
                        <div className="flex items-center gap-2 text-[10px] text-white/40 pt-1">
                          <span className="bg-white/[0.04] px-1.5 py-0.5 rounded text-[8px] uppercase font-mono">{c.recommendedChannel}</span>
                          <span>·</span>
                          <span>{rate}% conv.</span>
                        </div>
                      </div>
                      <div className="text-right border-l border-white/[0.04] pl-4 min-w-[100px]">
                        <div className="text-[9px] text-[#8A8A8A] uppercase tracking-wider font-semibold">Yield</div>
                        <div className="text-sm font-bold text-white font-mono mt-0.5">₹{Math.round(revenue).toLocaleString("en-IN")}</div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

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
                        <span className="font-bold text-white text-sm tracking-tight truncate max-w-[160px]">{c.segment?.name ?? "Config Draft"}</span>
                      </div>
                      <p className="text-[11px] text-[#8A8A8A] truncate max-w-[200px]">{c.goal}</p>
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
            Create a campaign to see it queued, then delivered automatically within seconds.
          </p>
          <button onClick={() => setShowCreate(true)} className="btn-primary inline-flex items-center gap-2 text-xs">
            <Plus size={12} className="fill-black" /> Create Campaign
          </button>
        </div>
      )}
    </div>
  );
}
