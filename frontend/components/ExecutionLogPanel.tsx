"use client";

import { useQuery } from "@tanstack/react-query";
import { Brain, Loader2, Clock } from "lucide-react";

export function ExecutionLogPanel() {
  const { data, isLoading } = useQuery({
    queryKey: ["reasoning-logs"],
    queryFn: async () => {
      const r = await fetch("/api/agent/reasoning-log");
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    refetchInterval: 15000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-xs text-[#8A8A8A] py-4">
        <Loader2 size={12} className="animate-spin" /> Loading AI execution logs...
      </div>
    );
  }

  const logs = data?.logs ?? [];

  if (logs.length === 0) {
    return (
      <div className="text-center py-6 text-[11px] text-[#8A8A8A]">
        No AI execution logs yet. Launch a campaign or generate an audience to populate logs.
      </div>
    );
  }

  return (
    <div className="space-y-3 max-h-[320px] overflow-y-auto">
      {logs.map((log: any) => (
        <div key={log.id} className="glass-inner p-3 border-white/[0.04]">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-1.5">
              <Brain size={12} className="text-purple-400 shrink-0" />
              <span className="text-xs font-semibold text-white truncate">{log.goal}</span>
            </div>
            <span className="text-[9px] text-[#8A8A8A] font-mono shrink-0 flex items-center gap-1">
              <Clock size={9} />
              {log.durationMs ? `${(log.durationMs / 1000).toFixed(1)}s` : "—"}
            </span>
          </div>
          <div className="space-y-1">
            {(log.steps ?? []).map((s: any, i: number) => (
              <div key={i} className="flex items-center gap-2 text-[10px] font-mono">
                <span className="text-emerald-400">✓</span>
                <span className="text-[#CFCFCF]">[{s.tool ?? s.label}]</span>
                <span className="text-white/60">{s.label}</span>
              </div>
            ))}
          </div>
          <div className="text-[9px] text-[#8A8A8A] mt-2 font-mono">
            {new Date(log.createdAt).toLocaleString()}
          </div>
        </div>
      ))}
    </div>
  );
}
