"use client";
import { useEffect, useState } from "react";
import { Card } from "../../components/ui/card";
import { api } from "../../lib/api";
import { FadeIn, Stagger, StaggerItem } from "../../components/Motion";

const PERSONA_GRADS = ["grad-violet", "grad-sky", "grad-pink", "grad-green"];

export default function PersonasPage() {
  const [personas, setPersonas] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .personas()
      .then(setPersonas)
      .catch((e) => setError(e.message));
  }, []);

  return (
    <div className="space-y-6">
      <FadeIn>
        <Card>
          <div className="text-2xl font-bold mb-1 gradient-text inline-block">Shopper personas</div>
          <div className="text-sm opacity-80">
            Derived live from your customer base by spend &amp; engagement — not hard-coded.
          </div>
        </Card>
      </FadeIn>

      {error && (
        <Card className="border-red-400/40">
          <div className="text-red-300 text-sm">{error}</div>
        </Card>
      )}

      <Stagger className="grid md:grid-cols-2 gap-6">
        {personas.map((p, i) => (
          <StaggerItem key={p.name}>
          <Card className={`h-full ${PERSONA_GRADS[i % PERSONA_GRADS.length]}`}>
            <div className="flex items-center justify-between">
              <div className="text-xl font-semibold">{p.name}</div>
              <span className="px-3 py-1 rounded-full bg-accent/20 border border-accent/40 text-sm">
                {p.size?.toLocaleString("en-IN")} shoppers
              </span>
            </div>
            <div className="opacity-80 mt-2">{p.summary}</div>
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                <div className="text-xs opacity-70">Avg spend</div>
                <div className="text-xl font-semibold">₹{p.averageSpend?.toLocaleString("en-IN")}</div>
              </div>
              <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                <div className="text-xs opacity-70">Preferred channels</div>
                <div className="text-sm mt-1">
                  {(p.preferredChannels ?? []).map((c: string) => c.toUpperCase()).join(", ") || "—"}
                </div>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {(p.engagementTraits ?? []).map((t: string) => (
                <span key={t} className="text-xs px-3 py-1 rounded-full bg-white/5 border border-white/10">
                  {t}
                </span>
              ))}
            </div>
          </Card>
          </StaggerItem>
        ))}
        {personas.length === 0 && !error && (
          <Card>
            <div className="opacity-70 text-sm">Generate demo data to see personas.</div>
          </Card>
        )}
      </Stagger>
    </div>
  );
}
