"use client";

import { useCallback, useState } from "react";
import type { TimelineStep } from "@/components/ThinkingTimeline";

const THINKING_STEPS: TimelineStep[] = [
  { id: "goal", label: "Understanding Goal", tool: "Intent Classifier", status: "pending" },
  { id: "customers", label: "Analyzing Customers", tool: "Customer Analyzer", status: "pending" },
  { id: "churn", label: "Calculating Churn", tool: "Churn Detector", status: "pending" },
  { id: "audience", label: "Building Audience", tool: "Audience Builder", status: "pending" },
  { id: "channel", label: "Selecting Channel", tool: "Channel Strategist", status: "pending" },
  { id: "messages", label: "Generating Message", tool: "Message Generator", status: "pending" },
  { id: "forecast", label: "Forecasting Revenue", tool: "Forecast Engine", status: "pending" },
  { id: "ready", label: "Ready to Launch", tool: "Campaign Planner", status: "pending" },
  { id: "launch", label: "Launching Campaign", tool: "Campaign Dispatcher", status: "pending" },
];

export function useAnimatedThinkingTimeline() {
  const [steps, setSteps] = useState<TimelineStep[]>([]);
  const [durationMs, setDurationMs] = useState<number>();
  const [running, setRunning] = useState(false);

  const runWithTimeline = useCallback(async <T,>(
    action: () => Promise<T>,
    options?: { includeLaunch?: boolean; goal?: string }
  ): Promise<T> => {
    const baseSteps = THINKING_STEPS.filter(s => options?.includeLaunch || s.id !== "launch");

    setRunning(true);
    setSteps(baseSteps.map((s, i) => ({ ...s, status: i === 0 ? "active" : "pending" })));
    const start = Date.now();

    const advanceInterval = setInterval(() => {
      setSteps(prev => {
        const activeIdx = prev.findIndex(s => s.status === "active");
        if (activeIdx === -1) return prev;
        const next = prev.map((s, i) => {
          if (i < activeIdx) return { ...s, status: "completed" as const };
          if (i === activeIdx) return { ...s, status: "completed" as const };
          if (i === activeIdx + 1) return { ...s, status: "active" as const };
          return s;
        });
        return next;
      });
    }, 450);

    try {
      const result = await action();
      clearInterval(advanceInterval);
      const elapsed = Date.now() - start;
      setDurationMs(elapsed);
      setSteps(prev => prev.map(s => ({ ...s, status: "completed" as const })));

      if (options?.goal) {
        fetch("/api/agent/reasoning-log", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ goal: options.goal, steps: baseSteps, durationMs: elapsed })
        }).catch(() => {});
      }

      return result;
    } catch (e) {
      clearInterval(advanceInterval);
      setRunning(false);
      throw e;
    } finally {
      setTimeout(() => setRunning(false), 500);
    }
  }, []);

  return { steps, durationMs, running, runWithTimeline, setSteps };
}
