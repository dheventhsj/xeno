"use client";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { api } from "../../lib/api";
import { FadeIn, Stagger, StaggerItem } from "../../components/Motion";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from "recharts";

const BAR_COLORS = ["#a78bfa", "#38bdf8", "#f472b6", "#34d399", "#fbbf24", "#fb7185"];

export default function CustomersPage() {
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [seeding, setSeeding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setError(null);
      const data = await api.customers(q, 100);
      setItems(data.items);
      setTotal(data.total);
    } catch (e: any) {
      setError(e.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function seed() {
    setSeeding(true);
    try {
      await api.seed(300);
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSeeding(false);
    }
  }

  const topCities = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of items) if (c.city) counts[c.city] = (counts[c.city] ?? 0) + 1;
    return Object.entries(counts)
      .map(([city, count]) => ({ city, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [items]);

  return (
    <div className="space-y-6">
      <FadeIn>
        <Card className="grad-sky">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="text-2xl font-bold mb-1 gradient-text inline-block">Shoppers</div>
              <div className="text-sm opacity-80">{total.toLocaleString("en-IN")} customers in your CRM</div>
            </div>
            <div className="flex gap-3 flex-wrap">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && load()}
                placeholder="Search name, email, city…"
                className="bg-black/20 border border-white/20 rounded-xl px-4 py-2 outline-none focus:border-sky-400/60 transition"
              />
              <Button onClick={load} className="from-white/10 to-white/5 border-white/20">Search</Button>
              <Button onClick={seed} disabled={seeding}>
                {seeding ? "Generating…" : "Generate demo data"}
              </Button>
            </div>
          </div>
        </Card>
      </FadeIn>

      {error && (
        <Card className="border-red-400/40">
          <div className="text-red-300 text-sm">{error}</div>
        </Card>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <div className="text-sm opacity-80 mb-3">Customer list</div>
          <div className="overflow-auto max-h-[520px]">
            <table className="w-full text-sm">
              <thead className="text-left opacity-60 sticky top-0 bg-[#0b0f17]/90 backdrop-blur">
                <tr>
                  <th className="py-2">Name</th>
                  <th>City</th>
                  <th>Channel</th>
                  <th className="text-right">Spend</th>
                  <th className="text-right">Engagement</th>
                </tr>
              </thead>
              <tbody>
                {items.map((c, i) => (
                  <motion.tr
                    key={c._id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: Math.min(i * 0.02, 0.5) }}
                    className="border-t border-white/10 hover:bg-white/5 transition"
                  >
                    <td className="py-2">
                      <div className="font-medium">{c.name}</div>
                      <div className="text-xs opacity-60">{c.email}</div>
                    </td>
                    <td className="opacity-80">{c.city}</td>
                    <td>
                      <span className="chip text-xs px-2 py-0.5">{c.preferredChannel?.toUpperCase()}</span>
                    </td>
                    <td className="text-right font-medium">₹{c.totalSpend?.toLocaleString("en-IN")}</td>
                    <td className="text-right">
                      <EngagementBar score={c.engagementScore} />
                    </td>
                  </motion.tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center opacity-60">
                      No customers. Click “Generate demo data”.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="grad-pink">
          <div className="text-sm opacity-80 mb-3">Top cities</div>
          <div className="h-[460px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topCities} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis type="number" stroke="rgba(255,255,255,0.6)" />
                <YAxis type="category" dataKey="city" stroke="rgba(255,255,255,0.6)" width={70} />
                <Tooltip contentStyle={{ background: "rgba(0,0,0,0.8)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 12 }} />
                <Bar dataKey="count" radius={[0, 8, 8, 0]}>
                  {topCities.map((_, i) => (
                    <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}

function EngagementBar({ score }: { score: number }) {
  const color = score >= 65 ? "from-emerald-400 to-lime-400" : score >= 35 ? "from-amber-400 to-orange-400" : "from-red-400 to-rose-400";
  return (
    <div className="flex items-center gap-2 justify-end">
      <div className="w-16 h-1.5 rounded-full bg-white/10 overflow-hidden">
        <motion.div
          className={`h-full rounded-full bg-gradient-to-r ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.6 }}
        />
      </div>
      <span className="text-xs w-6">{score}</span>
    </div>
  );
}
