"use client";

import { useState, useEffect } from "react";
import clsx from "clsx";
import { ChevronDown } from "lucide-react";

type Stage = { stage: string; label: string; date?: string; active?: boolean };

export function JourneyReplayTimeline({ stages }: { stages: Stage[] }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [playing, setPlaying] = useState(false);

  const completedCount = stages.filter(s => s.active || s.date).length;

  useEffect(() => {
    if (!playing) return;
    if (activeIdx >= stages.length - 1) {
      setPlaying(false);
      return;
    }
    const t = setTimeout(() => setActiveIdx(i => i + 1), 800);
    return () => clearTimeout(t);
  }, [playing, activeIdx, stages.length]);

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button
          onClick={() => { setActiveIdx(0); setPlaying(true); }}
          className="btn-secondary text-[10px] py-1 px-3"
        >
          ▶ Replay Journey
        </button>
        <button onClick={() => setPlaying(false)} className="btn-secondary text-[10px] py-1 px-3">
          Pause
        </button>
      </div>
      <div className="relative pl-4">
        {stages.map((stage, i) => {
          const lit = i <= activeIdx && (stage.active || stage.date || playing);
          const isLast = i === stages.length - 1;
          return (
            <div key={stage.stage + i} className="relative pb-4">
              {!isLast && (
                <div className={clsx(
                  "absolute left-[7px] top-4 w-px h-full transition-colors duration-500",
                  lit ? "bg-emerald-500/50" : "bg-white/10"
                )} />
              )}
              <div className="flex items-start gap-3">
                <div className={clsx(
                  "h-4 w-4 rounded-full border-2 shrink-0 mt-0.5 transition-all duration-500",
                  lit ? "bg-emerald-500 border-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]" : "bg-transparent border-white/20"
                )} />
                <div className="flex-1 min-w-0">
                  <div className={clsx("text-xs font-semibold transition-colors", lit ? "text-white" : "text-white/30")}>
                    {stage.label}
                  </div>
                  {stage.date && lit && (
                    <div className="text-[9px] text-[#8A8A8A] font-mono mt-0.5">
                      {new Date(stage.date).toLocaleString()}
                    </div>
                  )}
                </div>
                {i < activeIdx && <ChevronDown size={12} className="text-emerald-400/50 rotate-[-90deg]" />}
              </div>
            </div>
          );
        })}
      </div>
      <div className="text-[9px] text-[#8A8A8A] font-mono">
        {completedCount}/{stages.length} stages completed
      </div>
    </div>
  );
}
