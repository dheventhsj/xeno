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
    const log = (prisma as any).agentReasoningLog;
    if (!log?.create) return null;
    return await log.create({
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
    const log = (prisma as any).agentReasoningLog;
    if (!log?.findMany) return [];
    const rows = await log.findMany({ orderBy: { createdAt: "desc" }, take: limit });
    return rows.map((r: any) => ({
      id: r.id,
      goal: r.goal,
      ...JSON.parse(r.steps || "{}"),
      createdAt: r.createdAt
    }));
  } catch {
    return [];
  }
}
