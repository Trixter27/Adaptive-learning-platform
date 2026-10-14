"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, FileText, LoaderCircle, Presentation, Sparkles, UploadCloud } from "lucide-react";
import Link from "next/link";
import { api, friendlyApiError, type SourceType } from "@/lib/api";

function fileMetadata(file: File): { sourceType: SourceType; contentType: string } | null {
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return { sourceType: "pdf", contentType: "application/pdf" };
  if (ext === "pptx") {
    return {
      sourceType: "pptx",
      contentType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    };
  }
  return null;
}

export default function CreateCourseView() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy || !title.trim() || !file) return;
    if (file.size === 0 || file.size > 100_000_000 || file.name.length > 255) {
      setError("Choose a non-empty PDF/PPTX up to 100 MB with a filename under 256 characters.");
      return;
    }
    const metadata = fileMetadata(file);
    if (!metadata) {
      setError("Please choose a PDF or PPTX file.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      setStatus("Creating course…");
      const course = await api.createCourse({ title: title.trim(), description: description.trim() });

      setStatus("Reserving secure upload…");
      const upload = await api.presignUpload({
        course_id: course.id,
        filename: file.name,
        source_type: metadata.sourceType,
        content_type: metadata.contentType,
        size_bytes: file.size,
      });

      setStatus("Uploading study material…");
      await api.uploadFile(upload, file, metadata.contentType);

      setStatus("Confirming upload…");
      await api.completeUpload(course.id, upload.file_id);

      setStatus("Starting the knowledge engine…");
      const job = await api.processCourse(course.id, upload.file_id);
      router.push(`/courses/${course.id}/processing?job=${job.id}`);
    } catch (err) {
      setError(friendlyApiError(err));
      setBusy(false);
      setStatus("");
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/dashboard" className="mb-5 inline-flex items-center gap-2 text-xs text-muted hover:text-text">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to dashboard
      </Link>

      <div className="mb-6">
        <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-pink">New Learning Path</div>
        <h1 className="mt-2 font-display text-3xl font-bold">Turn your material into a quest.</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
          Upload a PDF or PowerPoint. Questoriaa will extract the source, build chapters and concepts,
          create semantic embeddings, and prepare adaptive challenges grounded in your material.
          Selectable text only; scanned images need OCR outside Questoriaa. Keep material below 60,000 text characters / 200 chunks.
        </p>
      </div>

      <form onSubmit={submit} className="app-panel overflow-hidden">
        <div className="grid gap-0 lg:grid-cols-[1fr_320px]">
          <div className="space-y-5 p-6">
            <label className="block">
              <span className="text-xs font-semibold">Course title</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={busy}
                placeholder="e.g. Data Structures — Unit III"
                className="app-input mt-2 h-11 w-full rounded-xl px-4 text-sm"
                maxLength={200}
                required
              />
            </label>

            <label className="block">
              <span className="text-xs font-semibold">Description <span className="font-normal text-muted">(optional)</span></span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={busy}
                placeholder="What are you learning from this material?"
                className="app-input mt-2 min-h-28 w-full resize-y rounded-xl px-4 py-3 text-sm"
                maxLength={10000}
              />
            </label>

            <label className="block">
              <span className="text-xs font-semibold">Source material</span>
              <span className="mt-2 flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-5 py-8 text-center transition hover:border-pink/40 hover:bg-pink/[0.03]">
                <UploadCloud className="h-8 w-8 text-pink" />
                <span className="mt-3 text-sm font-semibold">{file ? file.name : "Choose PDF or PowerPoint"}</span>
                <span className="mt-1 text-xs text-muted">
                  {file ? `${(file.size / 1024 / 1024).toFixed(2)} MB selected` : "Text-based PDF/PPTX • up to 100 MB"}
                </span>
                <input
                  type="file"
                  accept=".pdf,.pptx,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                  className="sr-only"
                  disabled={busy}
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  required
                />
              </span>
            </label>

            {error && (
              <div role="alert" className="rounded-xl border border-pink/25 bg-pink/5 px-4 py-3 text-sm text-pink">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={busy || !title.trim() || !file}
              className="btn-pink inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {busy ? status || "Working…" : "Build My Course"}
            </button>
          </div>

          <aside className="border-t border-white/5 bg-bg/60 p-6 lg:border-l lg:border-t-0">
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan">What happens next</div>
            <ol className="mt-5 space-y-5">
              {[
                [FileText, "Extract", "Text is extracted while preserving page or slide locations."],
                [Sparkles, "Understand", "Qwen builds chapters, topics, concepts and prerequisites."],
                [Presentation, "Ground", "Qwen3 embeddings are stored in pgvector for source-aware retrieval."],
              ].map(([Icon, name, detail], index) => {
                const IconComponent = Icon as typeof FileText;
                return (
                  <li key={String(name)} className="flex gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5 text-cyan">
                      <IconComponent className="h-4 w-4" />
                    </span>
                    <div>
                      <div className="text-xs font-semibold">0{index + 1} · {String(name)}</div>
                      <p className="mt-1 text-[11px] leading-relaxed text-muted">{String(detail)}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </aside>
        </div>
      </form>
    </div>
  );
}
