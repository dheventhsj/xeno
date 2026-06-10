"use client";
import { useEffect, useState } from "react";
import { Card } from "../../components/ui/card";
import { LiveEvents } from "../../components/LiveEvents";
import { api } from "../../lib/api";
import { StatusPill } from "../../components/StatusPill";

export default function MonitorPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .campaigns()
      .then((c) => {
        setCampaigns(c);
        if (c.length) setSelected(c[0]._id);
      })
      .catch((e) => setError(e.message));
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <div className="text-xl font-semibold mb-1 flex items-center gap-2">
          <span className="live-dot" /> Live campaign monitor
        </div>
        <div className="text-sm opacity-80 mb-4">
          Events stream in over WebSocket as the channel service reports delivery, opens, clicks and conversions.
        </div>
        {error && <div className="text-red-300 text-sm">{error}</div>}
        {campaigns.length === 0 ? (
          <div className="opacity-70 text-sm">No campaigns yet — launch one from the Copilot.</div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {campaigns.map((c) => (
              <button
                key={c._id}
                onClick={() => setSelected(c._id)}
                className={`px-3 py-2 rounded-lg border text-sm transition ${
                  selected === c._id ? "bg-accent/30 border-accent/60" : "bg-white/5 border-white/10 hover:border-white/30"
                }`}
              >
                <span className="inline-flex items-center gap-2">
                  {c.name} <StatusPill status={c.status} />
                </span>
              </button>
            ))}
          </div>
        )}
      </Card>

      {selected && <LiveEvents key={selected} campaignId={selected} />}
    </div>
  );
}
