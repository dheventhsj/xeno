"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { api } from "../../lib/api";
import { getSocket } from "../../lib/socket";
import { FadeIn, Stagger, StaggerItem } from "../../components/Motion";
import { Sparkles, Send, RefreshCw, Zap } from "lucide-react";

const SUGGESTIONS = [
  "Re-engage inactive premium customers in Mumbai with an emotional win-back",
  "Send a 25% discount to budget shoppers who haven't bought in 60 days",
  "Reward loyal high-value customers with an exclusive offer",
  "Win back at-risk Gen Z shoppers before they churn"
];

const EVENTS = [
  { key: "sent", grad: "from-sky-500/25 to-cyan-500/10" },
  { key: "delivered", grad: "from-violet-500/25 to-purple-500/10" },
  { key: "opened", grad: "from-fuchsia-500/25 to-pink-500/10" },
  { key: "clicked", grad: "from-amber-500/25 to-orange-500/10" },
  { key: "purchased", grad: "from-emerald-500/25 to-lime-500/10" },
  { key: "failed", grad: "from-red-500/25 to-rose-500/10" }
];

const FORECAST_GRADS = ["grad-sky", "grad-violet", "grad-pink", "grad-green"];

export default function CopilotPage() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [launched, setLaunched] = useState(false);
  const [live, setLive] = useState<Record<string, number>>({});

  async function generate(p?: string) {
    const text = p ?? prompt;
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    setDraft(null);
    setCampaignId(null);
    setLaunched(false);
    setLive({});
    try {
      const d = await api.draft(text);
      setDraft(d);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function launch() {
    if (!draft) return;
    setLoading(true);
    setError(null);
    try {
      const created = await api.createCampaign(draft);
      setCampaignId(created._id);
      await api.launch(created._id);
      setLaunched(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!campaignId) return;
    const s = getSocket();
    s.emit("join:campaign", campaignId);
    const onEvt = (evt: any) => {
      if (evt.campaignId !== campaignId) return;
      setLive((prev) => ({ ...prev, [evt.eventType]: (prev[evt.eventType] ?? 0) + 1 }));
    };
    s.on("campaign:event", onEvt);
    return () => {
      s.off("campaign:event", onEvt);
    };
  }, [campaignId]);

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <FadeIn>
          <Card className="grad-violet overflow-hidden relative">
            <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-violet-500/20 blur-3xl" />
            <div className="relative">
              <div className="flex items-center gap-2 text-2xl font-bold mb-1">
                <Sparkles className="text-violet-300" size={24} /> Campaign Copilot
              </div>
              <div className="opacity-80 text-sm mb-4">
                Describe your goal in plain English. The strategist will carve the audience, pick the channel, write the copy,
                and forecast results — then launch it for you.
              </div>
              <div className="flex gap-3 flex-wrap">
                <input
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && generate()}
                  placeholder="e.g. Re-engage inactive premium customers with a heartfelt win-back"
                  className="flex-1 min-w-[200px] bg-black/20 border border-white/20 rounded-xl px-4 py-3 outline-none focus:border-violet-400/60 focus:ring-2 focus:ring-violet-500/20 transition"
                />
                <Button onClick={() => generate()} disabled={loading}>
                  <span className="inline-flex items-center gap-2">
                    {loading ? <RefreshCw size={16} className="animate-spin" /> : <Zap size={16} />} Generate
                  </span>
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                {SUGGESTIONS.map((s, i) => (
                  <motion.button
                    key={s}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => {
                      setPrompt(s);
                      generate(s);
                    }}
                    className="text-xs px-3 py-1.5 rounded-full chip hover:border-violet-400/50 hover:bg-violet-500/10 transition"
                  >
                    {s}
                  </motion.button>
                ))}
              </div>
            </div>
          </Card>
        </FadeIn>

        {error && (
          <Card className="border-red-400/40">
            <div className="text-red-300 text-sm">{error}</div>
          </Card>
        )}

        <AnimatePresence>
          {draft && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
              <Card className="grad-sky">
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                  <div className="text-lg font-bold">{draft.name}</div>
                  <span className="px-3 py-1 rounded-full bg-gradient-to-r from-violet-600/50 to-sky-500/50 border border-white/20 text-sm font-medium">
                    {draft.channel?.toUpperCase()}
                  </span>
                </div>
                <Stagger className="grid sm:grid-cols-2 gap-4">
                  <StaggerItem>
                    <div className="p-4 rounded-xl bg-black/20 border border-white/10">
                      <div className="text-sm opacity-70 mb-1">Audience</div>
                      <div className="text-3xl font-bold">{draft.estimatedAudienceSize?.toLocaleString("en-IN")}</div>
                      <div className="text-xs opacity-70 mt-1">shoppers match this segment</div>
                    </div>
                  </StaggerItem>
                  <StaggerItem>
                    <div className="p-4 rounded-xl bg-black/20 border border-white/10">
                      <div className="text-sm opacity-70 mb-1">Why this channel</div>
                      <div className="text-sm">{draft.channelRationale}</div>
                    </div>
                  </StaggerItem>
                </Stagger>

                <div className="mt-4 p-4 rounded-xl bg-gradient-to-br from-violet-600/25 via-fuchsia-500/15 to-sky-500/20 border border-white/15">
                  <div className="text-sm opacity-70 mb-2">Generated message · {draft.content?.variant}</div>
                  {draft.content?.subject && <div className="font-semibold mb-1">Subject: {draft.content.subject}</div>}
                  <div className="opacity-95 leading-relaxed">{draft.content?.body}</div>
                </div>

                <div className="mt-4">
                  <div className="text-sm opacity-70 mb-2">Why these shoppers</div>
                  <div className="flex flex-wrap gap-2">
                    {draft.explainability?.map((r: string) => (
                      <span key={r} className="text-xs px-3 py-1 rounded-full chip">
                        {r}
                      </span>
                    ))}
                  </div>
                </div>
              </Card>

              <Card className="grad-pink">
                <div className="text-sm opacity-70 mb-3">AI forecast</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: "Open rate", value: pct(draft.predictions?.openRate) },
                    { label: "Click rate", value: pct(draft.predictions?.clickRate) },
                    { label: "Conversion", value: pct(draft.predictions?.conversionProbability) },
                    { label: "Est. ROI", value: `${draft.predictions?.expectedRoi}x` }
                  ].map((f, i) => (
                    <div key={f.label} className={`p-3 rounded-xl ${FORECAST_GRADS[i]} border border-white/10`}>
                      <div className="text-xs opacity-70">{f.label}</div>
                      <div className="text-2xl font-bold">{f.value}</div>
                    </div>
                  ))}
                </div>
                <div className="text-xs opacity-60 mt-2">
                  Confidence {pct(draft.predictions?.confidence)} · based on this segment's engagement & spend profile
                </div>

                <div className="mt-5 flex gap-3 items-center">
                  {!launched ? (
                    <Button onClick={launch} disabled={loading || draft.estimatedAudienceSize === 0}>
                      <span className="inline-flex items-center gap-2">
                        <Send size={16} /> Launch to {draft.estimatedAudienceSize?.toLocaleString("en-IN")} shoppers
                      </span>
                    </Button>
                  ) : (
                    <motion.span
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="text-emerald-300 text-sm flex items-center gap-2"
                    >
                      <span className="live-dot" /> Launched! Watch results stream in below ↓
                    </motion.span>
                  )}
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {launched && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="grad-green">
                <div className="text-sm opacity-80 mb-3 flex items-center gap-2">
                  <span className="live-dot" /> Live delivery
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                  {EVENTS.map(({ key, grad }) => (
                    <div key={key} className={`p-3 rounded-xl bg-gradient-to-br ${grad} border border-white/10 text-center`}>
                      <div className="text-xs opacity-70 capitalize">{key}</div>
                      <motion.div key={live[key]} initial={{ scale: 1.4, color: "#34d399" }} animate={{ scale: 1, color: "#fff" }} className="text-2xl font-bold">
                        {live[key] ?? 0}
                      </motion.div>
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <FadeIn delay={0.1}>
        <Card className="grad-violet sticky top-6">
          <div className="text-sm opacity-70 mb-2">Audience preview</div>
          {!draft ? (
            <div className="opacity-60 text-sm py-6 text-center">Generate a campaign to preview matched shoppers.</div>
          ) : draft.sample?.length === 0 ? (
            <div className="opacity-60 text-sm py-6 text-center">No shoppers match. Try generating demo data or a broader prompt.</div>
          ) : (
            <div className="space-y-2 max-h-[520px] overflow-auto pr-1">
              {draft.sample?.map((c: any, i: number) => (
                <motion.div
                  key={c._id}
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="p-3 rounded-xl bg-black/20 border border-white/10 hover:border-violet-400/40 transition"
                >
                  <div className="font-medium text-sm">{c.name}</div>
                  <div className="text-xs opacity-70">
                    {c.city} · ₹{c.totalSpend?.toLocaleString("en-IN")} · eng {c.engagementScore}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </Card>
      </FadeIn>
    </div>
  );
}

function pct(v?: number) {
  if (v === undefined || v === null) return "—";
  return `${Math.round(v * 100)}%`;
}
