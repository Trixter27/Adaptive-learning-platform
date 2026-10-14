import {
  BookOpen,
  BrainCircuit,
  Gamepad2,
  type LucideIcon,
} from "lucide-react";

type Step = {
  num: string;
  icon: LucideIcon;
  title: string;
  description: string;
};

const steps: Step[] = [
  {
    num: "01",
    icon: BookOpen,
    title: "Ingest Content",
    description:
      "Feed your raw material—notes, books, or lectures. Our engine parses the core logic.",
  },
  {
    num: "02",
    icon: BrainCircuit,
    title: "AI Synthesis",
    description:
      "QUESTORIAA builds a personalized learning path, identifying key concepts and cross-links.",
  },
  {
    num: "03",
    icon: Gamepad2,
    title: "Gamified Play",
    description:
      "Engage in quests and quizzes to earn XP. Knowledge becomes a high-score game.",
  },
];

export default function Steps() {
  return (
    <section id="methodology" className="relative py-24">
      <div className="pointer-events-none absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight text-text sm:text-4xl">
            Three Steps to Mastery
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted">
            The QUESTORIAA process is designed to move information from short-term
            data to long-term instinct.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-3">
          {steps.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={s.num} className="relative text-center">
                {i < steps.length - 1 && (
                  <div className="absolute left-1/2 top-8 hidden h-px w-full bg-gradient-to-r from-pink/40 to-cyan/20 md:block" />
                )}
                <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-card">
                  <Icon className="h-7 w-7 text-pink" strokeWidth={1.75} />
                  <span className="absolute -bottom-2 right-1/2 translate-x-1/2 rounded-full bg-pink px-2 py-0.5 text-[10px] font-bold text-bg">
                    {s.num}
                  </span>
                </div>
                <h3 className="mt-8 font-display text-xl font-semibold text-text">
                  {s.title}
                </h3>
                <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-muted">
                  {s.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
