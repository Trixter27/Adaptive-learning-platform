import Link from "next/link";
import { leaderboard } from "@/lib/app-data";
import { cn } from "@/lib/cn";

const threads = [
  {
    title: "How are you linking attention heads back to symbolic logic?",
    author: "Sarah Jenkins",
    replies: 18,
    tag: "Neural Nets",
  },
  {
    title: "Weekly polymath challenge — spatial computing resources?",
    author: "Marcus Thorne",
    replies: 9,
    tag: "Quests",
  },
  {
    title: "Citation workflow with Aria that actually sticks",
    author: "Elena Rossi",
    replies: 24,
    tag: "Mentor",
  },
];

export default function CommunityView() {
  return (
    <div className="mx-auto grid max-w-[1400px] gap-4 lg:grid-cols-12">
      <section className="lg:col-span-8">
        <h1 className="font-display text-3xl font-bold">Community</h1>
        <p className="mt-1 text-sm text-muted">
          Architects exchanging citations, quests, and grounded study rituals.
        </p>
        <div className="mt-6 space-y-3">
          {threads.map((t) => (
            <article key={t.title} className="app-panel p-5">
              <div className="text-[10px] uppercase tracking-wider text-pink">{t.tag}</div>
              <h2 className="mt-2 font-display text-lg font-semibold">{t.title}</h2>
              <p className="mt-2 text-xs text-muted">
                Started by {t.author} · {t.replies} replies
              </p>
            </article>
          ))}
        </div>
      </section>
      <aside className="lg:col-span-4">
        <div className="app-panel p-5">
          <h2 className="font-display text-base font-semibold">Live Leaderboard</h2>
          <ol className="mt-4 space-y-2">
            {leaderboard.map((row) => (
              <li
                key={row.name}
                className={cn(
                  "flex items-center justify-between rounded-lg px-2 py-2 text-sm",
                  row.highlight && "bg-pink/15",
                )}
              >
                <span>
                  {row.rank}. {row.name}
                </span>
                <span className="text-cyan">{row.xp}</span>
              </li>
            ))}
          </ol>
          <Link href="/quests" className="mt-4 block text-center text-xs text-pink">
            Climb with weekly quests
          </Link>
        </div>
      </aside>
    </div>
  );
}
