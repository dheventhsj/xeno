import type { SegmentFilter } from "./audience";

const SEGMENT_FILTER_SCHEMA = `{
  "filter": {
    "minSpend": number | null,
    "maxSpend": number | null,
    "minDaysSinceOrder": number | null,
    "maxDaysSinceOrder": number | null,
    "category": string | null,
    "city": string | null,
    "minChurnScore": number | null,
    "maxChurnScore": number | null,
    "minEngagement": number | null,
    "minLtv": number | null,
    "maxLtv": number | null,
    "channel": "WHATSAPP" | "SMS" | "EMAIL" | "RCS" | null
  },
  "reasoning": string[],
  "name": string
}

Rules:
- Churn scores are 0-1 decimals (60% = 0.6). "over 50%" => minChurnScore: 0.5
- Spend in INR. "spent over 5000" => minSpend: 5000
- Days for dormancy. "45 days" => minDaysSinceOrder: 45
- Categories: Skincare, Beauty, Fashion, Coffee, Electronics, Fitness
- Only include fields explicitly implied by the prompt`;

function stripNulls(filter: Record<string, unknown>): SegmentFilter {
  const out: SegmentFilter = {};
  for (const [k, v] of Object.entries(filter)) {
    if (v !== null && v !== undefined) (out as Record<string, unknown>)[k] = v;
  }
  return out;
}

function parseJsonResponse(text: string) {
  const cleaned = text.replace(/```json\n?|\n?```/g, "").trim();
  return JSON.parse(cleaned) as {
    filter: Record<string, unknown>;
    reasoning: string[];
    name: string;
  };
}

/** OpenAI structured audience parse (when OPENAI_API_KEY is set) */
async function parseWithOpenAI(prompt: string) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;

  const { default: OpenAI } = await import("openai");
  const client = new OpenAI({ apiKey: key });

  const completion = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
    temperature: 0.1,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You convert marketer natural-language audience prompts into JSON segment filters. Return ONLY valid JSON matching: ${SEGMENT_FILTER_SCHEMA}`
      },
      { role: "user", content: prompt }
    ]
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) return null;
  const parsed = parseJsonResponse(raw);
  return {
    filter: stripNulls(parsed.filter),
    reasoning: parsed.reasoning ?? [],
    name: parsed.name ?? "Audience"
  };
}

/** Gemini structured audience parse (when GEMINI_API_KEY is set) */
async function parseWithGemini(prompt: string) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;

  const model = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: `Convert this audience prompt into JSON segment filters. Use exact numbers from the prompt (e.g. 50% churn => minChurnScore 0.5).\n\nSchema: ${SEGMENT_FILTER_SCHEMA}\n\nPrompt: "${prompt}"\n\nReturn JSON only.`
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: "application/json"
      }
    })
  });

  if (!res.ok) {
    console.warn("Gemini audience parse failed:", await res.text());
    return null;
  }

  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!raw) return null;

  const parsed = parseJsonResponse(raw);
  return {
    filter: stripNulls(parsed.filter),
    reasoning: parsed.reasoning ?? [],
    name: parsed.name ?? "Audience"
  };
}

/**
 * Try LLM parsing (Gemini first, then OpenAI), then return null for heuristic fallback.
 * Set USE_LLM_AUDIENCE=0 to force offline heuristic only.
 */
export async function parseAudiencePromptLLM(prompt: string) {
  if (process.env.USE_LLM_AUDIENCE === "0") return null;

  try {
    if (process.env.GEMINI_API_KEY) {
      const gemini = await parseWithGemini(prompt);
      if (gemini) return { ...gemini, source: "gemini" as const };
    }
    if (process.env.OPENAI_API_KEY) {
      const openai = await parseWithOpenAI(prompt);
      if (openai) return { ...openai, source: "openai" as const };
    }
  } catch (err) {
    console.warn("LLM audience parse error, using heuristic:", err);
  }
  return null;
}
