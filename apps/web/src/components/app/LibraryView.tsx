"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Archive,
  BookOpen,
  Box,
  Brain,
  Clock3,
  Database,
  Download,
  Grid2x2,
  Layers,
  List,
  PenTool,
  Plus,
  Star,
  User,
} from "lucide-react";
import MediaArt from "@/components/app/MediaArt";
import {
  curatedPaths,
  folders,
  libraryCategories,
} from "@/lib/app-data";
import { cn } from "@/lib/cn";

const catIcons = {
  layers: Layers,
  brain: Brain,
  database: Database,
  "pen-tool": PenTool,
  box: Box,
  star: Star,
  archive: Archive,
};

export default function LibraryView() {
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [visible, setVisible] = useState(6);

  const filtered = useMemo(() => {
    return curatedPaths.filter((p) => {
      const matchCat = category === "all" || p.tag === category;
      const q = query.toLowerCase();
      const matchQ =
        !q ||
        p.title.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.author.toLowerCase().includes(q);
      return matchCat && matchQ;
    });
  }, [category, query]);

  return (
    <div className="mx-auto max-w-[1400px]">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">
            Knowledge Hub
          </div>
          <h1 className="mt-1 font-display text-3xl font-bold">Resource Library</h1>
          <p className="mt-2 max-w-xl text-sm text-muted">
            Curated learning paths, research-grounded whitepapers, and interactive UI labs to
            accelerate your cognitive growth.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="btn-ghost inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold"
          >
            <Download className="h-4 w-4" /> Download Manager
          </button>
          <button
            type="button"
            className="btn-pink inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold"
          >
            <Plus className="h-4 w-4" /> Add Resource
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <aside className="space-y-4 lg:col-span-3">
          <section className="app-panel p-3">
            <div className="px-2 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted">
              Categories
            </div>
            {libraryCategories.map((c) => {
              const Icon = catIcons[c.icon];
              const active = category === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategory(c.id)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm",
                    active ? "bg-pink/15 text-pink" : "text-muted hover:bg-white/5 hover:text-text",
                  )}
                >
                  <span className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    {c.label}
                  </span>
                  <span className="text-xs">{c.count}</span>
                </button>
              );
            })}
          </section>

          <section>
            <div className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-wider text-muted">
              Quick Access Folders
            </div>
            <div className="grid grid-cols-2 gap-2">
              {folders.map((f) => (
                <button
                  key={f.title}
                  type="button"
                  className="app-panel flex flex-col items-start gap-2 p-3 text-left"
                >
                  <BookOpen className={cn("h-5 w-5", f.color)} />
                  <div className="text-xs font-semibold">{f.title}</div>
                  <div className="text-[10px] text-muted">{f.items}</div>
                </button>
              ))}
            </div>
          </section>

          <section className="app-panel p-4">
            <div className="text-sm font-semibold">Library Mastery</div>
            <div className="mt-3 flex justify-between text-[11px] text-muted">
              <span>Courses Completed</span>
              <span>14 / 20</span>
            </div>
            <div className="mt-3 text-[11px] text-muted">Knowledge Retention</div>
            <div className="mt-1 flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                <div className="h-full w-[88%] rounded-full bg-gradient-to-r from-pink to-cyan" />
              </div>
              <span className="text-xs font-semibold">88%</span>
            </div>
            <Link href="/mastery" className="mt-3 inline-block text-xs text-pink hover:underline">
              View Full Analytics →
            </Link>
          </section>
        </aside>

        <div className="space-y-4 lg:col-span-9">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex rounded-lg border border-white/10 p-1">
              <button
                type="button"
                onClick={() => setView("grid")}
                className={cn(
                  "inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs",
                  view === "grid" ? "bg-white/10 text-text" : "text-muted",
                )}
              >
                <Grid2x2 className="h-3.5 w-3.5" /> Grid View
              </button>
              <button
                type="button"
                onClick={() => setView("list")}
                className={cn(
                  "inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs",
                  view === "list" ? "bg-white/10 text-text" : "text-muted",
                )}
              >
                <List className="h-3.5 w-3.5" /> List View
              </button>
            </div>
            <div className="flex gap-2">
              <label className="sr-only" htmlFor="lib-search">
                Filter resources
              </label>
              <input
                id="lib-search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter by title or author"
                className="app-input h-9 rounded-lg px-3 text-sm"
              />
              <button type="button" className="btn-ghost rounded-lg px-3 py-2 text-xs">
                Sort by: Recent
              </button>
              <button type="button" className="btn-ghost rounded-lg px-3 py-2 text-xs">
                View History
              </button>
            </div>
          </div>

          <section className="app-panel overflow-hidden p-5">
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-pink">
              Weekly Spotlight
            </div>
            <div className="mt-4 grid items-center gap-6 md:grid-cols-[220px_1fr]">
              <MediaArt tone="spotlight" className="h-40 rounded-xl" />
              <div>
                <h2 className="font-display text-2xl font-bold">
                  Transformers & Attention Mechanisms
                </h2>
                <p className="mt-2 max-w-xl text-sm text-muted">
                  Dive deep into the architecture that revolutionized Natural Language
                  Processing. This course covers positional encoding, multi-head attention,
                  and encoder-decoder stacks from a fundamental perspective.
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted">
                  <span>850 XP Potential</span>
                  <span>8.5 Hours Total</span>
                </div>
                <button
                  type="button"
                  className="btn-pink mt-4 inline-flex items-center rounded-lg px-5 py-2.5 text-sm font-semibold"
                >
                  Launch Path →
                </button>
              </div>
            </div>
          </section>

          <section>
            <h2 className="mb-3 font-display text-lg font-semibold">Curated Paths</h2>
            <div
              className={cn(
                "grid gap-4",
                view === "grid" ? "sm:grid-cols-2 xl:grid-cols-3" : "grid-cols-1",
              )}
            >
              {filtered.slice(0, visible).map((p) => (
                <article key={p.id} className="app-panel overflow-hidden">
                  <MediaArt
                    tone={p.art}
                    className={cn("w-full", view === "list" ? "h-24" : "h-32")}
                  />
                  <div className="p-4">
                    <div className="flex items-center justify-between text-[10px] uppercase tracking-wide text-muted">
                      <span>{p.category}</span>
                      <span className="text-cyan">{p.xp} XP</span>
                    </div>
                    <h3 className="mt-2 font-display text-base font-semibold">{p.title}</h3>
                    <p className="mt-1 text-xs leading-relaxed text-muted">{p.blurb}</p>
                    <div className="mt-4 flex items-center justify-between text-[11px] text-muted">
                      <span className="inline-flex items-center gap-1">
                        <User className="h-3 w-3" /> {p.author}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock3 className="h-3 w-3" /> {p.time}
                      </span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
            {visible < filtered.length && (
              <div className="mt-6 flex justify-center">
                <button
                  type="button"
                  onClick={() => setVisible((v) => v + 3)}
                  className="btn-ghost rounded-lg px-5 py-2 text-sm"
                >
                  Load More Resources
                </button>
              </div>
            )}
          </section>

          <section className="app-panel px-6 py-10 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-pink/15 text-pink">
              <Star className="h-5 w-5" />
            </div>
            <h2 className="mt-4 font-display text-2xl font-bold">Stay at the cutting edge.</h2>
            <p className="mx-auto mt-2 max-w-lg text-sm text-muted">
              Subscribe to our weekly intelligence digest. Get the latest research papers,
              design patterns, and logic rituals delivered to your cockpit.
            </p>
            <form
              className="mx-auto mt-5 flex max-w-md gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (email.trim()) setSubscribed(true);
              }}
            >
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address..."
                className="app-input h-11 flex-1 rounded-lg px-3 text-sm"
              />
              <button type="submit" className="btn-pink rounded-lg px-5 text-sm font-semibold">
                {subscribed ? "Subscribed" : "Subscribe"}
              </button>
            </form>
            <p className="mt-3 text-[11px] text-muted">
              Join 2,400+ architects on their journey to mastery.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
