"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Award,
  BookOpen,
  LayoutGrid,
  Settings,
  Sparkles,
  Target,
  Trophy,
  Users,
  X,
} from "lucide-react";
import { navItems } from "@/lib/app-data";
import { cn } from "@/lib/cn";

const icons = {
  "layout-grid": LayoutGrid,
  "book-open": BookOpen,
  target: Target,
  award: Award,
  users: Users,
  trophy: Trophy,
  settings: Settings,
};

export default function Sidebar({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/60 lg:hidden",
          open ? "block" : "hidden",
        )}
        onClick={onClose}
        aria-hidden
      />
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-60 flex-col border-r border-white/5 bg-[#070707] px-3 py-4 transition-transform lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="mb-6 flex items-center justify-between px-2">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-pink text-bg shadow-[0_0_18px_rgba(255,61,154,0.45)]">
              <Sparkles className="h-4 w-4" strokeWidth={2.5} />
            </span>
            <span className="font-display text-sm font-bold tracking-[0.18em] text-text">
              QUESTORIAA
            </span>
          </Link>
          <button
            type="button"
            aria-label="Close navigation"
            className="rounded-md p-1 text-muted lg:hidden"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-1" aria-label="App">
          {navItems.map((item) => {
            const Icon = icons[item.icon];
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                  active
                    ? "bg-pink/15 font-medium text-pink"
                    : "text-muted hover:bg-white/5 hover:text-text",
                )}
              >
                <Icon className="h-4 w-4" strokeWidth={1.8} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-4 rounded-2xl border border-pink/20 bg-gradient-to-b from-pink/15 to-transparent p-4">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-pink">
            <Sparkles className="h-3.5 w-3.5" />
            Pro Plan
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-muted">
            Unlock unlimited AI Tutor sessions and specialized labs.
          </p>
          <Link
            href="/settings"
            className="btn-pink mt-3 flex w-full items-center justify-center rounded-lg px-3 py-2 text-xs font-semibold"
          >
            Upgrade Now
          </Link>
        </div>
      </aside>
    </>
  );
}

