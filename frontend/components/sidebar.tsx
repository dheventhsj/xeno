"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Sparkles, Users, Megaphone, BarChart3, Target, Zap, Network
} from "lucide-react";
import clsx from "clsx";

type NavLink = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  accent?: boolean;
};

const NAV_SECTIONS: { title: string; links: NavLink[] }[] = [
  {
    title: "Core",
    links: [
      { href: "/", label: "Mission Control", icon: LayoutDashboard },
      { href: "/copilot", label: "AI Copilot", icon: Sparkles },
    ]
  },
  {
    title: "Operate",
    links: [
      { href: "/campaigns", label: "Campaigns", icon: Megaphone },
      { href: "/audiences", label: "Audiences", icon: Target },
      { href: "/customers", label: "Customers", icon: Users },
    ]
  },
  {
    title: "Measure",
    links: [
      { href: "/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/architecture", label: "Architecture", icon: Network, accent: true },
    ]
  }
];

export function Sidebar() {
  const path = usePathname() ?? "/";

  return (
    <aside
      className="sticky top-0 flex h-screen w-[240px] flex-col border-r bg-[#0F0F0F] shrink-0"
      style={{ borderColor: "var(--border)" }}
    >
      <div className="flex items-center gap-3 px-5 py-6">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-[#F5F5F5]">
          <Zap size={16} className="text-black fill-black" />
        </div>
        <span className="text-white text-base font-bold tracking-tight">Pulse CRM</span>
      </div>

      <nav className="space-y-6 px-3 py-2">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title}>
            <div className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-[#8A8A8A]">
              {section.title}
            </div>
            <div className="space-y-0.5">
              {section.links.map(({ href, label, icon: Icon, accent }) => {
                const active = href === "/" ? path === "/" : path.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={clsx(
                      "sidebar-link",
                      active && "sidebar-link-active",
                      accent && !active && "text-[#b4c0d4] hover:text-[#dbe4f0]"
                    )}
                  >
                    <Icon
                      size={16}
                      strokeWidth={accent ? 1.75 : 2}
                      className={clsx(
                        active ? "text-white" : accent ? "text-[#9eb0c9]" : "text-[#8A8A8A]"
                      )}
                    />
                    <span>{label}</span>
                  </Link>
                );
              })}
              {section.title === "Measure" && (
                <div className="mt-2.5 px-1">
                  <div className="rounded-xl border-2 border-purple-400/40 bg-[#14101f] px-3.5 py-3 ring-1 ring-purple-500/20">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-purple-300/80">
                      Developed by
                    </p>
                    <p className="mt-1 text-sm font-extrabold text-white tracking-tight">
                      Dheventh.S
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </nav>

      <div
        className="mt-auto flex items-center gap-3 px-5 py-4 border-t"
        style={{ borderColor: "var(--border)" }}
      >
        <span className="live-dot" />
        <div className="flex flex-col">
          <span className="text-[11px] font-medium text-white">Pulse Engine</span>
          <span className="text-[9px] text-[#8A8A8A]">All systems operational</span>
        </div>
      </div>
    </aside>
  );
}
