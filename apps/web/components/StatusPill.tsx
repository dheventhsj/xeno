export function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    draft: "bg-white/10 text-white/80 border border-white/10",
    running: "bg-sky-500/25 text-sky-100 border border-sky-400/50 shadow-[0_0_12px_rgba(56,189,248,0.35)]",
    completed: "bg-emerald-500/25 text-emerald-100 border border-emerald-400/50"
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${map[status] ?? "bg-white/10"}`}>
      {status === "running" && <span className="live-dot scale-75" />}
      {status}
    </span>
  );
}
