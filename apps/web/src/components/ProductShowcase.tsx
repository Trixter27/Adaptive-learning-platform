import {
  Activity,
  GitBranch,
  Brain,
  LineChart,
  ArrowRight,
  Sparkles
} from "lucide-react";

const bullets = [
  { icon: Activity, text: "Per-concept mastery from assessments" },
  { icon: GitBranch, text: "Course concepts and prerequisites" },
  { icon: Brain, text: "Verified adaptive challenges" },
  { icon: LineChart, text: "Source-backed tutor responses" },
];

export default function ProductShowcase() {
  return (
    <section id="showcase" className="relative py-24">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
          <div>
            <h2 className="font-display text-3xl font-bold tracking-tight text-text sm:text-4xl lg:text-5xl">
              Mastery starts with visibility.
            </h2>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-muted">
              Open a course to track mastery and XP returned by the learning engine.
              The dashboard illustration shows sample data from our visual design.
            </p>

            <ul className="mt-8 space-y-3">
              {bullets.map((b) => {
                const Icon = b.icon;
                return (
                  <li key={b.text} className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-card text-pink">
                      <Icon className="h-3.5 w-3.5" strokeWidth={2.5} />
                    </span>
                    <span className="text-sm text-text">{b.text}</span>
                  </li>
                );
              })}
            </ul>

            <a
              href="/dashboard"
              className="btn-pink group mt-9 inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold"
            >
              Explore the Dashboard
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </a>
          </div>

          <div className="relative">
            <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-gradient-to-br from-cyan/15 via-transparent to-pink/15 blur-3xl" />
            <div className="relative rounded-2xl border border-white/10 bg-[#0d0d0d] p-2 shadow-2xl">
              <div className="flex items-center gap-1.5 px-3 py-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
              </div>
              <div className="overflow-hidden rounded-xl bg-[#0a0a0a]">
                <div className="grid grid-cols-12 gap-2 p-3">
                  <div className="col-span-3 flex flex-col gap-1.5">
                    <div className="rounded-lg bg-pink/15 px-2 py-1.5 text-[10px] font-semibold text-pink">
                      Overview
                    </div>
                    {["Quests", "Memory", "Insights"].map((s) => (
                      <div
                        key={s}
                        className="rounded-lg px-2 py-1.5 text-[10px] text-muted"
                      >
                        {s}
                      </div>
                    ))}
                    <div className="mt-auto rounded-lg border border-white/5 bg-bg p-2.5">
                      <div className="text-[9px] uppercase text-muted">XP</div>
                      <div className="font-display text-sm font-bold text-text">
                        24,820
                      </div>
                    </div>
                  </div>

                  <div className="col-span-9 flex flex-col gap-2">
                    <div className="flex items-center justify-between rounded-lg border border-white/5 bg-bg px-3 py-2">
                      <div>
                        <div className="text-[10px] text-muted">Neural Retention</div>
                        <div className="font-display text-sm font-bold text-text">
                          84%
                        </div>
                      </div>
                      <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-cyan border-t-pink" />
                    </div>

                    <div className="rounded-lg border border-white/5 bg-bg p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-[10px] font-semibold text-text">
                          Heatmap
                        </span>
                        <Sparkles className="h-3 w-3 text-cyan" />
                      </div>
                      <div className="grid grid-cols-12 gap-1">
                        {Array.from({ length: 84 }).map((_, i) => {
                          const intensity = (Math.sin(i * 0.7) + 1) / 2;
                          const color =
                            intensity > 0.7
                              ? "bg-pink"
                              : intensity > 0.45
                                ? "bg-cyan/70"
                                : intensity > 0.25
                                  ? "bg-white/15"
                                  : "bg-white/5";
                          return (
                            <div
                              key={i}
                              className={`aspect-square rounded-[2px] ${color}`}
                            />
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-lg border border-white/5 bg-bg p-2.5">
                        <div className="text-[9px] uppercase text-muted">
                          Streak
                        </div>
                        <div className="font-display text-base font-bold text-cyan">
                          27 days
                        </div>
                      </div>
                      <div className="rounded-lg border border-white/5 bg-bg p-2.5">
                        <div className="text-[9px] uppercase text-muted">
                          Rank
                        </div>
                        <div className="font-display text-base font-bold text-pink">
                          #142
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
