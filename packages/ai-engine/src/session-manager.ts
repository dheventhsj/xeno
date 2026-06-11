/**
 * Session Manager — conversation state persistence across turns
 * Enables follow-up commands without repeating context
 */
import { prisma } from "@xenopilot/database";
import type { CampaignDraft } from "@xenopilot/shared";

export type SessionContext = {
  lastDraft?: CampaignDraft;
  lastSegmentName?: string;
  lastChannel?: string;
  lastGoal?: string;
  turnCount: number;
};

export type SessionMessage = {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  draft?: CampaignDraft | null;
};

export async function getOrCreateSession(sessionId?: string): Promise<{
  id: string;
  messages: SessionMessage[];
  context: SessionContext;
}> {
  if (sessionId) {
    const session = await prisma.agentSession.findUnique({ where: { id: sessionId } });
    if (session) {
      return {
        id: session.id,
        messages: session.messages ? JSON.parse(session.messages) : [],
        context: session.context ? JSON.parse(session.context) : { turnCount: 0 }
      };
    }
  }

  const session = await prisma.agentSession.create({
    data: {
      messages: "[]",
      context: JSON.stringify({ turnCount: 0 })
    }
  });
  return { id: session.id, messages: [], context: { turnCount: 0 } };
}

export async function saveSession(
  sessionId: string,
  messages: SessionMessage[],
  context: SessionContext
): Promise<void> {
  // Keep last 20 messages to prevent unbounded growth
  const trimmed = messages.slice(-20);
  await prisma.agentSession.update({
    where: { id: sessionId },
    data: {
      messages: JSON.stringify(trimmed),
      context: JSON.stringify(context)
    }
  });
}

export function updateContext(
  context: SessionContext,
  draft?: CampaignDraft | null,
  goal?: string
): SessionContext {
  return {
    ...context,
    turnCount: context.turnCount + 1,
    lastDraft: draft ?? context.lastDraft,
    lastGoal: goal ?? context.lastGoal,
    lastSegmentName: draft?.segment?.name ?? context.lastSegmentName,
    lastChannel: draft?.channel?.recommended ?? context.lastChannel
  };
}
