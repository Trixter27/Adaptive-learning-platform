"use client";

import { FormEvent, useEffect, useState } from "react";
import { Brain, LoaderCircle, Send } from "lucide-react";
import { api, friendlyApiError, sourceLabel, type Course, type TutorResponse } from "@/lib/api";

export default function CourseTutor({ courseId }: { courseId?: string }) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selected, setSelected] = useState("");
  const [message, setMessage] = useState("");
  const [answer, setAnswer] = useState<TutorResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const target = courseId || selected;

  useEffect(() => {
    if (courseId) return;
    let cancelled = false;
    api.listCourses().then((data) => {
      if (cancelled) return;
      setCourses(data.slice().reverse());
      setSelected(data.at(-1)?.id || "");
    }).catch((err) => { if (!cancelled) setError(friendlyApiError(err)); });
    return () => { cancelled = true; };
  }, [courseId]);

  async function ask(event: FormEvent) {
    event.preventDefault();
    if (!target || !message.trim() || busy) return;
    setBusy(true);
    setError("");
    try {
      setAnswer(await api.tutor(target, null, message.trim()));
      setMessage("");
    } catch (err) { setError(friendlyApiError(err)); }
    finally { setBusy(false); }
  }

  return <section className="app-panel p-5">
    <div className="flex items-center gap-3">
      <span className="rounded-xl bg-cyan/10 p-2 text-cyan"><Brain className="h-5 w-5" /></span>
      <div><h2 className="font-display font-semibold">AI Mentor · Aria</h2><p className="text-[11px] text-cyan">Live course tutor</p></div>
    </div>
    {!courseId && <label className="mt-4 block text-xs text-muted">Course
      <select value={selected} disabled={busy} onChange={(event) => { setSelected(event.target.value); setAnswer(null); setError(""); }} className="app-input mt-2 h-10 w-full rounded-lg px-3">
        {!courses.length && <option value="">Create and process a course first</option>}
        {courses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}
      </select>
    </label>}
    {answer ? <div className="mt-4 rounded-xl bg-bg p-4" aria-live="polite">
      <div className="text-[10px] uppercase tracking-wider text-cyan">{answer.answer_type.replaceAll("_", " ")}</div>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{answer.answer}</p>
      <div className="mt-3 flex flex-wrap gap-2">{answer.sources.map((source, index) => <span key={index} title={`File ${source.file_id}`} className="rounded-md border border-cyan/20 bg-cyan/5 px-2 py-1 text-[11px] text-cyan">{sourceLabel(source)} · {source.file_id.slice(0, 8)}</span>)}</div>
    </div> : <p className="mt-4 text-xs leading-relaxed text-muted">Ask about your uploaded material. Source locations appear when the answer is supported by your course.</p>}
    <form onSubmit={ask} className="mt-4">
      <label className="sr-only" htmlFor="course-tutor-message">Question for Aria</label>
      <textarea id="course-tutor-message" value={message} onChange={(event) => setMessage(event.target.value)} disabled={busy || !target} maxLength={10000} placeholder="Explain this using my notes…" className="app-input min-h-24 w-full rounded-xl p-3 text-sm" />
      <button disabled={busy || !target || !message.trim()} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-cyan px-4 py-2.5 text-sm font-semibold text-bg disabled:opacity-50">{busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}{busy ? "Retrieving + answering…" : "Ask Aria"}</button>
    </form>
    {error && <p role="alert" className="mt-3 text-xs text-pink">{error}</p>}
  </section>;
}
