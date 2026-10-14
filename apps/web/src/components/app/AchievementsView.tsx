import MediaArt from "@/components/app/MediaArt";
import { eliteMilestones, recentAchievements } from "@/lib/app-data";

export default function AchievementsView() {
  const all = [
    ...recentAchievements.map((a) => ({ ...a, tone: "thinker" as const })),
    ...eliteMilestones.map((m) => ({
      title: m.title,
      detail: "Retained 98% Knowledge",
      tone: m.tone === "cyan" ? ("badge-cyan" as const) : ("badge-pink" as const),
    })),
  ];

  return (
    <div className="mx-auto max-w-[1400px]">
      <h1 className="font-display text-3xl font-bold">Achievements</h1>
      <p className="mt-1 text-sm text-muted">
        Badges earned through dialogues, retention labs, and seasonal marathons.
      </p>
      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        {all.map((a) => (
          <article key={a.title} className="app-panel flex flex-col items-center px-4 py-6 text-center">
            <MediaArt tone={a.tone} className="mb-3 h-16 w-16 rounded-xl" />
            <div className="text-sm font-semibold">{a.title}</div>
            <div className="mt-1 text-[11px] text-muted">{a.detail}</div>
          </article>
        ))}
      </div>
    </div>
  );
}
