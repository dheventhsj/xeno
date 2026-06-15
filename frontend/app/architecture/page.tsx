"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Network,
  Monitor,
  Server,
  Database,
  Cpu,
  Radio,
  CheckCircle2,
  Loader2,
  ArrowDown,
  GitBranch,
} from "lucide-react";
import clsx from "clsx";

type ArchNode = {
  tag?: string;
  icon: typeof Monitor;
  title: string;
  subtitle: string;
  className?: string;
};

function ArchCard({ tag, icon: Icon, title, subtitle, className }: ArchNode) {
  return (
    <div
      className={clsx(
        "relative rounded-2xl border border-white/10 bg-[#0c0c14]/90 px-5 py-4 shadow-[0_8px_32px_rgba(0,0,0,0.35)] min-w-[220px] max-w-[280px]",
        className
      )}
    >
      {tag && (
        <span className="absolute -top-2.5 left-4 rounded-md border border-purple-500/40 bg-[#1a1030] px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-purple-300">
          {tag}
        </span>
      )}
      <div className="flex items-start gap-3 mt-1">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.04]">
          <Icon size={18} className="text-purple-300" />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-white leading-snug">{title}</h3>
          <p className="text-[11px] text-[#8A8A8A] mt-1 leading-relaxed">{subtitle}</p>
        </div>
      </div>
    </div>
  );
}

const FLOW_STEPS = [
  "Marketer describes a goal in AI Copilot (natural language)",
  "AI Engine classifies intent → segments audience → picks channel → drafts copy",
  "Campaign launch creates Communication records and enqueues BullMQ jobs",
  "Channel Service simulates delivery (WhatsApp, SMS, Email, RCS)",
  "Signed webhooks stream SENT → DELIVERED → OPENED → CONVERTED back to CRM",
  "Analytics + Customer Intelligence update in real time",
];

const PACKAGES = [
  { name: "frontend/", desc: "Next.js 15 UI, API routes (BFF), Vercel deploy" },
  { name: "packages/ai-engine/", desc: "Orchestrator, Pulse Assistant, intent + tools" },
  { name: "packages/database/", desc: "Prisma schema, PostgreSQL, seed data" },
  { name: "packages/analytics/", desc: "Funnel, KPIs, campaign performance" },
  { name: "channel-service/", desc: "Express simulator on port 5001" },
];

export default function ArchitecturePage() {
  const { data: health, isLoading: healthLoading } = useQuery({
    queryKey: ["health"],
    queryFn: async () => {
      const r = await fetch("/api/health");
      if (!r.ok) throw new Error("Health check failed");
      return r.json() as Promise<{ ok: boolean; service: string }>;
    },
    refetchInterval: 30_000,
  });

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/[0.06] pb-6">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white flex items-center gap-2">
            <Network size={20} className="text-[#8A8A8A]" />
            System Architecture Diagram
          </h1>
          <p className="text-xs text-[#8A8A8A] mt-1 max-w-2xl">
            Detailed overview of Pulse CRM&apos;s event-driven campaign execution pipeline —
            from natural-language goals to simulated multi-channel delivery and live analytics.
          </p>
        </div>
        <div
          className={clsx(
            "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold",
            health?.ok
              ? "border-green-500/30 bg-green-500/10 text-green-400"
              : "border-amber-500/30 bg-amber-500/10 text-amber-400"
          )}
        >
          {healthLoading ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <CheckCircle2 size={14} />
          )}
          {health?.ok ? "Services Online" : "Checking…"}
        </div>
      </div>

      {/* Diagram */}
      <div className="glass p-6 md:p-10 bg-[#080810]/80 overflow-x-auto">
        <h2 className="text-sm font-bold text-white mb-1">System Architecture</h2>
        <p className="text-[11px] text-[#8A8A8A] mb-8">
          Pulse CRM (XenoPilot) — two-module monorepo: <code className="text-purple-300">frontend/</code> on Vercel +{" "}
          <code className="text-purple-300">backend/</code> packages &amp; channel service
        </p>

        <div className="relative mx-auto max-w-4xl min-w-[640px]">
          {/* Connector lines (SVG) */}
          <svg
            className="pointer-events-none absolute inset-0 w-full h-full text-white/15"
            aria-hidden
          >
            {/* Client → API */}
            <line x1="50%" y1="88" x2="50%" y2="128" stroke="currentColor" strokeWidth="1.5" />
            {/* API → DB */}
            <line x1="50%" y1="200" x2="18%" y2="200" stroke="currentColor" strokeWidth="1.5" />
            {/* API → AI */}
            <line x1="50%" y1="200" x2="82%" y2="200" stroke="currentColor" strokeWidth="1.5" strokeDasharray="6 4" />
            {/* API → Channel */}
            <line x1="50%" y1="260" x2="50%" y2="300" stroke="currentColor" strokeWidth="1.5" />
            {/* Channel webhook back (dashed arc hint) */}
            <path
              d="M 320 380 Q 520 420 520 200"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              strokeDasharray="4 4"
              opacity="0.35"
            />
          </svg>

          <div className="relative flex flex-col items-center gap-10">
            {/* Row 1 — Client */}
            <ArchCard
              tag="Client UI"
              icon={Monitor}
              title="Next.js 15 CRM Web"
              subtitle="React · Tailwind CSS · Copilot · Customers · Campaigns dashboard"
            />

            <ArrowDown size={16} className="text-white/20 -my-4" />

            {/* Row 2 — API Gateway */}
            <ArchCard
              tag="API Gateway"
              icon={Server}
              title="CRM Backend Service (BFF)"
              subtitle="Next.js API routes · Agent orchestrator · REST · Webhooks · BullMQ dispatch"
              className="z-10"
            />

            {/* Row 3 — DB + AI */}
            <div className="flex w-full justify-between items-center gap-4 px-2 -mt-2">
              <ArchCard
                icon={Database}
                title="Database Engine"
                subtitle="PostgreSQL (Neon) · Prisma ORM · Customers, campaigns, events"
              />
              <ArchCard
                icon={Cpu}
                title="Gemini / OpenAI"
                subtitle="Audience segmentation · campaign copy · Pulse Assistant · RAG"
              />
            </div>

            <ArrowDown size={16} className="text-white/20 -my-4" />

            {/* Row 4 — Channel */}
            <ArchCard
              tag="Simulation Service"
              icon={Radio}
              title="Channel Simulator"
              subtitle="Port 5001 · WhatsApp / SMS / Email / RCS · Async webhook callbacks"
            />
          </div>
        </div>

        <p className="text-center text-[10px] text-[#6b7280] mt-8">
          Dashed lines = async / external calls · Webhooks POST to{" "}
          <code className="text-purple-300/80">/api/webhooks/receipt</code>
        </p>
      </div>

      {/* Campaign flow */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="glass p-5">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
            <GitBranch size={16} className="text-purple-300" />
            Campaign execution flow
          </h3>
          <ol className="space-y-3">
            {FLOW_STEPS.map((step, i) => (
              <li key={step} className="flex gap-3 text-xs text-[#CFCFCF]">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-purple-500/15 text-[10px] font-bold text-purple-300">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </div>

        <div className="glass p-5">
          <h3 className="text-sm font-bold text-white mb-4">Repository modules</h3>
          <ul className="space-y-3">
            {PACKAGES.map(p => (
              <li
                key={p.name}
                className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3"
              >
                <code className="text-xs font-semibold text-purple-300">{p.name}</code>
                <p className="text-[11px] text-[#8A8A8A] mt-1">{p.desc}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
