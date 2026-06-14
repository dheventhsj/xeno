"use client";

import { ArrowDown } from "lucide-react";

type Props = {
  primaryChannel: string;
  fallbackChannel?: string;
  fallbackCount?: number;
  deliveredViaFallback?: number;
};

export function FallbackWorkflow({ primaryChannel, fallbackChannel = "SMS", fallbackCount = 0, deliveredViaFallback = 0 }: Props) {
  const steps = [
    { label: primaryChannel, status: "primary" },
    { label: "Undelivered", status: "fail" },
    { label: `${fallbackChannel} Retry`, status: "fallback" },
    { label: "Delivered", status: "success" },
  ];

  return (
    <div className="glass-inner p-4">
      <div className="text-[10px] text-[#8A8A8A] uppercase font-semibold mb-3">Multi-Channel Fallback Workflow</div>
      <div className="flex flex-col items-center gap-1">
        {steps.map((step, i) => (
          <div key={step.label} className="flex flex-col items-center w-full">
            <div className={`px-4 py-2 rounded-lg text-xs font-semibold w-full max-w-[200px] text-center border ${
              step.status === "primary" ? "bg-white/10 border-white/20 text-white" :
              step.status === "fail" ? "bg-red-500/10 border-red-500/20 text-red-300" :
              step.status === "fallback" ? "bg-amber-500/10 border-amber-500/20 text-amber-300" :
              "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
            }`}>
              {step.label}
            </div>
            {i < steps.length - 1 && <ArrowDown size={14} className="text-white/20 my-1" />}
          </div>
        ))}
      </div>
      {(fallbackCount > 0 || deliveredViaFallback > 0) && (
        <div className="mt-3 text-[10px] text-[#8A8A8A] font-mono text-center">
          {fallbackCount} fallback attempts · {deliveredViaFallback} recovered via {fallbackChannel}
        </div>
      )}
      <p className="text-[9px] text-[#8A8A8A] mt-2 text-center">
        Primary: {primaryChannel} → Fallback: {fallbackChannel} after 10 min if undelivered
      </p>
    </div>
  );
}
