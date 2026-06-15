"use client";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Search, Users, ArrowUpDown, ChevronRight, Download, Loader2 } from "lucide-react";
import clsx from "clsx";
import { CustomerTwinDrawer } from "@/components/CustomerTwinDrawer";

export default function CustomersPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState("ltvScore");
  const [dir, setDir] = useState<"desc" | "asc">("desc");
  const [twinId, setTwinId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const id = (e as CustomEvent).detail;
      if (id) setTwinId(id);
    };
    window.addEventListener("open-customer-twin", handler);
    return () => window.removeEventListener("open-customer-twin", handler);
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ["customers", search, page, sort, dir],
    queryFn: async () => {
      const r = await fetch(`/api/customers?q=${encodeURIComponent(search)}&page=${page}&limit=30&sort=${sort}&dir=${dir}`);
      if (!r.ok) throw new Error("API error");
      return r.json();
    }
  });

  // Shortcut key listener for "/"
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement !== searchInputRef.current) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  function toggleSort(field: string) {
    if (sort === field) {
      setDir(d => d === "desc" ? "asc" : "desc");
    } else {
      setSort(field);
      setDir("desc");
    }
  }

  async function exportCsv() {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("q", search.trim());
      const r = await fetch(`/api/customers/export?${params.toString()}`);
      if (!r.ok) throw new Error("Export failed");
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `pulse-crm-customers-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      window.alert("Failed to export customers. Please try again.");
    } finally {
      setExporting(false);
    }
  }

  function riskBadge(score: number) {
    if (score >= 0.7) {
      return (
        <span className="badge text-[10px] py-0.5 px-2 bg-red-500/10 border-red-500/20 text-red-400 font-semibold">
          High Risk
        </span>
      );
    }
    if (score >= 0.4) {
      return (
        <span className="badge text-[10px] py-0.5 px-2 bg-amber-500/10 border-amber-500/20 text-amber-400 font-semibold">
          Elevated
        </span>
      );
    }
    return (
      <span className="badge text-[10px] py-0.5 px-2 bg-green-500/10 border-green-500/20 text-green-400 font-semibold">
        Healthy
      </span>
    );
  }

  const totalPages = data?.total ? Math.ceil(data.total / 30) : 1;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page header */}
      <div className="flex flex-col gap-4 border-b border-white/[0.06] pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold tracking-tight text-white flex items-center gap-2">
            <Users size={20} className="text-[#8A8A8A]" />
            Customer Directory
          </h1>
          <p className="text-xs text-[#8A8A8A] mt-1 max-w-xl">
            Browse profiles, analyze CLV metrics, and export your full shopper database.
            {!isLoading && (
              <span className="text-white/70"> · {data?.total?.toLocaleString("en-IN") ?? 0} profiles</span>
            )}
            {search.trim() ? " · filtered" : ""}
          </p>
        </div>

        <button
          type="button"
          onClick={exportCsv}
          disabled={exporting || isLoading}
          className="shrink-0 inline-flex items-center justify-center gap-2 rounded-xl border border-purple-500/40 bg-purple-500/15 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_0_20px_rgba(168,85,247,0.15)] hover:bg-purple-500/25 hover:border-purple-400/50 transition-all disabled:opacity-50 disabled:pointer-events-none"
        >
          {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
          {exporting ? "Exporting…" : "Export CSV"}
        </button>
      </div>

      {/* Search + table toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            ref={searchInputRef}
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by name, email, city, or phone..."
            className="input pl-10 pr-10 w-full text-xs py-2 h-10"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-mono text-white/20 bg-white/5 px-1.5 py-0.5 rounded border border-white/10 pointer-events-none">
            /
          </span>
        </div>
        <p className="text-[10px] text-[#8A8A8A] uppercase tracking-wider font-semibold">
          {isLoading ? "Loading…" : `${data?.items?.length ?? 0} shown · export downloads all matching rows`}
        </p>
      </div>

      {/* Main Customers Grid */}
      <div className="glass overflow-hidden bg-[#0a0a0a]/60 border-white/[0.06] animate-slide-up">
        <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] bg-white/[0.02] px-4 py-3">
          <span className="text-xs font-semibold text-white/80">Shopper profiles</span>
          <button
            type="button"
            onClick={exportCsv}
            disabled={exporting || isLoading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/[0.06] px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            {exporting ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
            Export CSV
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/[0.06] bg-white/[0.01]" style={{ borderColor: "var(--border)" }}>
                {[
                  { key: "name", label: "Profile" },
                  { key: "city", label: "Location" },
                  { key: "preferredCategory", label: "Cat Preference" },
                  { key: "ltvScore", label: "LTV Score" },
                  { key: "churnScore", label: "Churn Risk" },
                  { key: "engagementScore", label: "Engagement" },
                  { key: "lastOrderDate", label: "Last Order" },
                ].map(col => (
                  <th 
                    key={col.key} 
                    className="p-3 text-[10px] font-semibold text-[#8A8A8A] uppercase tracking-wider cursor-pointer hover:text-white transition-colors select-none" 
                    onClick={() => toggleSort(col.key)}
                  >
                    <div className="flex items-center gap-1">
                      <span>{col.label}</span>
                      <ArrowUpDown size={10} className={clsx(sort === col.key ? "text-white opacity-100" : "text-[#8A8A8A] opacity-20")} />
                    </div>
                  </th>
                ))}
                <th className="p-3 w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-xs text-[#8A8A8A] font-medium animate-pulse">
                    Scanning customer profiles...
                  </td>
                </tr>
              ) : data?.items?.length > 0 ? (
                data.items.map((c: any) => (
                  <tr
                    key={c.id}
                    className="hover:bg-white/[0.02] transition-colors group cursor-pointer"
                    onClick={() => setTwinId(c.id)}
                  >
                    <td className="p-3">
                      <div className="block">
                        <div className="font-semibold text-xs text-white group-hover:text-purple-300 transition-colors">
                          {c.name}
                        </div>
                        <div className="text-[10px] text-[#8A8A8A] mt-0.5 truncate max-w-[200px]">
                          {c.email}
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-xs text-[#CFCFCF]">{c.city || "Unknown"}</td>
                    <td className="p-3">
                      <span className="chip text-[10px] py-0.5 border-white/[0.04] uppercase font-mono">
                        {c.preferredCategory}
                      </span>
                    </td>
                    <td className="p-3 font-semibold text-xs text-white font-mono">
                      ₹{Math.round(c.ltvScore).toLocaleString("en-IN")}
                    </td>
                    <td className="p-3">{riskBadge(c.churnScore)}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="score-bar w-16">
                          <div 
                            className={clsx(
                              "score-fill", 
                              c.engagementScore > 65 ? "score-fill-success" : c.engagementScore > 35 ? "score-fill-warning" : "score-fill-danger"
                            )}
                            style={{ width: `${Math.min(100, c.engagementScore)}%` }} 
                          />
                        </div>
                        <span className="text-[10px] text-[#8A8A8A] font-semibold font-mono">
                          {Math.round(c.engagementScore)}
                        </span>
                      </div>
                    </td>
                    <td className="p-3 text-xs text-[#CFCFCF] font-mono">
                      {c.lastOrderDate ? new Date(c.lastOrderDate).toLocaleDateString() : "Never"}
                    </td>
                    <td className="p-3" onClick={e => e.stopPropagation()}>
                      <Link href={`/customers/${c.id}`}>
                        <ChevronRight size={14} className="text-white/20 group-hover:text-white transition-colors" />
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-xs text-[#8A8A8A] font-medium">
                    No customers match your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination bar */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3.5 border-t border-white/[0.06] bg-white/[0.01]">
            <span className="text-[10px] font-semibold text-[#8A8A8A] uppercase tracking-wider">
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <button 
                onClick={() => setPage(p => Math.max(1, p - 1))} 
                disabled={page === 1} 
                className="btn-secondary text-[11px] py-1 px-3 disabled:opacity-30 disabled:pointer-events-none"
              >
                Previous
              </button>
              <button 
                onClick={() => setPage(p => Math.min(totalPages, p + 1))} 
                disabled={page >= totalPages} 
                className="btn-secondary text-[11px] py-1 px-3 disabled:opacity-30 disabled:pointer-events-none"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      <CustomerTwinDrawer customerId={twinId} onClose={() => setTwinId(null)} />
    </div>
  );
}
