import {
  MessageCircleQuestion,
  Layers,
  ShieldCheck,
  Route,
  Trophy,
  Zap,
  type LucideIcon,
} from "lucide-react";

type Feature = {
  icon: LucideIcon;
  title: string;
  description: string;
  accent: "pink" | "cyan";
};

const features: Feature[] = [
  {
    icon: MessageCircleQuestion,
    title: "Interactive Quizzes",
    description:
      "AI generates and verifies challenges using your course material and current mastery.",
    accent: "pink",
  },
  {
    icon: Layers,
    title: "Learn from Your Documents",
    description:
      "Upload selectable-text PDFs or PowerPoint slides. QUESTORIAA organizes your material into chapters and concepts.",
    accent: "cyan",
  },
  {
    icon: ShieldCheck,
    title: "Grounded AI Answers",
    description:
      "Ask about your course with retrieved evidence. See source-backed, inferred, or general-knowledge labels and available page or slide citations.",
    accent: "pink",
  },
  {
    icon: Route,
    title: "Personalized Paths",
    description:
      "Proprietary algorithms map your progress and surface the right concepts at the right time.",
    accent: "cyan",
  },
  {
    icon: Trophy,
    title: "XP-Based Gamification",
    description:
      "Earn course XP for correct challenges and track your level as you learn.",
    accent: "pink",
  },
  {
    icon: Zap,
    title: "Instant Feedback",
    description:
      "Get deep insights into your logic immediately. Fix misconceptions before they become habits.",
    accent: "cyan",
  },
];

const accentMap = {
  pink: {
    ring: "bg-pink/10 text-pink",
    dot: "bg-pink",
  },
  cyan: {
    ring: "bg-cyan/10 text-cyan",
    dot: "bg-cyan",
  },
} as const;

export default function Features() {
  return (
    <section id="features" className="relative py-24">
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[400px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-pink/5 blur-[120px]" />
      <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight text-text sm:text-4xl">
            Built for the Modern Mind
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted">
            Traditional learning is broken. We use cognitive science and
            generative AI to create a loop of constant engagement and deep
            understanding.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => {
            const a = accentMap[f.accent];
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="card-hover group relative overflow-hidden rounded-2xl border border-white/8 bg-card p-6"
              >
                <div className="absolute right-0 top-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-gradient-to-br from-pink/10 to-cyan/10 opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100" />
                <div
                  className={`relative inline-flex h-11 w-11 items-center justify-center rounded-xl ${a.ring}`}
                >
                  <Icon className="h-5 w-5" strokeWidth={2} />
                </div>
                <h3 className="mt-5 font-display text-lg font-semibold text-text">
                  {f.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {f.description}
                </p>
                <div className="mt-5 flex items-center gap-1.5">
                  <span className={`h-1.5 w-1.5 rounded-full ${a.dot}`} />
                  <span className="text-[11px] font-medium uppercase tracking-wide text-muted">
                    QUESTORIAA Engine
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
