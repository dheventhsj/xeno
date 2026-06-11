"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Target, Sparkles, Users, TrendingUp, Loader2, AlertCircle } from "lucide-react";
import clsx from "clsx";

export default function AudiencesPage() {
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState<any>(null);
  const qc = useQueryClient();

  const { data: segments, isLoading } = useQuery({
    queryKey: ["segments"],
    queryFn: async () => {
      const r = await fetch("/api/audiences/generate");
      if (!r.ok) throw new Error("API error");
      return r.json();
    }
  });

  const generate = useMutation({
    mutationFn: async (p: string) => {
      const r = await fetch("/api/audiences/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: p })
      });
      if (!r.ok) throw new Error("API error");
      return r.json();
    },
    onSuccess: (data) => {
      setResult(data);
      qc.invalidateQueries({ queryKey: ["segments"] });
    }
  });

  // Bulletproof demographics parsing
  const getDemographics = (res: any) => {
    if (!res?.demographics) return null;
    if (typeof res.demographics === "string") {
      try {
        return JSON.parse(res.demographics);
      } catch (e) {
        return null;
      }
    }
    return res.demographics;
  };

  const currentDemographics = getDemographics(result);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.04] pb-6">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white flex items-center gap-2">
            <Target size={20} className="text-[#8A8A8A]" />
            Audience Studio
          </h1>
          <p className="text-xs text-[#8A8A8A] mt-1">
            Build and analyze shopper cohorts using natural language prompts.
          </p>
        </div>
      </div>

      {/* NL Audience Builder */}
      <div className="glass p-6 bg-gradient-to-r from-white/[0.01] to-transparent border-white/[0.07]">
        <h2 className="text-xs font-semibold text-white/70 tracking-widest uppercase mb-4 flex items-center gap-1.5">
          <Sparkles size={13} className="text-purple-400" />
          Construct Segment definition
        </h2>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Sparkles size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              onKeyDown={e => e.key === "Enter" && prompt.trim() && generate.mutate(prompt)}
              placeholder="e.g. Dormant cosmetics customers in Mumbai with spend > ₹5000..."
              className="input pl-10 text-xs py-2 h-10"
              disabled={generate.isPending}
            />
          </div>
          <button
            onClick={() => prompt.trim() && generate.mutate(prompt)}
            disabled={generate.isPending || !prompt.trim()}
            className="btn-primary flex items-center gap-2 text-xs h-10 px-5"
          >
            {generate.isPending ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                <span>Simulating...</span>
              </>
            ) : (
              <>
                <Target size={13} className="fill-black" />
                <span>Generate Segment</span>
              </>
            )}
          </button>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-[10px] text-[#8A8A8A] mr-1">Suggested prompts:</span>
          {[
            "High-value dormant beauty segment",
            "Shoppers with churn score over 60%",
            "Mumbai shoppers with high spend"
          ].map(s => (
            <button 
              key={s} 
              type="button"
              onClick={() => { setPrompt(s); generate.mutate(s); }}
              disabled={generate.isPending}
              className="chip text-[10px] py-1 border-white/[0.04] hover:border-white/20 transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Generated Result Card */}
      {result && (
        <div className="glass p-6 border-white/[0.08] bg-[#111]/80 space-y-6 animate-scale-in">
          <div className="flex items-center justify-between border-b border-white/[0.04] pb-4">
            <div>
              <h2 className="font-bold text-base text-white tracking-tight">{result.name}</h2>
              <p className="text-[11px] text-[#8A8A8A] mt-0.5 font-mono">{result.description}</p>
            </div>
            <span className="badge badge-purple text-[10px] py-0.5">Studio generated</span>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
            <div className="glass-inner p-3.5 text-center bg-white/[0.01]">
              <div className="text-[9px] text-[#8A8A8A] uppercase font-semibold">Matched Audience</div>
              <div className="text-lg font-bold text-white mt-1 font-mono">
                {(result.customerCount ?? 0).toLocaleString("en-IN")}
              </div>
            </div>
            <div className="glass-inner p-3.5 text-center bg-white/[0.01]">
              <div className="text-[9px] text-[#8A8A8A] uppercase font-semibold">Revenue Potential</div>
              <div className="text-lg font-bold text-[#22C55E] mt-1 font-mono">
                ₹{Math.round(result.revenuePotential ?? 0).toLocaleString("en-IN")}
              </div>
            </div>
            <div className="glass-inner p-3.5 text-center bg-white/[0.01]">
              <div className="text-[9px] text-[#8A8A8A] uppercase font-semibold">Risk profile</div>
              <div className="text-lg font-bold text-white mt-1 font-mono">
                {Math.round((result.churnRisk ?? 0) * 100)}% churn
              </div>
            </div>
            <div className="glass-inner p-3.5 text-center bg-white/[0.01]">
              <div className="text-[9px] text-[#8A8A8A] uppercase font-semibold">LTV Baseline</div>
              <div className="text-lg font-bold text-white mt-1 font-mono">
                ₹{Math.round(currentDemographics?.avgSpend ?? 2500).toLocaleString("en-IN")}
              </div>
            </div>
          </div>

          {/* Demographics Visualization */}
          {currentDemographics && (
            <div className="grid gap-4 sm:grid-cols-3 pt-2">
              {/* Cities */}
              {currentDemographics.cities?.length > 0 && (
                <div className="glass-inner p-4 bg-white/[0.01]">
                  <div className="text-[9px] text-[#8A8A8A] uppercase tracking-wider font-semibold mb-3">City Distribution</div>
                  <div className="space-y-3">
                    {currentDemographics.cities.slice(0, 4).map((c: any) => {
                      const total = Math.max(...currentDemographics.cities.map((ct: any) => ct.count), 1);
                      const pct = Math.round((c.count / total) * 100);
                      return (
                        <div key={c.name} className="space-y-1">
                          <div className="flex justify-between text-xs font-mono">
                            <span className="text-white/60 truncate">{c.name}</span>
                            <span className="font-semibold text-white">{c.count}</span>
                          </div>
                          <div className="score-bar">
                            <div className="score-fill score-fill-accent" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Categories */}
              {currentDemographics.categories?.length > 0 && (
                <div className="glass-inner p-4 bg-white/[0.01]">
                  <div className="text-[9px] text-[#8A8A8A] uppercase tracking-wider font-semibold mb-3">Category Preference</div>
                  <div className="space-y-3">
                    {currentDemographics.categories.slice(0, 4).map((c: any) => {
                      const total = Math.max(...currentDemographics.categories.map((ct: any) => ct.count), 1);
                      const pct = Math.round((c.count / total) * 100);
                      return (
                        <div key={c.name} className="space-y-1">
                          <div className="flex justify-between text-xs font-mono">
                            <span className="text-white/60 truncate uppercase">{c.name}</span>
                            <span className="font-semibold text-white">{c.count}</span>
                          </div>
                          <div className="score-bar">
                            <div className="score-fill score-fill-accent" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Channels */}
              {currentDemographics.channels?.length > 0 && (
                <div className="glass-inner p-4 bg-white/[0.01]">
                  <div className="text-[9px] text-[#8A8A8A] uppercase tracking-wider font-semibold mb-3">Target channels</div>
                  <div className="space-y-3">
                    {currentDemographics.channels.slice(0, 4).map((c: any) => {
                      const total = Math.max(...currentDemographics.channels.map((ct: any) => ct.count), 1);
                      const pct = Math.round((c.count / total) * 100);
                      return (
                        <div key={c.name} className="space-y-1">
                          <div className="flex justify-between text-xs font-mono">
                            <span className="text-white/60 truncate uppercase">{c.name}</span>
                            <span className="font-semibold text-white">{c.count}</span>
                          </div>
                          <div className="score-bar">
                            <div className="score-fill score-fill-accent" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Reasoning tags */}
          <div className="flex flex-wrap gap-1.5 pt-2 border-t border-white/[0.04]">
            {(() => {
              let reasoningArray: string[] = [];
              if (result.aiReasoning) {
                try {
                  if (typeof result.aiReasoning === "string") {
                    reasoningArray = JSON.parse(result.aiReasoning);
                  } else if (Array.isArray(result.aiReasoning)) {
                    reasoningArray = result.aiReasoning;
                  }
                } catch (e) {
                  reasoningArray = [result.aiReasoning];
                }
              }
              return Array.isArray(reasoningArray) ? reasoningArray.map((r: string) => (
                <span key={r} className="badge badge-purple text-[10px] py-0.5">
                  {r}
                </span>
              )) : null;
            })()}
          </div>
        </div>
      )}

      {/* Saved Cohorts */}
      <div className="space-y-4">
        <h2 className="text-xs font-semibold text-white/70 uppercase tracking-widest flex items-center gap-2">
          <Users size={12} /> Persisted Customer Cohorts
        </h2>
        
        <div className="space-y-3">
          {isLoading ? (
            <div className="glass p-6 text-xs text-[#8A8A8A] text-center animate-pulse">
              Scanning segments library...
            </div>
          ) : segments?.length === 0 ? (
            <div className="glass p-8 text-center text-xs text-[#8A8A8A] border-dashed border-white/[0.08] max-w-md mx-auto">
              <AlertCircle size={24} className="text-white/10 mx-auto mb-2" />
              <span>No audience cohorts saved yet. Describe one above to generate.</span>
            </div>
          ) : (
            segments?.map?.((seg: any) => (
              <div 
                key={seg.id} 
                className="glass glass-hover p-5 flex flex-wrap items-center justify-between gap-4 bg-gradient-to-b from-white/[0.01] to-transparent"
              >
                <div className="space-y-1">
                  <div className="font-bold text-white text-sm tracking-tight">{seg.name}</div>
                  <div className="text-[11px] text-[#8A8A8A] font-mono">
                    {seg.customerCount.toLocaleString("en-IN")} customers · Potential: ₹{Math.round(seg.revenuePotential).toLocaleString("en-IN")} · Churn baseline: {Math.round(seg.churnRisk * 100)}%
                  </div>
                </div>
                
                <div className="flex items-center gap-2 bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-1">
                  <span className="text-[10px] text-[#8A8A8A] font-semibold uppercase tracking-wider">
                    {seg._count?.campaigns ?? 0} Campaigns launched
                  </span>
                  <Users size={12} className="text-white/30" />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
