"use client";

import { useState, useEffect } from "react";
import { RefreshCw, Mail, MessageSquare, Smartphone, Radio } from "lucide-react";
import clsx from "clsx";

type Props = {
  goal: string;
  channel?: string;
  variants?: { a: string; b: string; c: string };
  customerName?: string;
  category?: string;
  campaignId?: string;
};

const CHANNELS = [
  { id: "EMAIL", label: "Email", icon: Mail },
  { id: "SMS", label: "SMS", icon: MessageSquare },
  { id: "WHATSAPP", label: "WhatsApp", icon: Smartphone },
  { id: "RCS", label: "RCS", icon: Radio },
] as const;

const TONES = [
  { id: "friendly", label: "Friendly" },
  { id: "premium", label: "Premium" },
  { id: "urgent", label: "Urgent" },
  { id: "luxury", label: "Luxury" },
] as const;

export function MessagePreviewPanel({
  goal,
  variants,
  customerName = "Sarah",
  category = "skincare",
  campaignId,
}: Props) {
  const [activeChannel, setActiveChannel] = useState<string>("EMAIL");
  const [tone, setTone] = useState<string>("friendly");
  const [previews, setPreviews] = useState<Record<string, { subject?: string; body: string; tone?: string }> | null>(null);
  const [loading, setLoading] = useState(false);

  const personalizationVars = [
    { key: "{{name}}", value: customerName },
    { key: "{{category}}", value: category },
    { key: "{{offer}}", value: "15% off" },
  ];

  async function loadPreviews(regenerate = false, allChannels = false) {
    setLoading(true);
    try {
      const r = await fetch("/api/campaigns/preview-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goal,
          variants,
          customerName,
          category,
          tone,
          channel: allChannels ? undefined : activeChannel,
          regenerate,
          allChannels: regenerate ? true : !previews,
          campaignId,
        }),
      });
      const data = await r.json();
      setPreviews(prev => ({ ...prev, ...(data.previews ?? {}) }));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPreviews(false, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goal, tone]);

  const preview = previews?.[activeChannel];

  return (
    <div className="space-y-4">
      {/* Tone selector */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[9px] text-[#8A8A8A] uppercase font-semibold">Change Tone:</span>
        {TONES.map(t => (
          <button
            key={t.id}
            onClick={() => setTone(t.id)}
            className={clsx(
              "px-2.5 py-1 rounded text-[10px] font-semibold border transition-all",
              tone === t.id ? "bg-purple-500/20 border-purple-500/40 text-purple-200" : "border-white/10 text-[#8A8A8A] hover:border-white/25"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Channel tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1">
          {CHANNELS.map(ch => {
            const Icon = ch.icon;
            return (
              <button
                key={ch.id}
                onClick={() => setActiveChannel(ch.id)}
                className={clsx(
                  "flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-semibold border transition-all",
                  activeChannel === ch.id ? "bg-white text-black border-white" : "border-white/10 text-[#8A8A8A] hover:border-white/25"
                )}
              >
                <Icon size={11} /> {ch.label}
              </button>
            );
          })}
        </div>
        <button
          onClick={() => loadPreviews(true, true)}
          disabled={loading}
          className="btn-secondary text-[10px] py-1 px-3 flex items-center gap-1"
        >
          <RefreshCw size={10} className={loading ? "animate-spin" : ""} /> Regenerate All
        </button>
      </div>

      {/* Personalization variables */}
      <div className="flex flex-wrap gap-1.5">
        <span className="text-[9px] text-[#8A8A8A] uppercase font-semibold w-full mb-0.5">Personalization Variables:</span>
        {personalizationVars.map(v => (
          <span key={v.key} className="chip text-[9px] py-0.5 font-mono border-purple-500/20 text-purple-300">
            {v.key} → {v.value}
          </span>
        ))}
      </div>

      {preview ? (
        <div
          className={clsx(
            "rounded-xl border p-4 text-xs leading-relaxed",
            activeChannel === "EMAIL" && "bg-white/[0.03] border-white/10",
            activeChannel === "SMS" && "bg-blue-500/[0.05] border-blue-500/20 max-w-sm",
            activeChannel === "WHATSAPP" && "bg-emerald-500/[0.05] border-emerald-500/20 max-w-sm",
            activeChannel === "RCS" && "bg-purple-500/[0.05] border-purple-500/20"
          )}
        >
          {activeChannel === "EMAIL" && preview.subject && (
            <div className="mb-3 pb-2 border-b border-white/10">
              <div className="text-[9px] text-[#8A8A8A] uppercase font-semibold">Subject</div>
              <div className="text-white font-semibold mt-0.5">{preview.subject}</div>
            </div>
          )}
          <div className="text-[9px] text-[#8A8A8A] uppercase font-semibold mb-1">
            {activeChannel === "EMAIL" ? "Body" : activeChannel === "RCS" ? "Rich Card" : "Message"}
          </div>
          <p className="text-[#CFCFCF] whitespace-pre-wrap">{preview.body}</p>
          <div className="flex justify-between mt-2 text-[9px] text-[#8A8A8A] font-mono">
            <span>{preview.body.length} chars</span>
            {preview.tone && <span className="capitalize">Tone: {preview.tone}</span>}
          </div>
        </div>
      ) : (
        <div className="glass-inner p-6 text-center text-[11px] text-[#8A8A8A]">
          {loading ? "Generating AI-personalized content..." : `Click Regenerate to preview ${activeChannel} copy`}
        </div>
      )}
    </div>
  );
}
