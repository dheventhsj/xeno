"use client";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Search, Users, ArrowUpDown, ChevronRight, ChevronDown, Download, Loader2 } from "lucide-react";
import clsx from "clsx";
import { CustomerTwinDrawer } from "@/components/CustomerTwinDrawer";
import {
  STATUS_OPTIONS,
  LTV_RANGE_OPTIONS,
  SORT_OPTIONS,
  filtersToSearchParams,
  type CustomerStatusFilter,
  type LtvRangeFilter,
} from "@/lib/customer-filters";

function FilterSelect({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  ariaLabel: string;
}) {
  const selected = options.find(o => o.value === value);
  return (
    <div className="relative shrink-0">
      <select
        value={value}
        aria-label={ariaLabel}
        onChange={e => onChange(e.target.value)}
        className="appearance-none h-10 min-w-[130px] rounded-lg border border-white/10 bg-[#12121a] pl-3 pr-9 text-xs font-medium text-[#b8c0d4] hover:border-white/20 focus:border-purple-500/50 focus:outline-none focus:ring-1 focus:ring-purple-500/30 cursor-pointer transition-colors"
      >
        {options.map(o => (
          <option key={o.value} value={o.value} className="bg-[#12121a] text-white">
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-white/35" />
      <span className="sr-only">{selected?.label}</span>
    </div>
  );
}

export default function CustomersPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState("ltvScore:desc");
  const [statusFilter, setStatusFilter] = useState<CustomerStatusFilter>("all");
  const [cityFilter, setCityFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [ltvRangeFilter, setLtvRangeFilter] = useState<LtvRangeFilter>("all");
  const [twinId, setTwinId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const sortParts = sortKey.split(":");
  const sort = sortParts[0] ?? "ltvScore";
  const dir = (sortParts[1] === "asc" ? "asc" : "desc") as "asc" | "desc";

  const { data: meta } = useQuery({
    queryKey: ["customer-filter-meta"],
    queryFn: async () => {
      const r = await fetch("/api/customers/meta");
      if (!r.ok) throw new Error("Meta error");
      return r.json() as Promise<{ cities: { name: string; count: number }[]; categories: { name: string; count: number }[] }>;
    },
    staleTime: 60_000,
  });

  const cityOptions = [
    { value: "all", label: "All Cities" },
    ...(meta?.cities ?? []).map(c => ({ value: c.name, label: c.name })),
  ];

  const categoryOptions = [
    { value: "all", label: "All Categories" },
    ...(meta?.categories ?? []).map(c => ({ value: c.name, label: c.name })),
  ];

  useEffect(() => {
    const handler = (e: Event) => {
      const id = (e as CustomEvent).detail;
      if (id) setTwinId(id);
    };
    window.addEventListener("open-customer-twin", handler);
    return () => window.removeEventListener("open-customer-twin", handler);
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ["customers", search, page, sort, dir, statusFilter, cityFilter, categoryFilter, ltvRangeFilter],
    queryFn: async () => {
      const params = filtersToSearchParams({
        q: search,
        page,
        limit: 30,
        sort,
        dir,
        status: statusFilter,
        city: cityFilter,
        category: categoryFilter,
        ltvRange: ltvRangeFilter,
      });
      const r = await fetch(`/api/customers?${params.toString()}`);
      if (!r.ok) throw new Error("API error");
      return r.json();
    },
  });

  function resetPage() {
    setPage(1);
  }

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
      setSortKey(`${field}:${dir === "desc" ? "asc" : "desc"}`);
    } else {
      setSortKey(`${field}:desc`);
    }
    resetPage();
  }

  async function exportCsv() {
    setExporting(true);
    try {
      const params = filtersToSearchParams({
        q: search,
        sort,
        dir,
        status: statusFilter,
        city: cityFilter,
        category: categoryFilter,
        ltvRange: ltvRangeFilter,
      });
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

  const hasActiveFilters =
    statusFilter !== "all" ||
    cityFilter !== "all" ||
    categoryFilter !== "all" ||
    ltvRangeFilter !== "all" ||
    search.trim().length > 0;

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
            {hasActiveFilters ? " · filters active" : ""}
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

      {/* Search + filters */}
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
        <div className="relative flex-1 min-w-0">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            ref={searchInputRef}
            value={search}
            onChange={e => { setSearch(e.target.value); resetPage(); }}
            placeholder="Search by name, email, city, or phone..."
            className="input pl-10 pr-10 w-full text-xs py-2 h-10"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-mono text-white/20 bg-white/5 px-1.5 py-0.5 rounded border border-white/10 pointer-events-none">
            /
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <FilterSelect
            ariaLabel="Filter by status"
            value={statusFilter}
            onChange={v => { setStatusFilter(v as CustomerStatusFilter); resetPage(); }}
            options={STATUS_OPTIONS}
          />
          <FilterSelect
            ariaLabel="Filter by city"
            value={cityFilter}
            onChange={v => { setCityFilter(v); resetPage(); }}
            options={cityOptions}
          />
          <FilterSelect
            ariaLabel="Filter by category"
            value={categoryFilter}
            onChange={v => { setCategoryFilter(v); resetPage(); }}
            options={categoryOptions}
          />
          <FilterSelect
            ariaLabel="Filter by LTV range"
            value={ltvRangeFilter}
            onChange={v => { setLtvRangeFilter(v as LtvRangeFilter); resetPage(); }}
            options={LTV_RANGE_OPTIONS}
          />
          <FilterSelect
            ariaLabel="Sort customers"
            value={sortKey}
            onChange={v => { setSortKey(v); resetPage(); }}
            options={SORT_OPTIONS.map(o => ({ value: o.value, label: o.label }))}
          />
        </div>
      </div>

      <p className="text-[10px] text-[#8A8A8A] uppercase tracking-wider font-semibold -mt-1">
        {isLoading ? "Loading…" : `${data?.total?.toLocaleString("en-IN") ?? 0} matching · ${data?.items?.length ?? 0} on this page`}
      </p>

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
