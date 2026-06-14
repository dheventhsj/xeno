"use client";

import clsx from "clsx";

type Stage = { key: string; label: string; count: number };

type Props = {
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  converted: number;
  read?: number;
};

export function DeliveryLifecycleViz({ sent, delivered, opened, clicked, converted, read }: Props) {
  const readCount = read ?? opened;
  const stages: Stage[] = [
    { key: "SENT", label: "Sent", count: sent },
    { key: "DELIVERED", label: "Delivered", count: delivered },
    { key: "OPENED", label: "Opened", count: opened },
    { key: "READ", label: "Read", count: readCount },
    { key: "CLICKED", label: "Clicked", count: clicked },
    { key: "CONVERTED", label: "Converted", count: converted },
  ];

  const max = Math.max(...stages.map(s => s.count), 1);

  return (
    <div className="flex flex-col items-center gap-0 py-2">
      {stages.map((stage, i) => (
        <div key={stage.key} className="flex flex-col items-center w-full max-w-md">
          <div
            className={clsx(
              "w-full rounded-lg border px-4 py-3 flex items-center justify-between transition-all duration-500",
              stage.count > 0 ? "border-emerald-500/30 bg-emerald-500/[0.04]" : "border-white/[0.06] bg-white/[0.02]"
            )}
          >
            <div className="flex items-center gap-2">
              <span className={clsx(
                "text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border",
                stage.count > 0 ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" : "text-[#8A8A8A] border-white/10"
              )}>
                {stage.key}
              </span>
              <span className="text-xs text-white font-medium">{stage.label}</span>
            </div>
            <span className="text-sm font-bold text-white font-mono">{stage.count.toLocaleString("en-IN")}</span>
          </div>
          <div className="h-6 w-px bg-gradient-to-b from-white/20 to-white/5 relative">
            {i < stages.length - 1 && stage.count > 0 && (
              <div
                className="absolute left-1/2 -translate-x-1/2 top-0 w-0.5 bg-emerald-500/50 transition-all duration-700"
                style={{ height: `${Math.min(100, (stages[i + 1].count / max) * 100)}%` }}
              />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
