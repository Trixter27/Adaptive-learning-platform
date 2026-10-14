import type { Metadata } from "next";
import ProcessingView from "@/components/app/ProcessingView";

export const metadata: Metadata = { title: "Processing Course — QUESTORIAA" };

export default async function ProcessingPage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ job?: string }>;
}) {
  const { courseId } = await params;
  const { job = "" } = await searchParams;
  return <ProcessingView courseId={courseId} jobId={job} />;
}
