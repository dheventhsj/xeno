/**
 * Persist AI execution logs for thinking timeline
 */
import { prisma } from "@xenopilot/database";
import type { ThinkingStep } from "./thinking-timeline";

export async function persistReasoningLog(
  goal: string,
  steps: ThinkingStep[],
  durationMs: number,
  sessionId?: string
) {
  try {
    return await prisma.agentReasoningLog.create({
      data: {
        sessionId: sessionId ?? null,
        goal,
        steps: JSON.stringify({ steps, durationMs }),
        tools: JSON.stringify(steps.filter(s => s.status === "completed").map(s => s.label))
      }
    });
  } catch {
    return null;
  }
}

export async function getRecentReasoningLogs(limit = 10) {
  try {
    const rows = await prisma.agentReasoningLog.findMany({ orderBy: { createdAt: "desc" }, take: limit });
    return rows.map(r => ({
      id: r.id,
      goal: r.goal,
      ...JSON.parse(r.steps || "{}"),
      createdAt: r.createdAt
    }));
  } catch {
    return [];
  }
}
