import type { Metadata } from "next";
import CourseMapView from "@/components/app/CourseMapView";

export const metadata: Metadata = { title: "Course Map — QUESTORIAA" };

export default async function CoursePage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  return <CourseMapView key={courseId} courseId={courseId} />;
}
