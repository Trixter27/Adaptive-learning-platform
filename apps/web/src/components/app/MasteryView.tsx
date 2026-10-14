"use client";

import { useState } from "react";
import Link from "next/link";
import LiveCourseProgress from "@/components/app/LiveCourseProgress";
import {
  Award,
  Calendar,
  CheckCircle2,
  Download,
  Eye,
  Flame,
  Star,
} from "lucide-react";
import MediaArt from "@/components/app/MediaArt";
import { eliteMilestones, masteryActivity, skillTrees } from "@/lib/app-data";
import { cn } from "@/lib/cn";

const ranges = ["7D", "30D", "ALL"] as const;

export default function MasteryView() {
  const [range, setRange] = useState<(typeof ranges)[number]>("30D");
  const [synced, setSynced] = useState(false);

  return (
    <>
    <LiveCourseProgress />
    <details className="mx-auto max-w-[1400px]"><summary className="mb-5 cursor-pointer text-sm text-muted">Explore the visual preview — sample data, not your progress</summary>
    <div className="mx-auto grid max-w-[1400px] gap-4 lg:grid-cols-12">
      <section className="app-panel relative overflow-hidden p-6 lg:col-span-12 lg:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_0%,rgba(255,61,154,0.22),transparent_32%)]" />
        <div className="relative grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-pink/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-pink">
                Mastery Path
              </span>
              <span className="text-xs text-muted">↗ +14% Proficiency this week</span>
            </div>
            <h1 className="mt-4 font-display text-4xl font-bold sm:text-5xl">
              System Architect
              <br />
              Mastery
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
              Your cognitive map is 78% synthesized. You are currently dominating in{" "}
              <span className="text-cyan">Neural Architectures</span> and{" "}
              <span className="text-pink">Symbolic Logic</span>. Complete 2 more labs to unlock
              Tier 4 mastery.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <a href="#skill-tree" className="btn-pink inline-flex rounded-lg px-5 py-2.5 text-sm font-semibold">
                View Skill Map ↗
              </a>
              <button type="button" className="btn-ghost inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm">
                <Download className="h-4 w-4" /> Download Report
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <MiniStat label="Global Percentile" value="Top 2%" valueClass="text-pink" />
            <MiniStat label="Certs Unlocked" value="14 / 20" />
            <MiniStat label="Knowledge Silos" value="0 Active" />
            <MiniStat label="Mastery Level" value="Lvl 24" />
          </div>
        </div>
      </section>

      <div className="space-y-4 lg:col-span-8">
        <section className="app-panel p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Learning Analytics</h2>
            <div className="flex gap-1 rounded-lg bg-white/5 p-1">
              {ranges.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRange(r)}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-[11px]",
                    range === r ? "bg-pink text-bg" : "text-muted",
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl bg-bg p-4">
              <div className="text-sm font-semibold">Retention Trend</div>
              <div className="text-[11px] text-muted">Neural anchoring stability over time</div>
              <div className="mt-2 flex gap-3 text-[10px] text-muted">
                <span className="text-pink">● XP</span>
                <span className="text-cyan">● Retention</span>
              </div>
              <svg viewBox="0 0 320 140" className="mt-2 h-36 w-full">
                <path
                  d={range === "7D" ? "M10,90 C50,80 90,70 130,50 S210,30 250,40 S310,55 310,55" : "M10,100 C60,95 90,70 140,48 S210,20 260,35 S310,50 310,50"}
                  fill="none"
                  stroke="#ff3d9a"
                  strokeWidth="3"
                />
                <path
                  d="M10,110 C70,100 110,90 160,80 S240,70 310,75"
                  fill="none"
                  stroke="#00d9ff"
                  strokeWidth="2"
                  opacity="0.7"
                />
              </svg>
              <div className="flex justify-between text-[10px] text-muted">
                {["Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                  <span key={d}>{d}</span>
                ))}
              </div>
            </div>
            <div className="rounded-xl bg-bg p-4">
              <div className="text-sm font-semibold">Skill Radar</div>
              <div className="text-[11px] text-muted">Global competency distribution</div>
              <svg viewBox="0 0 260 220" className="mx-auto mt-2 h-44 w-full max-w-xs">
                <polygon
                  points="130,30 210,80 185,170 75,170 50,80"
                  fill="none"
                  stroke="rgba(255,255,255,0.12)"
                />
                <polygon
                  points="130,50 185,90 165,150 95,155 70,95"
                  fill="rgba(255,61,154,0.18)"
                  stroke="#ff3d9a"
                />
                <text x="110" y="22" fill="#9a9a9a" fontSize="10">
                  Neural Nets
                </text>
                <text x="198" y="82" fill="#9a9a9a" fontSize="10">
                  Data Ethics
                </text>
                <text x="188" y="186" fill="#9a9a9a" fontSize="10">
                  Logic
                </text>
                <text x="88" y="200" fill="#9a9a9a" fontSize="10">
                  UI Design
                </text>
                <text x="8" y="175" fill="#9a9a9a" fontSize="10">
                  Cognition
                </text>
                <text x="8" y="78" fill="#9a9a9a" fontSize="10">
                  Systems
                </text>
              </svg>
            </div>
          </div>
        </section>

        <section id="skill-tree">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Mastery Skill Tree</h2>
            <button type="button" className="text-xs text-muted hover:text-text">
              Configure Focus
            </button>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {skillTrees.map((tree) => (
              <article key={tree.title} className="app-panel p-4">
                {tree.mastered && (
                  <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-pink">
                    Mastered
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-pink/15 text-pink">
                    <Award className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{tree.title}</div>
                    <div className="text-[10px] text-muted">{tree.tier}</div>
                  </div>
                </div>
                <ul className="mt-4 space-y-2">
                  {tree.skills.map((s) => (
                    <li key={s.name} className="flex items-center justify-between text-xs">
                      <span className="text-muted">{s.name}</span>
                      <span className={s.done ? "text-pink" : "text-muted"}>{s.value}</span>
                    </li>
                  ))}
                </ul>
                {!tree.mastered && tree.title === "Neural Engineering" && (
                  <button type="button" className="mt-4 w-full rounded-lg border border-pink/40 py-2 text-xs text-pink">
                    Focus Skill Area
                  </button>
                )}
              </article>
            ))}
          </div>
        </section>
      </div>

      <div className="space-y-4 lg:col-span-4">
        <section className="app-panel p-5">
          <h2 className="font-display text-base font-semibold">Next Milestone</h2>
          <p className="mt-1 text-xs text-muted">
            Unlock &quot;Senior Cognitive Architect&quot; Badge
          </p>
          <div className="mt-4 rounded-xl bg-bg p-5 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-pink/15 text-pink">
              <Award className="h-7 w-7" />
            </div>
            <div className="mt-3 text-sm font-semibold">Tier 4 Neural Sync</div>
            <p className="mt-1 text-[11px] text-muted">
              Complete &quot;Cross-Subject Synthesis&quot; lab with &gt; 85% retention.
            </p>
          </div>
          <div className="mt-4 text-[10px] uppercase text-muted">XP Progress</div>
          <div className="mt-1 flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
              <div className="h-full w-[85%] rounded-full bg-pink" />
            </div>
            <span className="text-[11px] text-muted">12,850 / 15,000 XP</span>
          </div>
          <button
            type="button"
            onClick={() => setSynced(true)}
            className="btn-pink mt-4 w-full rounded-lg py-2.5 text-sm font-semibold"
          >
            {synced ? "Sync Ritual Started" : "Initiate Sync Ritual"}
          </button>
        </section>

        <section className="app-panel p-5">
          <h2 className="font-display text-base font-semibold">Mastery Activity</h2>
          <p className="text-[11px] text-muted">Recent progress updates</p>
          <ul className="mt-4 space-y-3">
            {masteryActivity.map((a) => (
              <li key={a.title} className="flex items-start justify-between gap-2 text-sm">
                <span className="flex items-start gap-2">
                  <ActivityIcon name={a.icon} />
                  <span>
                    <span className="block font-medium">{a.title}</span>
                    <span className="text-[11px] text-muted">{a.time}</span>
                  </span>
                </span>
                <span className="text-[11px] text-pink">{a.xp}</span>
              </li>
            ))}
          </ul>
          <Link href="/achievements" className="mt-4 block text-center text-xs text-pink">
            Show Historical Logs
          </Link>
        </section>
      </div>

      <section className="lg:col-span-12">
        <h2 className="mb-3 font-display text-lg font-semibold">Recent Milestones</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {eliteMilestones.map((m) => (
            <div key={m.title} className="app-panel flex flex-col items-center px-3 py-6 text-center">
              <MediaArt
                tone={m.tone === "cyan" ? "badge-cyan" : "badge-pink"}
                className="mb-3 h-12 w-12 rounded-lg"
              />
              <div className="text-sm font-semibold">{m.title}</div>
              <div className="mt-1 text-[11px] text-muted">Retained 98% Knowledge</div>
            </div>
          ))}
        </div>
      </section>
    </div>
    </details>
    </>
  );
}

function MiniStat({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-xl bg-black/40 px-4 py-3">
      <div className="text-[10px] uppercase tracking-wide text-muted">{label}</div>
      <div className={cn("mt-1 font-display text-lg font-bold", valueClass)}>{value}</div>
    </div>
  );
}

function ActivityIcon({ name }: { name: string }) {
  const cls = "mt-0.5 h-4 w-4 text-muted";
  if (name === "check") return <CheckCircle2 className={cls} />;
  if (name === "star") return <Star className={cls} />;
  if (name === "flame") return <Flame className={cls} />;
  if (name === "eye") return <Eye className={cls} />;
  return <Calendar className={cls} />;
}
