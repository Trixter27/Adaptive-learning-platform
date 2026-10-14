import type { Metadata } from "next";
import ProcessingView from "@/components/app/ProcessingView";

export const metadata: Metadata = { title: "Processing Course — QUESTORIAA" };

export default async function ProcessingPage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ job?: string | string[] }>;
}) {
  const { courseId } = await params;
  const { job = "" } = await searchParams;
  const jobId = typeof job === "string" ? job : "";
  return <ProcessingView key={`${courseId}:${jobId}`} courseId={courseId} jobId={jobId} />;
}
