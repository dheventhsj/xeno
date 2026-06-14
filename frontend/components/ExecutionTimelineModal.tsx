"use client";

import { ThinkingTimeline, type TimelineStep } from "./ThinkingTimeline";
import { X } from "lucide-react";

type Props = {
  open: boolean;
  title: string;
  steps: TimelineStep[];
  durationMs?: number;
  onClose: () => void;
};

export function ExecutionTimelineModal({ open, title, steps, durationMs, onClose }: Props) {
  if (!open) return null;

  const allDone = steps.every(s => s.status === "completed");

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" onClick={allDone ? onClose : undefined} />
      <div className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-md glass p-6 border-white/10 animate-scale-in">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white">{title}</h3>
          {allDone && (
            <button onClick={onClose} className="p-1 rounded hover:bg-white/5 text-[#8A8A8A]">
              <X size={14} />
            </button>
          )}
        </div>
        <ThinkingTimeline steps={steps} />
        {durationMs != null && allDone && (
          <div className="mt-3 text-[10px] text-emerald-400 font-mono text-center">
            Completed in {(durationMs / 1000).toFixed(1)}s
          </div>
        )}
      </div>
    </>
  );
}
