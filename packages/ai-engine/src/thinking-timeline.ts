/**
 * AI Thinking Timeline — standardized agentic reasoning steps
 */

export type ThinkingStep = {
  id: string;
  label: string;
  tool?: string;
  status: "pending" | "active" | "completed";
  detail?: string;
};

export const CAMPAIGN_THINKING_STEPS = [
  { id: "goal", label: "Understanding Goal", tool: "Intent Classifier" },
  { id: "customers", label: "Analyzing Customers", tool: "Customer Analyzer" },
  { id: "churn", label: "Calculating Churn", tool: "Churn Detector" },
  { id: "audience", label: "Building Audience", tool: "Audience Builder" },
  { id: "channel", label: "Selecting Channel", tool: "Channel Strategist" },
  { id: "messages", label: "Generating Messages", tool: "Message Generator" },
  { id: "forecast", label: "Forecasting Revenue", tool: "Forecast Engine" },
  { id: "ready", label: "Ready to Launch", tool: "Campaign Planner" }
] as const;

export function createThinkingTimeline(): ThinkingStep[] {
  return CAMPAIGN_THINKING_STEPS.map(s => ({
    id: s.id,
    label: s.label,
    tool: s.tool,
    status: "pending" as const
  }));
}

export function advanceTimeline(
  steps: ThinkingStep[],
  stepId: string,
  detail?: string
): ThinkingStep[] {
  const idx = steps.findIndex(s => s.id === stepId);
  if (idx === -1) return steps;
  return steps.map((s, i) => ({
    ...s,
    status: i < idx ? "completed" : i === idx ? "active" : s.status,
    detail: i === idx ? detail : s.detail
  }));
}

export function completeTimeline(steps: ThinkingStep[]): ThinkingStep[] {
  return steps.map(s => ({ ...s, status: "completed" as const }));
}

export function timelineFromProgress(eventTitle: string): string | null {
  const map: Record<string, string> = {
    "Intent Classification": "goal",
    "Audience Analysis": "audience",
    "Channel Selection": "channel",
    "Message Generation": "messages",
    "Performance Forecast": "forecast",
    "Campaign Ready": "ready"
  };
  for (const [key, id] of Object.entries(map)) {
    if (eventTitle.includes(key)) return id;
  }
  if (/churn/i.test(eventTitle)) return "churn";
  if (/customer/i.test(eventTitle)) return "customers";
  return null;
}
