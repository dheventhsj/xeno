"use client";

import { useState } from "react";
import { RefreshCw, Mail, MessageSquare, Smartphone, Radio } from "lucide-react";
import clsx from "clsx";

type Props = {
  goal: string;
  channel?: string;
  variants?: { a: string; b: string; c: string };
  customerName?: string;
  campaignId?: string;
};

const CHANNELS = [
  { id: "EMAIL", label: "Email", icon: Mail },
  { id: "SMS", label: "SMS", icon: MessageSquare },
  { id: "WHATSAPP", label: "WhatsApp", icon: Smartphone },
  { id: "RCS", label: "RCS", icon: Radio },
] as const;

export function MessagePreviewPanel({ goal, variants, customerName = "Sarah", campaignId }: Props) {
  const [activeChannel, setActiveChannel] = useState<string>("EMAIL");
  const [previews, setPreviews] = useState<Record<string, { subject?: string; body: string }> | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadPreviews(regenerate = false) {
    setLoading(true);
    try {
      const r = await fetch("/api/campaigns/preview-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal, variants, customerName, channel: activeChannel, regenerate, campaignId })
      });
      const data = await r.json();
      setPreviews(data.previews ?? {});
    } finally {
      setLoading(false);
    }
  }

  const preview = previews?.[activeChannel];

  return (
    <div className="space-y-4">
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
        <div className="flex gap-2">
          {!previews && (
            <button onClick={() => loadPreviews()} className="btn-secondary text-[10px] py-1 px-3">Generate Previews</button>
          )}
          <button onClick={() => loadPreviews(true)} disabled={loading} className="btn-secondary text-[10px] py-1 px-3 flex items-center gap-1">
            <RefreshCw size={10} className={loading ? "animate-spin" : ""} /> Regenerate
          </button>
        </div>
      </div>

      {preview ? (
        <div className={clsx(
          "rounded-xl border p-4 text-xs leading-relaxed",
          activeChannel === "EMAIL" && "bg-white/[0.03] border-white/10",
          activeChannel === "SMS" && "bg-blue-500/[0.05] border-blue-500/20 max-w-sm",
          activeChannel === "WHATSAPP" && "bg-emerald-500/[0.05] border-emerald-500/20 max-w-sm",
          activeChannel === "RCS" && "bg-purple-500/[0.05] border-purple-500/20"
        )}>
          {activeChannel === "EMAIL" && preview.subject && (
            <div className="mb-3 pb-2 border-b border-white/10">
              <div className="text-[9px] text-[#8A8A8A] uppercase font-semibold">Subject</div>
              <div className="text-white font-semibold mt-0.5">{preview.subject}</div>
            </div>
          )}
          <div className="text-[9px] text-[#8A8A8A] uppercase font-semibold mb-1">
            {activeChannel === "EMAIL" ? "Body" : "Message"}
          </div>
          <p className="text-[#CFCFCF] whitespace-pre-wrap">{preview.body}</p>
          <div className="text-[9px] text-[#8A8A8A] mt-2 font-mono">{preview.body.length} chars</div>
        </div>
      ) : (
        <div className="glass-inner p-6 text-center text-[11px] text-[#8A8A8A]">
          Click Generate Previews to see AI-personalized {activeChannel} copy
        </div>
      )}
    </div>
  );
}
