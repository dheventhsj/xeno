"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { LayoutDashboard, Users, Sparkles, BarChart3, UsersRound, Radio } from "lucide-react";

const LINKS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/copilot", label: "Copilot", icon: Sparkles },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/personas", label: "Personas", icon: UsersRound },
  { href: "/monitor", label: "Live Monitor", icon: Radio }
];

export function Nav() {
  const pathname = usePathname();
  return (
    <nav className="glass mb-8 px-4 py-3 flex items-center justify-between flex-wrap gap-3">
      <Link href="/" className="font-semibold text-lg flex items-center gap-2">
        <span className="grid place-items-center w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-sky-400 shadow-[0_0_20px_rgba(124,58,237,0.6)]">
          <Sparkles size={16} className="text-white" />
        </span>
        <span className="gradient-text">Xeno</span>
        <span className="opacity-60 font-normal text-sm hidden sm:inline">· AI Marketing Strategist</span>
      </Link>
      <div className="flex gap-1 text-sm flex-wrap">
        {LINKS.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href as any}
              className={`relative px-3 py-2 rounded-xl flex items-center gap-2 transition-colors ${
                active ? "text-white" : "text-white/65 hover:text-white"
              }`}
            >
              {active && (
                <motion.span
                  layoutId="nav-active"
                  className="absolute inset-0 rounded-xl bg-gradient-to-r from-violet-600/40 to-sky-500/30 border border-white/15"
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                />
              )}
              <Icon size={16} className="relative z-10" />
              <span className="relative z-10 hidden md:inline">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
