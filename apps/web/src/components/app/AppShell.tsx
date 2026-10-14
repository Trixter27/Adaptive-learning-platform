"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "@/components/app/Sidebar";
import TopBar from "@/components/app/TopBar";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-bg text-text">
      <Sidebar open={open} onClose={() => setOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar onMenu={() => setOpen(true)} />
        <main className="app-scroll flex-1 overflow-x-hidden p-4 sm:p-6">
          <p className="mb-4 text-[11px] text-muted">Hackathon workspace · Clerk sign-in with a shared backend development identity.</p>
          {["/community", "/achievements", "/settings"].includes(pathname) && <p className="mb-4 rounded-lg border border-cyan/15 bg-cyan/5 p-3 text-xs text-cyan">Visual preview · sample data and local UI interactions only.</p>}
          {children}
        </main>
      </div>
    </div>
  );
}
