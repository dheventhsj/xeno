"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Sparkles, Users, Megaphone, BarChart3 } from "lucide-react";
import clsx from "clsx";

const LINKS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/copilot", label: "AI Copilot", icon: Sparkles },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/campaigns", label: "Campaigns", icon: Megaphone },
  { href: "/analytics", label: "Analytics", icon: BarChart3 }
];

export function Nav() {
  const path = usePathname();
  return (
    <header className="glass mb-8 flex flex-wrap items-center justify-between gap-4 px-5 py-4">
      <Link href="/" className="flex items-center gap-2 text-lg font-bold">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#F5F5F5] text-black">
          <Sparkles size={16} className="fill-black text-black" />
        </span>
        <span className="text-white font-bold">Pulse CRM</span>
      </Link>
      <nav className="flex flex-wrap gap-1 text-sm">
        {LINKS.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? path === "/" : path.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex items-center gap-2 rounded-xl px-3 py-2 transition",
                active ? "bg-white/10 border border-white/10 text-white" : "text-white/60 hover:text-white hover:bg-white/5"
              )}
            >
              <Icon size={14} /> {label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
