/**
 * Reasoning Engine — generates human-readable reasoning chains
 * Every AI decision is explainable with structured reasoning steps
 */

export type ReasoningStep = {
  step: number;
  phase: string;
  observation: string;
  conclusion: string;
  confidence: number;
  data?: Record<string, unknown>;
};

export type ReasoningChain = {
  steps: ReasoningStep[];
  summary: string;
  overallConfidence: number;
};

let stepCounter = 0;

export function startReasoning(): ReasoningChain {
  stepCounter = 0;
  return { steps: [], summary: "", overallConfidence: 0 };
}

export function addStep(
  chain: ReasoningChain,
  phase: string,
  observation: string,
  conclusion: string,
  confidence: number,
  data?: Record<string, unknown>
): ReasoningChain {
  stepCounter++;
  chain.steps.push({
    step: stepCounter,
    phase,
    observation,
    conclusion,
    confidence: Math.round(confidence * 100) / 100,
    data
  });
  return chain;
}

export function finalizeReasoning(chain: ReasoningChain): ReasoningChain {
  if (chain.steps.length === 0) {
    chain.summary = "No reasoning steps recorded.";
    chain.overallConfidence = 0;
    return chain;
  }

  const avgConfidence = chain.steps.reduce((s, st) => s + st.confidence, 0) / chain.steps.length;
  chain.overallConfidence = Math.round(avgConfidence * 100) / 100;

  const keyConclusions = chain.steps
    .filter(s => s.confidence > 0.5)
    .map(s => s.conclusion);

  chain.summary = keyConclusions.length > 0
    ? keyConclusions.join(" → ")
    : chain.steps.map(s => s.conclusion).join(" → ");

  return chain;
}

export function formatReasoningForDisplay(chain: ReasoningChain): string[] {
  return chain.steps.map(s => {
    const conf = Math.round(s.confidence * 100);
    return `**${s.phase}**: ${s.observation} → ${s.conclusion} (${conf}% confidence)`;
  });
}
