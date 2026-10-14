"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, BookOpen, Brain, CheckCircle2, LoaderCircle, LockKeyhole, RefreshCw, Sparkles, Trophy, Zap } from "lucide-react";
import { api, friendlyApiError, type Course, type CourseMap, type GameState, type ProgressResponse } from "@/lib/api";

export default function CourseMapView({ courseId }: { courseId: string }) {
  const [course, setCourse] = useState<Course | null>(null);
  const [map, setMap] = useState<CourseMap | null>(null);
  const [progress, setProgress] = useState<ProgressResponse | null>(null);
  const [game, setGame] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [courseData, mapData, progressData, gameData] = await Promise.all([
        api.getCourse(courseId),
        api.getCourseMap(courseId),
        api.getProgress(courseId),
        api.getGame(courseId),
      ]);
      setCourse(courseData);
      setMap(mapData);
      setProgress(progressData);
      setGame(gameData);
    } catch (err) {
      setError(friendlyApiError(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [courseId]);

  const mastery = useMemo(() => {
    const entries = new Map<string, number>();
    for (const item of progress?.mastery || []) entries.set(item.concept_id, item.mastery_score);
    return entries;
  }, [progress]);

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center gap-2 text-sm text-muted"><LoaderCircle className="h-4 w-4 animate-spin" /> Loading course map…</div>;
  }

  if (error || !map || !course) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="app-panel p-6">
          <h1 className="font-display text-xl font-semibold">Course map unavailable</h1>
          <p className="mt-2 text-sm text-muted">{error || "The course has not been processed yet."}</p>
          <button onClick={() => void load()} className="btn-pink mt-4 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold">
            <RefreshCw className="h-3.5 w-3.5" /> Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1200px]">
      <Link href="/dashboard" className="mb-5 inline-flex items-center gap-2 text-xs text-muted hover:text-text">
        <ArrowLeft className="h-3.5 w-3.5" /> Dashboard
      </Link>

      <section className="app-panel relative overflow-hidden p-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_90%_5%,rgba(255,61,154,0.16),transparent_30%)]" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-pink">Course World</div>
            <h1 className="mt-2 font-display text-3xl font-bold">{course.title}</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted">{course.description || "Progress through the concept map and let your mastery shape the next challenge."}</p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <Metric icon={<Zap className="h-4 w-4 text-cyan" />} label="XP" value={String(game?.xp ?? 0)} />
            <Metric icon={<Trophy className="h-4 w-4 text-pink" />} label="Level" value={String(game?.level ?? 1)} />
            <Metric icon={<Brain className="h-4 w-4 text-cyan" />} label="Mastery" value={`${Math.round((progress?.average_mastery ?? 0) * 100)}%`} />
          </div>
        </div>
      </section>

      <div className="mt-6 space-y-7">
        {map.chapters.map((chapter, chapterIndex) => {
          const unlocked = !game?.unlocked_chapter_ids?.length || game.unlocked_chapter_ids.includes(chapter.id) || chapterIndex === 0;
          return (
            <section key={chapter.id} className="relative">
              {chapterIndex < map.chapters.length - 1 && <div className="absolute bottom-[-28px] left-7 top-full w-px bg-gradient-to-b from-pink/50 to-transparent" />}
              <div className="mb-3 flex items-center gap-3">
                <span className={`flex h-14 w-14 items-center justify-center rounded-2xl border ${unlocked ? "border-pink/30 bg-pink/10 text-pink" : "border-white/5 bg-white/[0.02] text-muted"}`}>
                  {unlocked ? <BookOpen className="h-5 w-5" /> : <LockKeyhole className="h-5 w-5" />}
                </span>
                <div>
                  <div className="text-[10px] uppercase tracking-[0.2em] text-muted">Chapter {chapterIndex + 1}</div>
                  <h2 className="font-display text-xl font-semibold">{chapter.title}</h2>
                </div>
              </div>

              <div className="ml-7 border-l border-white/10 pl-7">
                <div className="space-y-4">
                  {chapter.topics.map((topic) => (
                    <div key={topic.id} className="app-panel p-4">
                      <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-cyan">{topic.title}</div>
                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {topic.concepts.map((concept) => {
                          const score = mastery.get(concept.id) ?? 0;
                          return (
                            <Link
                              key={concept.id}
                              href={`/courses/${courseId}/concepts/${concept.id}`}
                              className="group rounded-xl border border-white/5 bg-bg p-4 transition hover:-translate-y-0.5 hover:border-pink/30"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5">
                                  {score >= 0.75 ? <CheckCircle2 className="h-4 w-4 text-cyan" /> : <Sparkles className="h-4 w-4 text-pink" />}
                                </div>
                                <ArrowRight className="h-4 w-4 text-muted transition group-hover:translate-x-1 group-hover:text-pink" />
                              </div>
                              <h3 className="mt-3 text-sm font-semibold">{concept.name}</h3>
                              <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-muted">{concept.description}</p>
                              <div className="mt-4 flex items-center gap-2">
                                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                                  <div className="h-full rounded-full bg-gradient-to-r from-pink to-cyan" style={{ width: `${Math.round(score * 100)}%` }} />
                                </div>
                                <span className="text-[10px] font-semibold text-muted">{Math.round(score * 100)}%</span>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          );
        })}
      </div>

      {map.chapters.length === 0 && (
        <div className="app-panel mt-6 p-6 text-sm text-muted">No chapters were generated for this course yet.</div>
      )}
    </div>
  );
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="min-w-24 rounded-xl bg-bg px-3 py-3">
      <div className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-wider text-muted">{icon}{label}</div>
      <div className="mt-1 font-display text-lg font-bold">{value}</div>
    </div>
  );
}
