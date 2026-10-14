"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Flame,
  MoreHorizontal,
  Paperclip,
  Send,
  Sparkles,
  Trophy,
} from "lucide-react";
import MediaArt from "@/components/app/MediaArt";
import LiveCourses from "@/components/app/LiveCourses";
import {
  dailyQuests,
  leaderboard,
  learningPaths,
  performanceMetrics,
  recentAchievements,
  user,
  weekDays,
} from "@/lib/app-data";
import { cn } from "@/lib/cn";

const initialChat = [
  "Hello Julian! I noticed you were exploring Transformers yesterday. Would you like to dive deeper into Self-Attention mechanisms today or review your recent quiz gaps?",
];

export default function DashboardView() {
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState(initialChat);

  function send() {
    const value = message.trim();
    if (!value) return;
    setChat((c) => [...c, value]);
    setMessage("");
  }

  return (
    <div className="mx-auto grid max-w-[1400px] gap-4 lg:grid-cols-12">
      <section className="app-panel relative overflow-hidden p-6 lg:col-span-12">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_90%_10%,rgba(255,61,154,0.18),transparent_28%)]" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <h1 className="font-display text-3xl font-bold sm:text-4xl">
              Welcome back, {user.firstName}!
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              You&apos;re 240 XP away from Level 25. Complete your daily logic ritual to
              secure your streak and unlock the{" "}
              <Link href="/mastery" className="text-cyan hover:underline">
                System Architect Badge
              </Link>
              .
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/library"
                className="btn-pink inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold"
              >
                Continue Learning
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/mastery"
                className="btn-ghost inline-flex items-center rounded-lg px-5 py-2.5 text-sm font-semibold"
              >
                View My Progress
              </Link>
            </div>
          </div>
          <div className="flex flex-col items-center">
            <div className="relative h-24 w-24">
              <svg viewBox="0 0 96 96" className="h-full w-full -rotate-90">
                <circle cx="48" cy="48" r="40" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  fill="none"
                  stroke="#ff3d9a"
                  strokeWidth="8"
                  strokeDasharray={`${0.75 * 251} 251`}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center font-display text-lg font-bold">
                75%
              </span>
            </div>
            <div className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-muted">
              Daily Goal
            </div>
          </div>
        </div>
      </section>

      <LiveCourses />

      <div className="flex flex-col gap-4 lg:col-span-8">
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard
            label="Current Streak"
            value="12 Days"
            hint="+2 from yesterday"
            hintClass="text-pink"
            icon={<Flame className="h-4 w-4 text-pink" />}
          />
          <StatCard
            label="Global Ranking"
            value="#142"
            hint="Top 2% worldwide"
            hintClass="text-cyan"
            icon={<Trophy className="h-4 w-4 text-cyan" />}
          />
          <StatCard
            label="Lessons Mastery"
            value="84%"
            hint="Exceeding average"
            icon={<CheckCircle2 className="h-4 w-4 text-muted" />}
          />
        </div>

        <section className="app-panel p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
              <span className="text-pink">⌘</span> Active Learning Paths
            </h2>
            <Link href="/library" className="text-xs text-muted hover:text-text">
              View All Paths
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {learningPaths.map((path) => (
              <article key={path.id} className="overflow-hidden rounded-xl bg-bg">
                <MediaArt tone={path.tone} className="h-28 w-full" />
                <div className="p-3">
                  <div className="flex items-center justify-between text-[10px] uppercase tracking-wide text-muted">
                    <span>{path.when}</span>
                    <span>{path.progress}%</span>
                  </div>
                  <h3 className="mt-1 text-sm font-semibold">{path.title}</h3>
                  <p className="mt-1 text-[11px] leading-relaxed text-muted">
                    {path.subtitle}
                  </p>
                  <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-pink"
                      style={{ width: `${path.progress}%` }}
                    />
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="app-panel p-5">
          <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold">
            <Sparkles className="h-4 w-4 text-pink" /> Performance Metrics
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {performanceMetrics.map((m) => (
              <div key={m.label}>
                <div className="text-[10px] uppercase tracking-wide text-muted">
                  {m.label}
                </div>
                <div className="mt-1 font-display text-xl font-bold">{m.value}</div>
              </div>
            ))}
          </div>
          <div className="mt-8 flex items-end justify-between gap-2 px-2">
            {weekDays.map((day, i) => {
              const active = i >= 5;
              const height = [8, 8, 8, 8, 8, 34, 52][i];
              return (
                <div key={day} className="flex flex-1 flex-col items-center gap-2">
                  <div
                    className={cn(
                      "w-full max-w-[42px] rounded-sm",
                      active ? "bg-pink" : "bg-white/10",
                    )}
                    style={{ height }}
                  />
                  <span className="text-[9px] uppercase tracking-wide text-muted">
                    {day}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        <section>
          <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold">
            <Trophy className="h-4 w-4 text-pink" /> Recent Achievements
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {recentAchievements.map((a) => (
              <Link
                key={a.title}
                href="/achievements"
                className="app-panel flex flex-col items-center px-3 py-4 text-center"
              >
                <MediaArt tone="thinker" className="mb-3 h-14 w-14 rounded-lg" />
                <div className="text-xs font-semibold">{a.title}</div>
                <div className="mt-1 text-[10px] text-muted">{a.detail}</div>
              </Link>
            ))}
          </div>
        </section>
      </div>

      <div className="flex flex-col gap-4 lg:col-span-4">
        <section className="app-panel flex min-h-[340px] flex-col p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan/15 text-cyan">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <div className="text-sm font-semibold">AI Mentor: Aria <span className="ml-1 rounded bg-white/5 px-1.5 py-0.5 text-[9px] font-medium text-muted">preview</span></div>
                <div className="text-[10px] text-muted">Live grounded tutoring is available inside each course concept.</div>
              </div>
            </div>
            <button type="button" className="text-muted" aria-label="Mentor options">
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-4 flex-1 space-y-3 overflow-y-auto text-sm leading-relaxed text-muted">
            {chat.map((line, i) => (
              <p key={i} className={i ? "rounded-lg bg-white/5 p-2 text-text" : ""}>
                {line}
              </p>
            ))}
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                Example source references
              </div>
              <p className="mt-1 text-[11px]">
                Attention Is All You Need (Vaswani et al., 2017)
              </p>
              <p className="text-[11px]">Deep Learning Research Lab: Chapter 14</p>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Ask Aria about any concept..."
              className="app-input h-10 flex-1 rounded-lg px-3 text-sm"
            />
            <button type="button" aria-label="Attach" className="rounded-lg border border-white/10 px-2 text-muted">
              <Paperclip className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Send"
              onClick={send}
              className="rounded-lg bg-cyan px-2.5 text-bg"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {["Explain Latency", "Next Lesson", "Quiz Me"].map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => setMessage(chip)}
                className="rounded-md bg-white/5 px-2.5 py-1 text-[11px] text-muted hover:text-text"
              >
                {chip}
              </button>
            ))}
          </div>
        </section>

        <section className="app-panel p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-base font-semibold">Daily Quests</h2>
            <span className="text-[11px] font-semibold text-pink">1,200 XP Total</span>
          </div>
          <ul className="space-y-3">
            {dailyQuests.map((q) => (
              <li key={q.title} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span
                    className={cn(
                      "h-2 w-2 rounded-full",
                      q.done ? "bg-pink" : "bg-white/20",
                    )}
                  />
                  {q.title}
                </span>
                <span className="text-xs text-muted">+{q.xp} XP</span>
              </li>
            ))}
          </ul>
          <Link
            href="/quests"
            className="mt-4 block text-center text-xs font-medium text-pink hover:underline"
          >
            View Quest Log
          </Link>
        </section>

        <section className="app-panel p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-base font-semibold">Leaderboard</h2>
            <span className="text-[11px] text-muted">↑ Up 4 places</span>
          </div>
          <ol className="space-y-2">
            {leaderboard.map((row) => (
              <li
                key={row.name}
                className={cn(
                  "flex items-center justify-between rounded-lg px-2 py-2 text-sm",
                  row.highlight && "bg-pink/15",
                )}
              >
                <span className="flex items-center gap-2">
                  <span className="w-4 text-xs text-muted">{row.rank}</span>
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-[10px]">
                    {row.name.split(" ").map((n) => n[0]).join("")}
                  </span>
                  {row.name}
                </span>
                <span className="text-xs font-semibold text-cyan">{row.xp}</span>
              </li>
            ))}
          </ol>
          <Link
            href="/community"
            className="mt-3 block text-center text-xs text-muted hover:text-text"
          >
            Show Top 100
          </Link>
        </section>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  hintClass,
  icon,
}: {
  label: string;
  value: string;
  hint: string;
  hintClass?: string;
  icon: ReactNode;
}) {
  return (
    <div className="app-panel p-4">
      <div className="flex items-start justify-between">
        <div className="text-[10px] uppercase tracking-wide text-muted">{label}</div>
        {icon}
      </div>
      <div className="mt-2 font-display text-2xl font-bold">{value}</div>
      <div className={cn("mt-1 text-xs text-muted", hintClass)}>{hint}</div>
    </div>
  );
}
