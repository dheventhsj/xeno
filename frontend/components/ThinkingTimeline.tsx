"use client";

import clsx from "clsx";
import { CheckCircle2, Loader2, Circle } from "lucide-react";

export type TimelineStep = {
  id: string;
  label: string;
  tool?: string;
  status: "pending" | "active" | "completed";
  detail?: string;
};

export function ThinkingTimeline({ steps, compact = false }: { steps: TimelineStep[]; compact?: boolean }) {
  return (
    <div className={clsx("space-y-0", compact ? "text-[10px]" : "text-xs")}>
      {steps.map((step, i) => (
        <div key={step.id} className="flex gap-3 relative">
          {i < steps.length - 1 && (
            <div className={clsx(
              "absolute left-[11px] top-6 w-px h-[calc(100%-4px)]",
              step.status === "completed" ? "bg-emerald-500/40" : "bg-white/10"
            )} />
          )}
          <div className="shrink-0 mt-0.5">
            {step.status === "completed" && <CheckCircle2 size={compact ? 14 : 16} className="text-emerald-400" />}
            {step.status === "active" && <Loader2 size={compact ? 14 : 16} className="text-purple-400 animate-spin" />}
            {step.status === "pending" && <Circle size={compact ? 14 : 16} className="text-white/20" />}
          </div>
          <div className="pb-4 flex-1 min-w-0">
            <div className={clsx(
              "font-semibold",
              step.status === "completed" ? "text-emerald-300/90" :
              step.status === "active" ? "text-white" : "text-white/30"
            )}>
              {step.status === "completed" && "✓ "}{step.label}
            </div>
            {step.tool && (
              <div className="text-[9px] text-purple-400/70 font-mono mt-0.5">{step.tool}</div>
            )}
            {step.detail && step.status !== "pending" && (
              <div className="text-[10px] text-[#8A8A8A] mt-0.5 truncate">{step.detail}</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
