"use client";

import Link from "next/link";
import { Rocket, TrendingUp, Gift, Heart } from "lucide-react";

type Rec = {
  type: string;
  title: string;
  detail: string;
  expectedRevenue: number;
  expectedConversion: number;
  confidence: number;
  prompt: string;
  icon: typeof Rocket;
};

type Props = {
  campaignGoal?: string;
  channel?: string;
  status?: string;
};

export function FollowUpRecommendations({ campaignGoal, channel, status }: Props) {
  if (status !== "COMPLETED" && status !== "RUNNING") return null;

  const recs: Rec[] = [
    {
      type: "WIN_BACK",
      title: "Win-back Campaign",
      detail: "Re-engage shoppers who opened but didn't convert",
      expectedRevenue: 85000,
      expectedConversion: 12,
      confidence: 78,
      prompt: "Create a win-back campaign for customers who opened but did not convert",
      icon: Heart,
    },
    {
      type: "UPSELL",
      title: "Upsell Campaign",
      detail: `Premium upsell via ${channel ?? "WhatsApp"} for high-LTV segment`,
      expectedRevenue: 120000,
      expectedConversion: 18,
      confidence: 82,
      prompt: "Generate an upsell campaign for high-LTV customers with premium offers",
      icon: TrendingUp,
    },
    {
      type: "CROSS_SELL",
      title: "Cross-sell Campaign",
      detail: "Recommend complementary categories based on purchase history",
      expectedRevenue: 65000,
      expectedConversion: 15,
      confidence: 74,
      prompt: "Create a cross-sell campaign for beauty customers interested in skincare",
      icon: Gift,
    },
    {
      type: "LOYALTY",
      title: "Loyalty Campaign",
      detail: "Reward repeat purchasers with exclusive VIP access",
      expectedRevenue: 95000,
      expectedConversion: 22,
      confidence: 88,
      prompt: "Launch a loyalty campaign for customers with 3+ orders",
      icon: Rocket,
    },
  ];

  return (
    <div className="glass p-6">
      <h2 className="text-xs font-semibold text-white/70 uppercase tracking-widest mb-4 flex items-center gap-2">
        <Rocket size={13} className="text-purple-400" /> Follow-up Recommendations
      </h2>
      <p className="text-[11px] text-[#8A8A8A] mb-4">
        AI-suggested next campaigns after &ldquo;{campaignGoal?.slice(0, 50) ?? "this campaign"}&rdquo;
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {recs.map(rec => {
          const Icon = rec.icon;
          return (
            <div key={rec.type} className="glass-inner p-4 flex flex-col gap-3">
              <div className="flex items-start gap-2">
                <Icon size={14} className="text-purple-400 mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs font-bold text-white">{rec.title}</div>
                  <div className="text-[10px] text-[#8A8A8A] mt-0.5">{rec.detail}</div>
                </div>
              </div>
              <div className="flex gap-4 text-[10px] font-mono">
                <div><span className="text-[#8A8A8A]">Revenue</span><div className="text-emerald-400">₹{rec.expectedRevenue.toLocaleString("en-IN")}</div></div>
                <div><span className="text-[#8A8A8A]">Conv.</span><div className="text-white">{rec.expectedConversion}%</div></div>
                <div><span className="text-[#8A8A8A]">Conf.</span><div className="text-purple-300">{rec.confidence}%</div></div>
              </div>
              <Link
                href={`/copilot?prompt=${encodeURIComponent(rec.prompt)}`}
                className="btn-secondary text-[10px] py-1.5 px-3 text-center"
              >
                One-click Launch →
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
