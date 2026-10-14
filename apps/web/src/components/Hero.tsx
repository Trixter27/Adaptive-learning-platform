"use client";

import {
  ArrowRight,
  Play,
  Trophy,
  TrendingUp,
  Target,
  Zap,
} from "lucide-react";

function DashboardPreview() {
  return (
    <div className="relative">
      <div className="absolute -inset-4 -z-10 rounded-[2rem] bg-gradient-to-br from-pink/20 via-transparent to-cyan/20 blur-2xl" />
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-card shadow-2xl">
        <div className="flex items-center gap-1.5 border-b border-white/5 bg-card-2 px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
          <span className="ml-3 text-[11px] text-muted">questoriaa.app / dashboard</span>
        </div>

        <div className="grid grid-cols-12 gap-3 p-4">
          <aside className="col-span-3 hidden flex-col gap-1.5 lg:flex">
            <div className="flex items-center gap-2 rounded-lg bg-pink/15 px-2.5 py-2 text-[11px] font-semibold text-pink">
              <Target className="h-3.5 w-3.5" /> Overview
            </div>
            {["Quests", "Library", "Memory", "Leaderboard"].map((s) => (
              <div
                key={s}
                className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-[11px] text-muted hover:bg-white/5"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-muted/50" />
                {s}
              </div>
            ))}
            <div className="mt-auto rounded-xl border border-white/5 bg-bg p-3">
              <div className="text-[10px] uppercase tracking-wide text-muted">Daily XP</div>
              <div className="mt-1 font-display text-lg font-bold text-text">2,840</div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div className="h-full w-[78%] rounded-full bg-gradient-to-r from-pink to-cyan" />
              </div>
            </div>
          </aside>

          <div className="col-span-12 flex flex-col gap-3 lg:col-span-9">
            <div className="flex items-center justify-between rounded-xl border border-white/5 bg-bg p-3">
              <div>
                <div className="text-[11px] text-muted">Welcome back</div>
                <div className="font-display text-base font-bold text-text">
                  Warrior_Child
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-full bg-pink/15 px-3 py-1 text-[11px] font-semibold text-pink">
                <Trophy className="h-3.5 w-3.5" /> Level 12 Architect
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Retention", value: "84%", color: "from-cyan to-cyan/40" },
                { label: "Streak", value: "27d", color: "from-pink to-pink/40" },
                { label: "Quests", value: "142", color: "from-amber-400 to-amber-400/40" },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-xl border border-white/5 bg-bg p-3"
                >
                  <div className="text-[10px] uppercase tracking-wide text-muted">
                    {s.label}
                  </div>
                  <div
                    className={`mt-1 bg-gradient-to-r ${s.color} bg-clip-text font-display text-xl font-bold text-transparent`}
                  >
                    {s.value}
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-white/5 bg-bg p-3">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-[11px] font-semibold text-text">
                  Knowledge Graph
                </div>
                <Zap className="h-3.5 w-3.5 text-pink" />
              </div>
              <div className="relative h-28">
                <svg viewBox="0 0 300 110" className="h-full w-full">
                  <defs>
                    <linearGradient id="line" x1="0" x2="1">
                      <stop offset="0%" stopColor="#ff3d9a" />
                      <stop offset="100%" stopColor="#00d9ff" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M10,80 C50,30 90,90 130,55 S210,20 250,60 S290,40 290,40"
                    fill="none"
                    stroke="url(#line)"
                    strokeWidth="2.5"
                  />
                  {[
                    [10, 80],
                    [70, 55],
                    [130, 55],
                    [190, 35],
                    [250, 60],
                    [290, 40],
                  ].map(([x, y], i) => (
                    <circle
                      key={i}
                      cx={x}
                      cy={y}
                      r="3.5"
                      fill={i % 2 ? "#00d9ff" : "#ff3d9a"}
                    />
                  ))}
                </svg>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-white/5 bg-bg p-3">
                <div className="text-[11px] font-semibold text-text">Mastery</div>
                <div className="mt-2 flex items-end gap-1.5">
                  {[40, 65, 50, 80, 60, 90, 72].map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-t bg-gradient-to-t from-pink to-cyan"
                      style={{ height: `${h * 0.5}px` }}
                    />
                  ))}
                </div>
              </div>
              <div className="rounded-xl border border-white/5 bg-bg p-3">
                <div className="text-[11px] font-semibold text-text">Subjects</div>
                <div className="mt-2 space-y-1.5">
                  {[
                    { n: "Neuroscience", v: 92 },
                    { n: "Physics", v: 68 },
                    { n: "History", v: 45 },
                  ].map((r) => (
                    <div key={r.n}>
                      <div className="flex justify-between text-[10px] text-muted">
                        <span>{r.n}</span>
                        <span>{r.v}%</span>
                      </div>
                      <div className="mt-0.5 h-1 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-pink to-cyan"
                          style={{ width: `${r.v}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute -bottom-4 -left-4 hidden items-center gap-2 rounded-xl border border-white/10 bg-card px-3 py-2 shadow-xl sm:flex">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan/15 text-cyan">
          <TrendingUp className="h-4 w-4" />
        </div>
        <div>
          <div className="text-[11px] font-semibold text-text">84% Retention</div>
          <div className="text-[10px] text-muted">+12% this week</div>
        </div>
      </div>
    </div>
  );
}

const avatars = [
  "from-pink to-rose-500",
  "from-cyan to-blue-500",
  "from-amber-400 to-orange-500",
  "from-emerald-400 to-teal-500",
];

export default function Hero() {
  return (
    <section id="top" className="relative overflow-hidden pt-28 pb-20 sm:pt-32">
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-40" />
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-pink/10 blur-[120px]" />
      <div className="pointer-events-none absolute top-40 right-0 h-[400px] w-[400px] rounded-full bg-cyan/10 blur-[120px]" />

      <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-5 sm:px-8 lg:grid-cols-2">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-pink/30 bg-pink/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-pink">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-pink opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-pink" />
            </span>
            Hackathon Prototype
          </div>

          <h1 className="mt-6 font-display text-5xl font-bold leading-[1.05] tracking-tight text-text sm:text-6xl lg:text-7xl">
            Learn Smarter.
            <br />
            <span className="text-gradient">Play to Master.</span>
          </h1>

          <p className="mt-6 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
            QUESTORIAA transforms static study material into interactive, AI-driven
            learning adventures. Master every subject through grounded logic,
            gamified XP, and personalized memory paths.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              href="/dashboard"
              className="btn-pink group inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold"
            >
              Start Learning Free
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </a>
            <a
              href="#showcase"
              className="btn-ghost inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold text-text"
            >
              <Play className="h-4 w-4 fill-current" />
              Explore Features
            </a>
          </div>

          <div className="mt-10 flex items-center gap-4">
            <div className="flex -space-x-2.5">
              {avatars.map((g, i) => (
                <div
                  key={i}
                  className={`flex h-9 w-9 items-center justify-center rounded-full border-2 border-bg bg-gradient-to-br ${g} text-[11px] font-bold text-bg`}
                >
                  {["A", "M", "K", "R"][i]}
                </div>
              ))}
            </div>
            <p className="text-sm text-muted">
              <span className="font-semibold text-text">Design preview</span> · sample
              learner avatars and dashboard metrics
            </p>
          </div>
        </div>

        <div className="animate-float">
          <DashboardPreview />
        </div>
      </div>
    </section>
  );
}
