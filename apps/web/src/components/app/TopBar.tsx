"use client";

import { usePathname } from "next/navigation";
import { Bell, Flame, Menu, Search, Zap } from "lucide-react";
import {
  Show,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";
import { searchPlaceholders, user } from "@/lib/app-data";

export default function TopBar({ onMenu }: { onMenu: () => void }) {
  const pathname = usePathname();
  const placeholder =
    searchPlaceholders[pathname] ?? "Search Questoriaa...";

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-white/5 bg-[#070707]/95 px-4 backdrop-blur-xl sm:px-6">
      <button
        type="button"
        aria-label="Open navigation"
        onClick={onMenu}
        className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 text-text lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      <label className="relative min-w-0 flex-1">
        <span className="sr-only">Search</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          type="search"
          disabled
          title="Global search is a design preview. Find your courses in Library."
          placeholder={placeholder}
          className="app-input h-10 w-full max-w-xl rounded-xl pl-10 pr-4 text-sm"
        />
      </label>

      <div className="hidden items-center gap-4 sm:flex">
        <span className="text-[10px] uppercase text-muted">Preview stats</span>
        <div className="flex items-center gap-1.5 text-sm font-semibold text-pink">
          <Flame className="h-4 w-4 fill-pink" />
          {user.streak}
        </div>
        <div className="flex items-center gap-1.5 text-sm font-semibold text-cyan">
          <Zap className="h-4 w-4 fill-cyan" />
          {user.xp.toLocaleString()} XP
        </div>
        <button
          type="button"
          aria-label="Notifications"
          className="relative rounded-lg p-2 text-muted hover:bg-white/5 hover:text-text"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-pink" />
        </button>
        <Show when="signed-out">
          <div className="flex items-center gap-2">
            <SignInButton mode="redirect">
              <button
                type="button"
                className="rounded-lg px-2 py-2 text-xs text-muted hover:bg-white/5 hover:text-text sm:px-3 sm:text-sm"
              >
                Sign In
              </button>
            </SignInButton>
            <SignUpButton mode="redirect">
              <button
                type="button"
                className="btn-pink rounded-lg px-3 py-2 text-xs font-semibold sm:px-4 sm:text-sm"
              >
                Sign Up
              </button>
            </SignUpButton>
          </div>
        </Show>
        <Show when="signed-in">
          <UserButton />
        </Show>
      </div>
    </header>
  );
}
