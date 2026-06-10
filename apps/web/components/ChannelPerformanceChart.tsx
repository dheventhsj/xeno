"use client";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from "recharts";
import { Card } from "./ui/card";

const COLORS = {
  delivered: "#38bdf8",
  opened: "#a78bfa",
  clicked: "#f472b6",
  purchased: "#34d399"
};

type Row = { channel: string; delivered: number; opened: number; clicked: number; purchased: number };

export function ChannelPerformanceChart({ data }: { data?: Row[] }) {
  const chartData = data?.length
    ? data
    : [
        { channel: "WhatsApp", delivered: 0, opened: 0, clicked: 0, purchased: 0 },
        { channel: "Email", delivered: 0, opened: 0, clicked: 0, purchased: 0 },
        { channel: "SMS", delivered: 0, opened: 0, clicked: 0, purchased: 0 },
        { channel: "RCS", delivered: 0, opened: 0, clicked: 0, purchased: 0 }
      ];

  return (
    <Card className="grad-violet">
      <div className="text-sm opacity-80 mb-3">Channel performance</div>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
            <XAxis dataKey="channel" stroke="rgba(255,255,255,0.6)" />
            <YAxis stroke="rgba(255,255,255,0.6)" />
            <Tooltip contentStyle={{ background: "rgba(0,0,0,0.8)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 12 }} />
            {Object.entries(COLORS).map(([key, fill]) => (
              <Bar key={key} dataKey={key} stackId="a" fill={fill} radius={key === "purchased" ? [6, 6, 0, 0] : undefined} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
