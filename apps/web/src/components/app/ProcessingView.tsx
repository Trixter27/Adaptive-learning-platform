"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Circle, LoaderCircle, Sparkles, XCircle } from "lucide-react";
import { api, friendlyApiError, type ProcessingJob } from "@/lib/api";

const stages = [
  ["queued", "Queued"],
  ["extracting_content", "Extracting content"],
  ["analyzing_content", "Analyzing material"],
  ["building_course", "Building course map"],
  ["creating_embeddings", "Creating embeddings"],
  ["indexing", "Indexing knowledge"],
  ["completed", "Complete"],
] as const;

export default function ProcessingView({ courseId, jobId }: { courseId: string; jobId: string }) {
  const router = useRouter();
  const [job, setJob] = useState<ProcessingJob | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!jobId) return;

    let cancelled = false;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function poll() {
      try {
        const next = await api.getJob(jobId, AbortSignal.any([controller.signal, AbortSignal.timeout(30_000)]));
        if (cancelled) return;
        if (next.course_id !== courseId) throw new Error("This job belongs to another course.");
        setJob(next);
        if (next.status === "completed") {
          timer = setTimeout(() => router.replace(`/courses/${courseId}`), 700);
          return;
        }
        if (next.status === "failed") {
          setError(next.error || "Course processing failed.");
          return;
        }
        timer = setTimeout(poll, 1500);
      } catch (err) {
        if (!cancelled) setError(friendlyApiError(err));
      }
    }

    void poll();
    return () => {
      cancelled = true;
      controller.abort();
      if (timer) clearTimeout(timer);
    };
  }, [courseId, jobId, router, retry]);

  const currentIndex = useMemo(() => {
    if (!job) return 0;
    return Math.max(0, stages.findIndex(([id]) => id === job.stage));
  }, [job]);

  const progress = job?.progress ?? 0;
  const displayError = !jobId ? "Missing processing job id." : error;

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-3xl items-center justify-center">
      <section className="app-panel relative w-full overflow-hidden p-7 sm:p-9">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_10%,rgba(0,217,255,0.12),transparent_30%),radial-gradient(circle_at_10%_90%,rgba(255,61,154,0.13),transparent_30%)]" />
        <div className="relative">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-pink/15 text-pink">
            {displayError ? <XCircle className="h-6 w-6" /> : <Sparkles className="h-6 w-6 animate-pulse" />}
          </div>
          <div className="mt-5 text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan">Knowledge engine</div>
          <h1 className="mt-1 font-display text-3xl font-bold">
            {displayError ? "Processing needs attention" : job?.status === "completed" ? "Your quest is ready." : "Building your learning world…"}
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
            Questoriaa is extracting your source, building the concept graph, and indexing grounded evidence for tutoring and assessment.
          </p>

          <div className="mt-7">
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="font-medium">{job ? stages[currentIndex]?.[1] : "Connecting to worker"}</span>
              <span className="font-semibold text-pink">{progress}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-gradient-to-r from-pink to-cyan transition-all duration-700" style={{ width: `${progress}%` }} />
            </div>
          </div>

          <div className="mt-7 grid gap-2 sm:grid-cols-2">
            {stages.map(([id, label], index) => {
              const complete = index < currentIndex || job?.status === "completed";
              const current = index === currentIndex && job?.status !== "completed" && !displayError;
              return (
                <div key={id} className="flex items-center gap-3 rounded-xl bg-white/[0.025] px-3 py-3">
                  {complete ? (
                    <CheckCircle2 className="h-4 w-4 text-cyan" />
                  ) : current ? (
                    <LoaderCircle className="h-4 w-4 animate-spin text-pink" />
                  ) : (
                    <Circle className="h-4 w-4 text-white/15" />
                  )}
                  <span className={current ? "text-xs font-semibold text-text" : "text-xs text-muted"}>{label}</span>
                </div>
              );
            })}
          </div>

          {displayError && (
            <div role="alert" className="mt-6 rounded-xl border border-pink/25 bg-pink/5 p-4 text-sm text-pink">
              {displayError}
              <div className="mt-3 flex flex-wrap gap-3">
                {jobId && job?.status !== "failed" && <button type="button" className="btn-ghost rounded-lg px-3 py-2" onClick={() => { setError(""); setRetry((value) => value + 1); }}>Retry status check</button>}
                <Link className="btn-ghost rounded-lg px-3 py-2" href={`/courses/${courseId}`}>View course</Link>
                <Link className="btn-pink rounded-lg px-3 py-2" href="/courses/new">Upload another document</Link>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
