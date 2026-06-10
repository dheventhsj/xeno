"use client";
import { useEffect, useState } from "react";
import { Card } from "../../components/ui/card";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  FunnelChart,
  Funnel,
  LabelList,
  Cell
} from "recharts";
import { api } from "../../lib/api";
import { FadeIn, Stagger, StaggerItem } from "../../components/Motion";
import { ChannelPerformanceChart } from "../../components/ChannelPerformanceChart";

const FUNNEL_COLORS = ["#38bdf8", "#7c3aed", "#a78bfa", "#f0abfc", "#22c55e"];

const KPI_GRADS = ["grad-sky", "grad-violet", "grad-pink", "grad-green"];

export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .overview()
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  const k = data?.kpis;

  return (
    <div className="space-y-6">
      <FadeIn>
        <Card className="grad-violet">
          <div className="text-2xl font-bold gradient-text inline-block">Campaign analytics</div>
          <div className="text-sm opacity-80 mt-1">Performance across channels, audiences, and the full delivery funnel.</div>
        </Card>
      </FadeIn>

      {error && (
        <Card className="border-red-400/40">
          <div className="text-red-300 text-sm">{error}</div>
        </Card>
      )}

      <Stagger className="grid md:grid-cols-4 gap-6">
        {[
          { label: "Delivery rate", value: k?.deliveryRate ?? 0 },
          { label: "Open rate", value: k?.openRate ?? 0 },
          { label: "Click rate", value: k?.clickRate ?? 0 },
          { label: "Conversion rate", value: k?.conversionRate ?? 0 }
        ].map((m, i) => (
          <StaggerItem key={m.label}>
            <Kpi label={m.label} value={`${m.value}%`} grad={KPI_GRADS[i]} />
          </StaggerItem>
        ))}
      </Stagger>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="grad-sky">
          <div className="text-sm opacity-80 mb-3">Engagement funnel</div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <FunnelChart>
                <Tooltip contentStyle={{ background: "rgba(0,0,0,0.8)", border: "1px solid rgba(255,255,255,0.1)" }} />
                <Funnel dataKey="count" data={data?.funnel ?? []} isAnimationActive>
                  <LabelList position="right" fill="#fff" stroke="none" dataKey="stage" className="capitalize" />
                  <LabelList position="left" fill="#fff" stroke="none" dataKey="count" />
                  {(data?.funnel ?? []).map((_: any, i: number) => (
                    <Cell key={i} fill={FUNNEL_COLORS[i % FUNNEL_COLORS.length]} />
                  ))}
                </Funnel>
              </FunnelChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <ChannelPerformanceChart data={data?.channelPerformance} />
      </div>

      <Card className="grad-green">
        <div className="text-sm opacity-80 mb-3">Lifetime totals</div>
        <div className="grid grid-cols-3 sm:grid-cols-7 gap-3">
          {["sent", "delivered", "failed", "opened", "clicked", "purchased"].map((key, i) => (
            <div key={key} className={`p-3 rounded-xl border border-white/10 ${["grad-sky", "grad-violet", "grad-pink", "grad-pink", "grad-green", "grad-green"][i]}`}>
              <div className="text-xs opacity-70 capitalize">{key}</div>
              <div className="text-2xl font-semibold">{(data?.totals?.[key] ?? 0).toLocaleString("en-IN")}</div>
            </div>
          ))}
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-400/30">
            <div className="text-xs opacity-70">Revenue</div>
            <div className="text-2xl font-semibold">₹{(data?.totals?.revenue ?? 0).toLocaleString("en-IN")}</div>
          </div>
        </div>
      </Card>
    </div>
  );
}

function Kpi({ label, value, grad }: { label: string; value: string; grad?: string }) {
  return (
    <Card className={grad}>
      <div className="text-sm opacity-80 mb-1">{label}</div>
      <div className="text-4xl font-bold">{value}</div>
    </Card>
  );
}
