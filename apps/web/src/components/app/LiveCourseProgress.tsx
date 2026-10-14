"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, friendlyApiError, type Course, type CourseMap, type GameState, type ProgressResponse } from "@/lib/api";

export default function LiveCourseProgress() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selected, setSelected] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let cancelled = false;
    api.listCourses().then((data) => {
      if (cancelled) return;
      setCourses(data.slice().reverse());
      setSelected(data.at(-1)?.id || "");
    }).catch((err) => { if (!cancelled) setError(friendlyApiError(err)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [retry]);
  return <section className="app-panel mb-6 p-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><div className="text-[10px] uppercase tracking-[0.2em] text-cyan">Live learning progress</div><h2 className="mt-1 font-display text-xl font-semibold">Your next quest</h2></div>
      <Link className="btn-pink rounded-lg px-4 py-2 text-sm font-semibold" href="/courses/new">Create Course</Link>
    </div>
    {loading ? <p role="status" className="mt-4 text-sm text-muted">Loading courses…</p> : error ? <div role="alert" className="mt-4 text-sm text-pink">{error}<button className="btn-ghost ml-3 rounded-lg px-3 py-1" onClick={() => { setLoading(true); setError(""); setRetry((n) => n + 1); }}>Retry</button></div> : !courses.length ? <p className="mt-4 text-sm text-muted">Upload a PDF or PPTX to start tracking mastery and XP.</p> : <>
      <label className="mt-4 block text-xs text-muted">Select course<select className="app-input mt-2 h-10 w-full rounded-lg px-3 sm:max-w-lg" value={selected} onChange={(event) => setSelected(event.target.value)}>{courses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}</select></label>
      <CourseProgress key={selected} courseId={selected} />
    </>}
  </section>;
}

function CourseProgress({ courseId }: { courseId: string }) {
  const [data, setData] = useState<{ map: CourseMap; progress: ProgressResponse; game: GameState } | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let cancelled = false;
    Promise.all([api.getCourseMap(courseId), api.getProgress(courseId), api.getGame(courseId)])
      .then(([map, progress, game]) => { if (!cancelled) setData({ map, progress, game }); })
      .catch((err) => { if (!cancelled) setError(friendlyApiError(err)); });
    return () => { cancelled = true; };
  }, [courseId, retry]);
  if (error) return <p role="alert" className="mt-4 text-sm text-pink">{error}<button className="btn-ghost ml-3 rounded-lg px-3 py-1" onClick={() => { setError(""); setRetry((n) => n + 1); }}>Retry</button></p>;
  if (!data) return <p role="status" className="mt-4 text-sm text-muted">Loading mastery…</p>;
  const { map, progress, game } = data;
  return <>
    <div className="my-5 grid grid-cols-2 gap-3 sm:grid-cols-4">{[["Course XP", game.xp], ["Level", game.level], ["Average mastery", `${Math.round(progress.average_mastery * 100)}%`], ["Challenges cleared", game.completed_challenges.length]].map(([label, value]) => <div key={label} className="rounded-xl bg-bg p-4"><div className="text-[10px] uppercase text-muted">{label}</div><div className="mt-1 font-display text-xl font-bold text-cyan">{value}</div></div>)}</div>
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{map.chapters.flatMap((chapter) => chapter.topics.flatMap((topic) => topic.concepts.map((concept) => {
      const state = progress.mastery.find((entry) => entry.concept_id === concept.id);
      return <Link key={concept.id} href={`/courses/${courseId}/concepts/${concept.id}`} className="rounded-xl border border-white/10 bg-bg p-4 transition hover:border-pink/40"><div className="text-[10px] text-muted">{chapter.title} · {topic.title}</div><h3 className="mt-2 text-sm font-semibold">{concept.name} →</h3><p className="mt-2 text-xs text-cyan">{state ? `${Math.round(state.mastery_score * 100)}% mastery · ${state.attempt_count} attempts` : "Not attempted"}</p></Link>;
    })))}</div>
    {!map.chapters.length && <p className="text-sm text-muted">No concepts yet. Complete processing before starting a quest.</p>}
    <Link className="mt-5 inline-block text-sm text-pink hover:underline" href={`/courses/${courseId}`}>Open full course map →</Link>
  </>;
}
