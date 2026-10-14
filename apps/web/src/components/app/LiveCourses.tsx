"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, BookOpen, LoaderCircle, Plus, RefreshCw } from "lucide-react";
import { api, type Course, friendlyApiError } from "@/lib/api";

export default function LiveCourses() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      setCourses(await api.listCourses());
    } catch (err) {
      setError(friendlyApiError(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <section className="app-panel p-5 lg:col-span-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan">
            Live learning workspace
          </div>
          <h2 className="mt-1 font-display text-lg font-semibold">Your Questoriaa Courses</h2>
          <p className="mt-1 text-xs text-muted">
            Real courses from the FastAPI + Neon learning pipeline.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void load()}
            className="btn-ghost inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
          <Link
            href="/courses/new"
            className="btn-pink inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold"
          >
            <Plus className="h-3.5 w-3.5" /> Create Course
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="mt-5 flex items-center gap-2 text-sm text-muted">
          <LoaderCircle className="h-4 w-4 animate-spin" /> Loading courses…
        </div>
      ) : error ? (
        <div className="mt-5 rounded-xl border border-pink/20 bg-pink/5 p-4 text-sm">
          <div className="font-semibold text-pink">Backend not connected yet</div>
          <p className="mt-1 text-xs leading-relaxed text-muted">{error}</p>
          <p className="mt-2 text-[11px] text-muted">
            The rest of AJ&apos;s visual dashboard remains available while the API is offline.
          </p>
        </div>
      ) : courses.length === 0 ? (
        <Link
          href="/courses/new"
          className="mt-5 flex items-center justify-between rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-4 hover:border-pink/30"
        >
          <span className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-pink/10 text-pink">
              <BookOpen className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-sm font-semibold">Create your first adaptive course</span>
              <span className="mt-0.5 block text-xs text-muted">Upload a PDF or PowerPoint and let Questoriaa build the map.</span>
            </span>
          </span>
          <ArrowRight className="h-4 w-4 text-pink" />
        </Link>
      ) : (
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {courses.slice(-6).reverse().map((course) => (
            <Link
              href={`/courses/${course.id}`}
              key={course.id}
              className="group rounded-xl border border-white/5 bg-bg p-4 transition hover:border-cyan/25"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan/10 text-cyan">
                  <BookOpen className="h-4 w-4" />
                </span>
                <ArrowRight className="h-4 w-4 text-muted transition group-hover:translate-x-1 group-hover:text-cyan" />
              </div>
              <h3 className="mt-3 font-display text-sm font-semibold">{course.title}</h3>
              <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted">
                {course.description || "Adaptive course ready for concept mapping and challenges."}
              </p>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
