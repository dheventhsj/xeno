"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Megaphone, Activity, TrendingUp, Users, MessageSquare, CheckCircle, BarChart3, ShieldAlert, Terminal, Sliders } from "lucide-react";
import clsx from "clsx";

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [activeVariant, setActiveVariant] = useState<"A" | "B" | "C">("A");
  const [triggering, setTriggering] = useState(false);
  const [overrideAmount, setOverrideAmount] = useState(2500);

  const triggerEvent = async (eventType: string) => {
    setTriggering(true);
    try {
      await fetch(`/api/campaigns/${id}/sandbox-trigger`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventType, amount: eventType === "CONVERTED" ? overrideAmount : undefined })
      });
    } catch (err) {
      console.error(err);
    } finally {
      setTriggering(false);
    }
  };

  const { data, isLoading } = useQuery({
    queryKey: ["campaign", id],
    queryFn: async () => {
      const r = await fetch(`/api/campaigns/${id}`);
      if (!r.ok) throw new Error("API error");
      return r.json();
    },
    refetchInterval: 5000
  });

  if (isLoading) return <div className="flex items-center justify-center h-64 text-white/30 text-xs">Loading campaign diagnostics...</div>;
  
  if (!data?.campaign) return (
    <div className="glass p-8 text-center max-w-md mx-auto my-12 border-dashed border-white/[0.08]">
      <ShieldAlert size={32} className="text-white/20 mx-auto mb-3" />
      <p className="text-sm text-[#8A8A8A]">This campaign configuration could not be retrieved.</p>
      <Link href="/campaigns" className="btn-secondary mt-5 text-xs inline-block">Back to campaigns</Link>
    </div>
  );

  const c = data.campaign;
  const a = data.analytics;
  const rate = (n: number, d: number) => d > 0 ? Math.round((n / d) * 1000) / 10 : 0;

  const funnelData = a ? [
    { stage: "Sent", count: a.sent, color: "bg-white", text: "text-black" },
    { stage: "Delivered", count: a.delivered, color: "bg-white/80", text: "text-black" },
    { stage: "Opened", count: a.opened, color: "bg-white/60", text: "text-black" },
    { stage: "Clicked", count: a.clicked, color: "bg-white/40", text: "text-white" },
    { stage: "Converted", count: a.converted, color: "bg-white/20", text: "text-white" },
  ] : [];

  const maxCount = Math.max(...funnelData.map(s => s.count), 1);

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <Link href="/campaigns" className="inline-flex items-center gap-1 text-xs text-[#8A8A8A] hover:text-white transition-colors mb-4">
          <ArrowLeft size={13} /> Back to campaigns
        </Link>

        {/* Campaign Header block */}
        <div className="glass p-6 bg-gradient-to-b from-white/[0.02] to-transparent">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="space-y-2.5 flex-1 min-w-[280px]">
              <div className="flex items-center gap-2.5 flex-wrap">
                <div className="h-6 w-6 rounded-md bg-white/5 border border-white/10 grid place-items-center">
                  <Megaphone size={12} className="text-white" />
                </div>
                <h1 className="text-xl font-extrabold text-white tracking-tight">
                  {c.segment?.name ?? "Custom Targeted Audience"}
                </h1>
                <span className={clsx(
                  "badge text-[9px] py-0.5", 
                  c.status === "RUNNING" ? "badge-success" : c.status === "COMPLETED" ? "badge-info" : "badge-warning"
                )}>
                  {c.status === "RUNNING" && <span className="live-dot mr-1" />}
                  {c.status}
                </span>
              </div>
              <p className="text-xs text-[#8A8A8A] leading-relaxed max-w-xl">
                <span className="font-semibold text-white/80">Goal Statement:</span> {c.goal}
              </p>
              <div className="flex flex-wrap items-center gap-3 text-[11px] text-white/40 pt-1">
                <span className="font-mono bg-white/[0.04] px-2 py-0.5 rounded text-[9px] uppercase">
                  {c.recommendedChannel}
                </span>
                <span>·</span>
                <span>Created {new Date(c.createdAt).toLocaleDateString()}</span>
                {c.launchedAt && (
                  <>
                    <span>·</span>
                    <span>Launched {new Date(c.launchedAt).toLocaleDateString()}</span>
                  </>
                )}
              </div>
            </div>

            {a && (
              <div className="text-right bg-white/[0.01] border border-white/[0.06] rounded-xl p-4 min-w-[180px]">
                <div className="text-[10px] text-[#8A8A8A] uppercase tracking-wider font-semibold">Total revenue generated</div>
                <div className="text-2xl font-black text-white mt-1.5 font-mono">
                  ₹{Math.round(a.revenue).toLocaleString("en-IN")}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Live Metrics Grid */}
      {a && (
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
          {[
            { label: "Sent", value: a.sent, sub: "Triggered from queue" },
            { label: "Delivered", value: a.delivered, sub: `${rate(a.delivered, a.sent)}% delivery rate` },
            { label: "Opened", value: a.opened, sub: `${rate(a.opened, a.delivered)}% open rate` },
            { label: "Clicked", value: a.clicked, sub: `${rate(a.clicked, a.opened)}% click-through` },
            { label: "Converted", value: a.converted, sub: `${rate(a.converted, a.delivered)}% conversion` },
          ].map((m, i) => (
            <div key={m.label} className="glass p-5 bg-gradient-to-b from-white/[0.01] to-transparent">
              <div className="text-[9px] text-[#8A8A8A] uppercase tracking-wider font-semibold">{m.label}</div>
              <div className="text-lg font-bold mt-1.5 text-white font-mono">{m.value.toLocaleString("en-IN")}</div>
              <div className="text-[10px] text-[#8A8A8A] mt-1">{m.sub}</div>
            </div>
          ))}
        </div>
      )}

      {/* Funnel Visualization */}
      {funnelData.length > 0 && funnelData[0].count > 0 && (
        <div className="glass p-6">
          <h2 className="text-xs font-semibold text-white/70 uppercase tracking-widest mb-6 flex items-center gap-2">
            <Activity size={12} className="text-[#8A8A8A]" /> Drop-off Funnel Calibration
          </h2>
          <div className="space-y-4">
            {funnelData.map((stage, i) => {
              const width = maxCount > 0 ? Math.max(4, (stage.count / maxCount) * 100) : 4;
              const dropoff = i > 0 && funnelData[i - 1].count > 0
                ? Math.round(((funnelData[i - 1].count - stage.count) / funnelData[i - 1].count) * 100)
                : 0;
              return (
                <div key={stage.stage} className="flex items-center gap-4">
                  <div className="w-20 text-[11px] text-[#8A8A8A] text-right shrink-0 font-medium font-mono">
                    {stage.stage}
                  </div>
                  <div className="flex-1 bg-white/[0.02] rounded-lg overflow-hidden h-7 border border-white/[0.04]">
                    <div 
                      className={clsx(
                        "h-full transition-all duration-700 flex items-center px-3 font-semibold", 
                        stage.color, 
                        stage.text
                      )}
                      style={{ width: `${width}%` }}
                    >
                      <span className="text-[10px] font-mono">{stage.count.toLocaleString("en-IN")}</span>
                    </div>
                  </div>
                  <div className="w-16 shrink-0 text-left font-mono">
                    {dropoff > 0 ? (
                      <span className="text-xs text-red-400">-{dropoff}% drop</span>
                    ) : (
                      <span className="text-[10px] text-white/20">—</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Message Copy Variants (Tabbed View) */}
      <div className="glass p-6">
        <div className="flex items-center justify-between border-b border-white/[0.04] pb-4 mb-4">
          <div className="flex items-center gap-2">
            <MessageSquare size={13} className="text-[#8A8A8A]" />
            <h2 className="text-xs font-semibold text-white/70 uppercase tracking-widest">Message Variant Copies</h2>
          </div>
          
          <div className="flex gap-1.5">
            {(["A", "B", "C"] as const).map((variant) => {
              const active = activeVariant === variant;
              return (
                <button
                  key={variant}
                  onClick={() => setActiveVariant(variant)}
                  className={clsx(
                    "px-3 py-1 rounded text-xs font-semibold transition-all border",
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

        <div className="glass-inner p-4 bg-white/[0.01] rounded-xl">
          <div className="text-[10px] text-[#8A8A8A] uppercase tracking-wider font-semibold mb-2.5">
            Variant {activeVariant} Preview
          </div>
          <p className="text-xs text-[#CFCFCF] leading-relaxed whitespace-pre-wrap">
            {activeVariant === "A" && c.messageVariantA}
            {activeVariant === "B" && c.messageVariantB}
            {activeVariant === "C" && c.messageVariantC}
          </p>
        </div>
      </div>

      {/* Forecast vs Actual Metrics */}
      {a && (
        <div className="glass p-6">
          <h2 className="text-xs font-semibold text-white/70 uppercase tracking-widest mb-5 flex items-center gap-2">
            <BarChart3 size={13} className="text-[#8A8A8A]" /> Predictive Forecast vs Live Performance
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Open Rate", forecast: `${Math.round(c.expectedOpenRate * 100)}%`, actual: `${rate(a.opened, a.delivered)}%` },
              { label: "Click Rate", forecast: `${Math.round(c.expectedClickRate * 100)}%`, actual: `${rate(a.clicked, a.opened)}%` },
              { label: "Conversion Rate", forecast: `${Math.round(c.expectedConversionRate * 100)}%`, actual: `${rate(a.converted, a.delivered)}%` },
              { label: "Total Yield", forecast: `₹${Math.round(c.expectedRevenue).toLocaleString("en-IN")}`, actual: `₹${Math.round(a.revenue).toLocaleString("en-IN")}` },
            ].map(m => (
              <div key={m.label} className="glass-inner p-4 bg-white/[0.01]">
                <div className="text-[10px] text-[#8A8A8A] uppercase font-semibold">{m.label}</div>
                <div className="flex justify-between items-end mt-4">
                  <div>
                    <div className="text-[8px] text-[#8A8A8A] uppercase font-semibold">Forecast</div>
                    <div className="text-xs text-white/50 font-medium font-mono mt-0.5">{m.forecast}</div>
                  </div>
                  <div className="text-right border-l border-white/[0.05] pl-4 flex-1">
                    <div className="text-[8px] text-[#8A8A8A] uppercase font-semibold">Actual</div>
                    <div className="text-sm text-white font-extrabold font-mono mt-0.5">{m.actual}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Developer Sandbox Controls & Live Campaign Logs */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Sandbox Panel */}
        <div className="glass p-6 bg-[#0c0c0c]/80 border-dashed border-white/[0.12] space-y-4">
          <div>
            <h2 className="text-xs font-bold text-white uppercase tracking-widest font-mono flex items-center gap-1.5">
              <Sliders size={12} className="text-purple-400" />
              Campaign Sandbox Controls
            </h2>
            <p className="text-[10px] text-[#8A8A8A] font-mono mt-0.5">
              Trigger mock events to bypass simulation timelines
            </p>
          </div>

          <div className="space-y-2.5">
            <div className="flex gap-2">
              <button
                disabled={triggering || c.status !== "RUNNING"}
                onClick={() => triggerEvent("DELIVERED")}
                className="btn-secondary text-[10px] py-1.5 px-3 flex-1 disabled:opacity-40 disabled:pointer-events-none font-mono"
              >
                + MOCK DELIV
              </button>
              <button
                disabled={triggering || c.status !== "RUNNING"}
                onClick={() => triggerEvent("OPENED")}
                className="btn-secondary text-[10px] py-1.5 px-3 flex-1 disabled:opacity-40 disabled:pointer-events-none font-mono"
              >
                + MOCK OPEN
              </button>
            </div>
            
            <button
              disabled={triggering || c.status !== "RUNNING"}
              onClick={() => triggerEvent("CLICKED")}
              className="btn-secondary text-[10px] py-1.5 px-3 w-full disabled:opacity-40 disabled:pointer-events-none font-mono"
            >
              + MOCK CLICK-THROUGH
            </button>

            <div className="border-t border-white/[0.04] my-2 pt-2.5 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] text-[#8A8A8A] font-semibold font-mono">ORDER VALUE:</span>
                <input
                  type="number"
                  value={overrideAmount}
                  onChange={e => setOverrideAmount(Number(e.target.value))}
                  className="bg-black/40 border border-white/10 rounded px-1.5 py-0.5 text-[10px] font-mono text-white w-20 text-right focus:outline-none focus:border-white/30"
                />
              </div>
              <button
                disabled={triggering || c.status !== "RUNNING"}
                onClick={() => triggerEvent("CONVERTED")}
                className="btn-primary text-[10px] py-1.5 px-3 w-full disabled:opacity-40 disabled:pointer-events-none font-mono bg-green-500/90 text-black hover:bg-green-400"
              >
                + FORCE PURCHASE CONVERSION
              </button>
            </div>

            <div className="border-t border-white/[0.04] pt-2">
              <button
                disabled={triggering || c.status !== "RUNNING"}
                onClick={() => triggerEvent("FAILED")}
                className="btn-secondary text-[10px] py-1.5 px-3 w-full border-red-500/20 text-red-400 hover:bg-red-500/5 disabled:opacity-40 disabled:pointer-events-none font-mono"
              >
                + MOCK FAILURE / BOUNCE
              </button>
            </div>
          </div>
        </div>

        {/* Live Logs */}
        <div className="lg:col-span-2 glass p-6 bg-[#080808]/90 border-white/[0.07] space-y-4">
          <div>
            <h2 className="text-xs font-bold text-white uppercase tracking-widest font-mono flex items-center gap-1.5">
              <Terminal size={12} className="text-[#8A8A8A]" />
              Campaign Telemetry Feed
            </h2>
            <p className="text-[10px] text-[#8A8A8A] font-mono mt-0.5">
              Real-time audit events for this campaign thread
            </p>
          </div>

          <div 
            className="font-mono text-[10px] leading-relaxed max-h-[220px] overflow-y-auto space-y-1.5 p-3 rounded-lg border border-white/[0.04] bg-[#030303]"
            style={{ scrollbarWidth: "thin" }}
          >
            {!data.recentEvents || data.recentEvents.length === 0 ? (
              <div className="text-center py-8 text-white/20">
                [SYSTEM] No telemetry logged yet for this campaign.
              </div>
            ) : (
              data.recentEvents.map((ev: any) => {
                let badgeColor = "text-[#8A8A8A]";
                let textColor = "text-white/60";
                let description = "";
                const ts = new Date(ev.timestamp).toLocaleTimeString();
                const shopperName = ev.communication?.customer?.name ?? "Shopper";

                switch (ev.eventType) {
                  case "SENT":
                    badgeColor = "text-[#8A8A8A] bg-white/5 border-white/10";
                    description = `Message sent to ${shopperName}`;
                    break;
                  case "DELIVERED":
                    badgeColor = "text-teal-400 bg-teal-500/10 border-teal-500/20";
                    description = `Delivered (Latency: ${ev.meta ? JSON.parse(ev.meta).deliveryLatencyMs ?? 200 : 200}ms)`;
                    break;
                  case "OPENED":
                  case "READ":
                    badgeColor = "text-amber-400 bg-amber-500/10 border-amber-500/20";
                    const meta = ev.meta ? JSON.parse(ev.meta) : {};
                    description = `${shopperName} opened on ${meta.device || "device"} via ${meta.app || "app"}`;
                    break;
                  case "CLICKED":
                    badgeColor = "text-orange-400 bg-orange-500/10 border-orange-500/20";
                    const clickMeta = ev.meta ? JSON.parse(ev.meta) : {};
                    description = `${shopperName} clicked UTM link (Platform: ${clickMeta.platform || "web"})`;
                    break;
                  case "CONVERTED":
                    badgeColor = "text-green-400 bg-green-500/10 border-green-500/20 font-bold";
                    textColor = "text-green-400";
                    const convMeta = ev.meta ? JSON.parse(ev.meta) : {};
                    description = `Conversion! Order value: ₹${Math.round(convMeta.orderAmount ?? 0).toLocaleString("en-IN")} via Stripe`;
                    break;
                  case "FAILED":
                    badgeColor = "text-red-400 bg-red-500/10 border-red-500/20 font-bold";
                    textColor = "text-red-300";
                    const failMeta = ev.meta ? JSON.parse(ev.meta) : {};
                    description = `Bounced (${failMeta.errorText || failMeta.reason || "Carrier drop"}) [Code: ${failMeta.errorCode || "ERR_300"}]`;
                    break;
                }

                return (
                  <div key={ev.id} className="flex items-start gap-2 border-b border-white/[0.01] pb-1">
                    <span className="text-white/20 select-none shrink-0 font-sans">[{ts}]</span>
                    <span className={clsx("px-1.5 py-0.2 rounded border text-[8px] uppercase font-bold tracking-wider shrink-0", badgeColor)}>
                      {ev.eventType}
                    </span>
                    <span className={clsx("flex-1", textColor)}>
                      {description}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
