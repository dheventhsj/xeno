"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { X, Sparkles, Clock, Target, ShoppingBag, Megaphone, Users, ExternalLink, Loader2, Filter } from "lucide-react";
import clsx from "clsx";
import { JourneyReplayTimeline } from "./JourneyReplayTimeline";

type Props = {
  customerId: string | null;
  onClose: () => void;
};

export function CustomerTwinDrawer({ customerId, onClose }: Props) {
  const [campaignFilter, setCampaignFilter] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["customer-twin", customerId],
    queryFn: async () => {
      const r = await fetch(`/api/customers/${customerId}`);
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    enabled: !!customerId
  });

  if (!customerId) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <aside className="fixed right-0 top-0 z-50 h-full w-full max-w-[520px] bg-[#0a0a0a] border-l border-white/10 shadow-2xl flex flex-col animate-slide-in-right">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-purple-400" />
            <span className="text-sm font-bold text-white">Customer Twin</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/customers/${customerId}`} className="text-[10px] text-[#8A8A8A] hover:text-white flex items-center gap-1">
              Full profile <ExternalLink size={10} />
            </Link>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 text-[#8A8A8A]">
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-20 text-[#8A8A8A] text-xs gap-2">
              <Loader2 size={14} className="animate-spin" /> Building twin profile...
            </div>
          ) : data ? (
            <>
              {/* Profile header */}
              <div className="glass-inner p-4 space-y-3">
                <div>
                  <h2 className="text-lg font-bold text-white">{data.customer.name}</h2>
                  <p className="text-[11px] text-[#8A8A8A]">{data.customer.email}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  {[
                    ["City", data.customer.city ?? "—"],
                    ["Category", data.customer.category],
                    ["Preferred Channel", data.customer.channel],
                    ["Total Orders", data.purchaseHistory?.totalOrders ?? data.customer.orderCount ?? 0],
                    ["LTV", `₹${Math.round(data.scores.ltvScore).toLocaleString("en-IN")}`],
                    ["Churn Score", `${Math.round(data.scores.churnScore * 100)}%`],
                    ["Engagement", `${Math.round(data.scores.engagementScore)}`],
                    ["Purchase Prob.", `${Math.round(data.scores.purchaseProbability * 100)}%`],
                    ["Avg Order Value", `₹${Math.round(data.purchaseHistory?.averageOrderValue ?? data.customer.avgOrderValue ?? 0).toLocaleString("en-IN")}`],
                    ["Days Since Order", data.purchaseHistory?.daysSinceLastPurchase ?? "—"],
                  ].map(([k, v]) => (
                    <div key={k} className="bg-white/[0.02] rounded-lg px-2.5 py-1.5">
                      <div className="text-[#8A8A8A] uppercase font-semibold text-[8px]">{k}</div>
                      <div className="text-white font-mono mt-0.5">{v}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* DNA tags */}
              <section>
                <h3 className="text-[10px] font-semibold text-white/60 uppercase tracking-widest mb-2">Customer DNA</h3>
                <div className="flex flex-wrap gap-1.5">
                  {data.twin.dna.tags.map((tag: string) => (
                    <span key={tag} className="chip text-[10px] py-0.5 border-purple-500/20 text-purple-300">{tag}</span>
                  ))}
                </div>
              </section>

              {/* AI Summary */}
              <section className="glass-inner p-4 border-purple-500/20 bg-purple-500/[0.03]">
                <h3 className="text-[10px] font-semibold text-purple-300 uppercase tracking-widest mb-2 flex items-center gap-1">
                  <Sparkles size={11} /> AI Summary
                </h3>
                <p className="text-xs text-[#CFCFCF] leading-relaxed">{data.twin.aiSummary}</p>
              </section>

              {/* Journey Replay */}
              <section>
                <h3 className="text-[10px] font-semibold text-white/60 uppercase tracking-widest mb-3">Customer Journey Replay</h3>
                <JourneyReplayTimeline stages={data.twin.journeyStages} />
              </section>

              {/* Purchase History */}
              {data.purchaseHistory && (
                <section>
                  <h3 className="text-[10px] font-semibold text-white/60 uppercase tracking-widest mb-2 flex items-center gap-1">
                    <ShoppingBag size={11} /> Purchase History
                  </h3>
                  <div className="grid grid-cols-2 gap-2 mb-3 text-[10px]">
                    <div className="glass-inner p-2"><span className="text-[#8A8A8A]">Orders</span><div className="text-white font-mono">{data.purchaseHistory.totalOrders}</div></div>
                    <div className="glass-inner p-2"><span className="text-[#8A8A8A]">AOV</span><div className="text-white font-mono">₹{Math.round(data.purchaseHistory.averageOrderValue).toLocaleString("en-IN")}</div></div>
                    <div className="glass-inner p-2"><span className="text-[#8A8A8A]">Last Purchase</span><div className="text-white font-mono">{data.purchaseHistory.lastPurchaseDate ? new Date(data.purchaseHistory.lastPurchaseDate).toLocaleDateString() : "—"}</div></div>
                    <div className="glass-inner p-2"><span className="text-[#8A8A8A]">Revenue Contribution</span><div className="text-emerald-400 font-mono">₹{Math.round(data.purchaseHistory.revenueContribution ?? data.customer.totalSpend ?? 0).toLocaleString("en-IN")}</div></div>
                  </div>
                  <div className="overflow-x-auto rounded-lg border border-white/[0.06]">
                    <table className="w-full text-[10px]">
                      <thead><tr className="border-b border-white/[0.06] text-[#8A8A8A]"><th className="p-2 text-left">Date</th><th className="p-2 text-left">Product</th><th className="p-2 text-left">Category</th><th className="p-2 text-right">Amount</th></tr></thead>
                      <tbody>
                        {data.purchaseHistory.orders.slice(0, 10).map((o: any, i: number) => (
                          <tr key={i} className="border-b border-white/[0.03]">
                            <td className="p-2 text-[#8A8A8A] font-mono">{new Date(o.date).toLocaleDateString()}</td>
                            <td className="p-2 text-white">{o.product}</td>
                            <td className="p-2"><span className="chip text-[9px] py-0">{o.category}</span></td>
                            <td className="p-2 text-right font-mono text-white">₹{Math.round(o.amount).toLocaleString("en-IN")}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {/* Campaign History */}
              {data.campaignHistory?.length > 0 && (
                <section>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-[10px] font-semibold text-white/60 uppercase tracking-widest flex items-center gap-1">
                      <Megaphone size={11} /> Campaign Interaction History
                    </h3>
                    <div className="relative">
                      <Filter size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-[#8A8A8A]" />
                      <input
                        value={campaignFilter}
                        onChange={e => setCampaignFilter(e.target.value)}
                        placeholder="Filter campaigns..."
                        className="input text-[9px] py-1 pl-6 h-7 w-36"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    {data.campaignHistory
                      .filter((c: any) => !campaignFilter || c.campaignName.toLowerCase().includes(campaignFilter.toLowerCase()))
                      .map((c: any, i: number) => (
                      <div key={i} className="glass-inner p-3 text-[10px]">
                        <div className="flex items-start justify-between gap-2">
                          <div className="font-semibold text-white truncate">{c.campaignName}</div>
                          <span className="text-[#8A8A8A] font-mono shrink-0">{new Date(c.date).toLocaleDateString()}</span>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-1.5 text-[#8A8A8A]">
                          <span className="font-mono uppercase">{c.channel}</span>
                          {c.isFallback && <span className="text-amber-400">Fallback → {c.fallbackChannel}</span>}
                          {c.delivered && <span className="text-emerald-400">✓ Delivered</span>}
                          {c.opened && <span className="text-emerald-400">✓ Opened</span>}
                          {c.clicked && <span className="text-emerald-400">✓ Clicked</span>}
                          {c.converted && <span className="text-emerald-400">✓ Converted</span>}
                        </div>
                        {c.campaignId && (
                          <Link href={`/campaigns/${c.campaignId}`} className="text-[9px] text-purple-400 hover:text-purple-300 mt-1 inline-block">
                            View campaign →
                          </Link>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Next Best Action */}
              {data.nextBestAction && (
                <section className="glass-inner p-4 border-emerald-500/20">
                  <h3 className="text-[10px] font-semibold text-emerald-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                    <Target size={11} /> Next Best Action
                  </h3>
                  <ul className="space-y-1.5 mb-3">
                    {data.nextBestAction.actions.map((a: any, i: number) => (
                      <li key={i} className="text-xs text-[#CFCFCF]"><span className="text-white font-semibold">• {a.action}</span> — {a.description}</li>
                    ))}
                  </ul>
                  <div className="flex gap-4 text-[10px] font-mono">
                    <div><span className="text-[#8A8A8A]">Expected Conversion</span><div className="text-emerald-400">{data.nextBestAction.expectedConversion}%</div></div>
                    <div><span className="text-[#8A8A8A]">Expected Revenue</span><div className="text-white">₹{data.nextBestAction.expectedRevenue.toLocaleString("en-IN")}</div></div>
                  </div>
                </section>
              )}

              {/* Best Contact Time */}
              {data.contactTime && (
                <section className="glass-inner p-4">
                  <h3 className="text-[10px] font-semibold text-white/60 uppercase tracking-widest mb-2 flex items-center gap-1">
                    <Clock size={11} /> Best Contact Window
                  </h3>
                  <div className="text-lg font-bold text-white font-mono">{data.contactTime.window}</div>
                  <div className="text-[10px] text-emerald-400 mt-1">{data.contactTime.confidence}% confidence</div>
                  <p className="text-[10px] text-[#8A8A8A] mt-1">{data.contactTime.reasoning}</p>
                </section>
              )}

              {/* Product Recommendations */}
              {data.productRecs?.length > 0 && (
                <section>
                  <h3 className="text-[10px] font-semibold text-white/60 uppercase tracking-widest mb-2">Recommended Products</h3>
                  <div className="space-y-2">
                    {data.productRecs.map((p: any, i: number) => (
                      <div key={i} className="glass-inner p-3 flex justify-between items-center text-[10px]">
                        <div>
                          <div className="text-white font-semibold">{p.product}</div>
                          <div className="text-[#8A8A8A]">{p.category}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-emerald-400 font-mono">{p.expectedPurchaseProbability}% prob.</div>
                          <div className="text-[9px] text-[#8A8A8A]">Est. ₹{(p.expectedRevenue ?? 0).toLocaleString("en-IN")}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Lookalikes */}
              {data.lookalikes?.length > 0 && (
                <section>
                  <h3 className="text-[10px] font-semibold text-white/60 uppercase tracking-widest mb-2 flex items-center gap-1">
                    <Users size={11} /> Lookalike Customers
                  </h3>
                  <div className="space-y-1.5">
                    {data.lookalikes.map((l: any) => (
                      <button key={l.id} onClick={() => window.dispatchEvent(new CustomEvent("open-customer-twin", { detail: l.id }))}
                        className="w-full glass-inner p-2.5 flex justify-between items-center text-[10px] hover:bg-white/[0.03] text-left">
                        <span className="text-white">{l.name}</span>
                        <span className="text-purple-400 font-mono">{l.similarityScore}% similar</span>
                      </button>
                    ))}
                  </div>
                </section>
              )}
            </>
          ) : null}
        </div>
      </aside>
    </>
  );
}
