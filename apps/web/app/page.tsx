"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { StatusPill } from "../components/StatusPill";
import { FadeIn, Stagger, StaggerItem, Counter } from "../components/Motion";
import { api } from "../lib/api";
import { BarChart2, Target, Bot, Sparkles, TrendingUp, ArrowRight } from "lucide-react";

const KPI_STYLES = [
  { grad: "grad-violet", icon: Target, ring: "text-violet-300" },
  { grad: "grad-sky", icon: BarChart2, ring: "text-sky-300" },
  { grad: "grad-pink", icon: Bot, ring: "text-pink-300" },
  { grad: "grad-green", icon: TrendingUp, ring: "text-emerald-300" }
];

export default function DashboardPage() {
  const [kpis, setKpis] = useState<any>(null);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [seeding, setSeeding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setError(null);
      const [overview, camps] = await Promise.all([api.overview(), api.campaigns()]);
      setKpis(overview.kpis);
      setCampaigns(camps);
    } catch (e: any) {
      setError(e.message);
    }
  }

  useEffect(() => {
    load().then(async () => {
      // First visit: auto-seed demo data so the product feels alive immediately.
      try {
        const overview = await api.overview();
        if ((overview.kpis?.customers ?? 0) === 0) {
          await api.seed(300);
          await load();
        }
      } catch {
        /* backend may be down */
      }
    });
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

  const empty = (kpis?.customers ?? 0) === 0;

  const kpiData = [
    { label: "Shoppers", value: kpis?.customers ?? 0, sub: "In your CRM" },
    { label: "Campaigns", value: kpis?.campaigns ?? 0, sub: "Created" },
    { label: "Messages", value: kpis?.messages ?? 0, sub: "Dispatched" },
    { label: "Attributed revenue", value: kpis?.revenue ?? 0, sub: "From conversions", prefix: "₹" }
  ];

  const rates = [
    { label: "Delivery rate", value: kpis?.deliveryRate ?? 0, color: "from-sky-500 to-cyan-400" },
    { label: "Open rate", value: kpis?.openRate ?? 0, color: "from-violet-500 to-fuchsia-400" },
    { label: "Click rate", value: kpis?.clickRate ?? 0, color: "from-pink-500 to-rose-400" },
    { label: "Conversion rate", value: kpis?.conversionRate ?? 0, color: "from-emerald-500 to-lime-400" }
  ];

  return (
    <div className="space-y-6">
      <FadeIn className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="text-3xl font-bold">
            Welcome back <span className="inline-block animate-pulse">👋</span>
          </div>
          <div className="opacity-70 text-sm mt-1">
            Your autonomous marketing strategist for <span className="gradient-text font-semibold">Brewhaus Coffee</span>
          </div>
        </div>
        <div className="flex gap-3">
          <Button onClick={seed} disabled={seeding} className="from-white/10 to-white/5 border-white/20">
            {seeding ? "Generating…" : empty ? "Generate demo data" : "Reset demo data"}
          </Button>
          <Link href="/copilot">
            <Button>
              <span className="inline-flex items-center gap-2">
                <Sparkles size={16} /> Launch a campaign
              </span>
            </Button>
          </Link>
        </div>
      </FadeIn>

      {error && (
        <Card className="border-red-400/40">
          <div className="text-red-300 text-sm">Backend unreachable: {error}</div>
          <div className="opacity-70 text-xs mt-1">Check that the CRM backend is running at {api.base}</div>
        </Card>
      )}

      {empty && !error && (
        <FadeIn>
          <Card className="grad-violet">
            <div className="text-lg font-semibold mb-1">No data yet</div>
            <div className="opacity-80 text-sm">
              Click <b>Generate demo data</b> to create 300 realistic shoppers with order history, then head to the Copilot.
            </div>
          </Card>
        </FadeIn>
      )}

      <Stagger className="grid md:grid-cols-4 gap-6">
        {kpiData.map((k, i) => {
          const s = KPI_STYLES[i];
          const Icon = s.icon;
          return (
            <StaggerItem key={k.label}>
              <Card className={`relative overflow-hidden ${s.grad}`}>
                <Icon className={`absolute right-2 -top-6 opacity-20 ${s.ring}`} size={110} />
                <div className="text-sm opacity-80 mb-1">{k.label}</div>
                <div className="text-4xl font-bold mb-2">
                  <Counter value={k.value} prefix={k.prefix ?? ""} />
                </div>
                <div className="opacity-70 text-sm">{k.sub}</div>
              </Card>
            </StaggerItem>
          );
        })}
      </Stagger>

      <Stagger className="grid md:grid-cols-4 gap-6">
        {rates.map((r) => (
          <StaggerItem key={r.label}>
            <Card>
              <div className="text-sm opacity-80 mb-2">{r.label}</div>
              <div className="text-3xl font-bold mb-3">{r.value}%</div>
              <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                <motion.div
                  className={`h-full rounded-full bg-gradient-to-r ${r.color}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, r.value)}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                />
              </div>
            </Card>
          </StaggerItem>
        ))}
      </Stagger>

      <FadeIn delay={0.1}>
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div className="text-lg font-semibold">Recent campaigns</div>
            <Link href="/analytics" className="text-sm opacity-70 hover:opacity-100 inline-flex items-center gap-1">
              View analytics <ArrowRight size={14} />
            </Link>
          </div>
          {campaigns.length === 0 ? (
            <div className="opacity-70 text-sm">No campaigns yet. Create one in the Copilot.</div>
          ) : (
            <div className="space-y-2">
              {campaigns.slice(0, 6).map((c, i) => (
                <motion.div
                  key={c._id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10 hover:border-violet-400/40 transition-colors"
                >
                  <div>
                    <div className="font-medium">{c.name}</div>
                    <div className="text-xs opacity-70">
                      {c.channel?.toUpperCase()} · audience ~{c.estimatedAudienceSize ?? "—"}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <StatusPill status={c.status} />
                    <span className="opacity-80">{c.analytics?.purchased ?? 0} 🛍️</span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </Card>
      </FadeIn>
    </div>
  );
}
