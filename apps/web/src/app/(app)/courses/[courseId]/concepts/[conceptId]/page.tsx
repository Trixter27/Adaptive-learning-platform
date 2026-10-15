import type { Metadata } from "next";
import ConceptQuestView from "@/components/app/ConceptQuestView";

export const metadata: Metadata = { title: "Adaptive Quest — QUESTORIAA" };

export default async function ConceptPage({
  params,
}: {
  params: Promise<{ courseId: string; conceptId: string }>;
}) {
  const { courseId, conceptId } = await params;
  return <ConceptQuestView key={`${courseId}:${conceptId}`} courseId={courseId} conceptId={conceptId} />;
}
