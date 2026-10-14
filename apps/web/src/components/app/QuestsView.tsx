"use client";

import Link from "next/link";
import LiveCourseProgress from "@/components/app/LiveCourseProgress";
import { useMemo, useState } from "react";
import { Lock, Zap } from "lucide-react";
import MediaArt from "@/components/app/MediaArt";
import { dailyChallenges, rewards, weeklyCampaigns } from "@/lib/app-data";
import { cn } from "@/lib/cn";

const filters = ["All", "Daily", "Weekly", "Legendary"] as const;

export default function QuestsView() {
  const [filter, setFilter] = useState<(typeof filters)[number]>("All");
  const [progress, setProgress] = useState<Record<string, number>>({
    logic: 100,
    research: 60,
    sprint: 20,
    architect: 85,
    mentor: 40,
    polymath: 75,
  });
  const [equipped, setEquipped] = useState("wings");

  const showDaily = filter === "All" || filter === "Daily";
  const showWeekly = filter === "All" || filter === "Weekly";

  const daily = useMemo(
    () => dailyChallenges.map((q) => ({ ...q, progress: progress[q.id] ?? q.progress })),
    [progress],
  );

  function bump(id: string) {
    setProgress((p) => ({ ...p, [id]: Math.min(100, (p[id] ?? 0) + 10) }));
  }

  return (
    <>
    <LiveCourseProgress />
    <details className="mx-auto max-w-[1400px]"><summary className="mb-5 cursor-pointer text-sm text-muted">Explore the visual preview — sample data, not your progress</summary>
    <div className="mx-auto max-w-[1400px] space-y-6">
      <section className="app-panel relative overflow-hidden p-6 sm:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,61,154,0.18),transparent_30%)]" />
        <div className="relative grid items-center gap-6 lg:grid-cols-[1fr_280px]">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-pink">
              Active Campaign
            </div>
            <h1 className="mt-3 font-display text-4xl font-bold leading-tight sm:text-5xl">
              Ascend through
              <br />
              <span className="text-gradient">Knowledge Quests.</span>
            </h1>
            <p className="mt-3 max-w-xl text-sm text-muted">
              Level up Julian. Each completed challenge reinforces your neural retention and
              secures your position on the global architect leaderboard.
            </p>
            <div className="mt-5 flex gap-3">
              <div className="rounded-xl bg-bg px-4 py-3">
                <div className="text-[10px] uppercase tracking-wide text-muted">
                  XP Earned Today
                </div>
                <div className="font-display text-xl font-bold text-pink">+1,240</div>
              </div>
              <div className="rounded-xl bg-bg px-4 py-3">
                <div className="text-[10px] uppercase tracking-wide text-muted">
                  Streak Bonus
                </div>
                <div className="font-display text-xl font-bold">1.2x</div>
              </div>
            </div>
          </div>
          <div className="overflow-hidden rounded-2xl border border-white/10">
            <MediaArt tone="ritual-banner" className="h-36" />
            <div className="flex items-center justify-between bg-[#0d0d12] px-4 py-3">
              <div>
                <div className="text-sm font-semibold">Daily Rituals</div>
                <div className="text-[11px] text-muted">Resets in 14h 22m</div>
              </div>
              <span className="rounded-md bg-pink/15 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-pink">
                Sync Status
              </span>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-semibold">Active Quest Log</h2>
          <div className="flex rounded-lg border border-white/10 p-1">
            {filters.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs",
                  filter === f ? "bg-white/10 text-text" : "text-muted",
                )}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {showDaily && (
          <>
            <div className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-pink">
              Daily Challenges
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {daily.map((q) => (
                <article key={q.id} className="app-panel p-4">
                  <div className="flex items-center justify-between text-[10px] uppercase tracking-wide">
                    <span className="text-muted">{q.badge}</span>
                    <span className="font-semibold text-pink">
                      {q.extra ?? `+${q.xp} XP`}
                    </span>
                  </div>
                  <h3 className="mt-3 font-display text-lg font-semibold">{q.title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-muted">{q.description}</p>
                  <div className="mt-4 text-[10px] uppercase text-muted">Progress</div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-pink" style={{ width: `${q.progress}%` }} />
                  </div>
                  <div className="mt-1 text-right text-[10px] text-muted">{q.progress}%</div>
                  {q.status === "completed" ? (
                    <div className="mt-3 text-center text-[10px] font-semibold uppercase tracking-wider text-muted">
                      Quest Log
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => bump(q.id)}
                      className="btn-pink mt-3 w-full rounded-lg py-2 text-xs font-semibold"
                    >
                      Continue Mission
                    </button>
                  )}
                </article>
              ))}
            </div>
          </>
        )}

        {showWeekly && (
          <>
            <div className="mb-3 mt-8 text-[10px] font-semibold uppercase tracking-wider text-cyan">
              Weekly Campaigns
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {weeklyCampaigns.map((q) => (
                <article key={q.id} className="app-panel p-4">
                  <div className="flex items-center justify-between text-[10px] uppercase tracking-wide">
                    <span className="text-muted">{q.badge}</span>
                    <span className={q.accent === "pink" ? "text-pink" : "text-cyan"}>
                      {q.xp} XP
                    </span>
                  </div>
                  <h3 className="mt-3 font-display text-lg font-semibold">{q.title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-muted">{q.description}</p>
                  <div className="mt-4 text-[10px] uppercase text-muted">Progress</div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        q.accent === "pink" ? "bg-pink" : "bg-cyan",
                      )}
                      style={{ width: `${progress[q.id]}%` }}
                    />
                  </div>
                  <div className="mt-1 text-right text-[10px] text-muted">{progress[q.id]}%</div>
                  <div className="mt-2 text-[10px] text-muted">{q.meta}</div>
                  <button
                    type="button"
                    onClick={() => bump(q.id)}
                    className={cn(
                      "mt-3 w-full rounded-lg py-2 text-xs font-semibold",
                      q.accent === "pink" ? "btn-pink" : "border border-cyan/40 text-cyan",
                    )}
                  >
                    Continue Mission
                  </button>
                </article>
              ))}
            </div>
          </>
        )}

        {filter === "Legendary" && (
          <div className="app-panel p-8 text-center text-sm text-muted">
            Legendary seasonal quests unlock after you complete three weekly campaigns.
          </div>
        )}
      </section>

      <section>
        <div className="mb-1 flex items-end justify-between">
          <div>
            <h2 className="font-display text-lg font-semibold">Reward Terminal</h2>
            <p className="text-xs text-muted">
              Redeem your earned XP for exclusive aesthetic and utility upgrades.
            </p>
          </div>
          <div className="text-right text-xs">
            <div className="text-muted">Balance</div>
            <div className="inline-flex items-center gap-1 font-semibold text-cyan">
              <Zap className="h-3.5 w-3.5" /> 2,450 XP Available
            </div>
          </div>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {rewards.map((r) => (
            <article key={r.id} className="app-panel overflow-hidden">
              <div className="relative">
                <MediaArt tone={r.art} className="h-36" />
                {r.state === "locked" && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/45">
                    <Lock className="h-6 w-6 text-white" />
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between p-4">
                <div>
                  <div className="text-[10px] uppercase text-muted">
                    {r.state === "unlocked" ? "Avatar Skin" : "UI Theme"}
                  </div>
                  <div className="text-sm font-semibold">{r.title}</div>
                  <div className="text-xs text-muted">{r.cost}</div>
                </div>
                <button
                  type="button"
                  disabled={r.state === "locked"}
                  onClick={() => setEquipped(r.id)}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-[11px] font-semibold uppercase",
                    r.state === "locked"
                      ? "bg-white/5 text-muted"
                      : equipped === r.id
                        ? "bg-pink text-bg"
                        : "bg-pink/20 text-pink",
                  )}
                >
                  {r.state === "locked" ? "Unlock" : equipped === r.id ? "Equipped" : "Equip"}
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="app-panel p-6">
          <h2 className="font-display text-xl font-semibold">Architect Progression</h2>
          <p className="mt-1 text-sm text-muted">
            Next Milestone: <span className="text-text">Level 25 - Neural Sage</span>
          </p>
          <div className="mt-4 text-[10px] uppercase text-muted">Current Progress</div>
          <div className="mt-1 flex items-center justify-between text-xs">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
              <div className="h-full w-[43%] rounded-full bg-pink" />
            </div>
            <span className="ml-3 text-muted">8,200 / 19,000 XP</span>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-[10px] uppercase text-muted">Weekly Rank</div>
              <div className="font-display text-lg font-bold">#12</div>
            </div>
            <div>
              <div className="text-[10px] uppercase text-muted">Quest Cleared</div>
              <div className="font-display text-lg font-bold">84%</div>
            </div>
            <div>
              <div className="text-[10px] uppercase text-muted">Achievement</div>
              <div className="font-display text-lg font-bold">42/100</div>
            </div>
          </div>
          <Link href="/achievements" className="btn-pink mt-5 block w-full rounded-lg py-2.5 text-center text-sm font-semibold">
            Explore Advanced Achievements
          </Link>
        </section>
        <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#2a0a22] to-[#12081c] p-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-pink/20 text-pink">
            <span className="text-2xl">🎖</span>
          </div>
          <h2 className="mt-4 font-display text-2xl font-bold">Legendary Seasonal Challenge</h2>
          <p className="mt-2 max-w-md text-sm text-muted">
            Unlock the exclusive &quot;Quantum Cognition&quot; tab by completing all 5 weekly
            marathons before the season reset.
          </p>
          <div className="mt-5 flex items-center gap-3 text-xs">
            <span className="rounded-full bg-white/10 px-3 py-1">Ends in 3 Days</span>
            <span className="text-pink">+5000 XP Bonus</span>
          </div>
        </section>
      </div>
    </div>
    </details>
    </>
  );
}
