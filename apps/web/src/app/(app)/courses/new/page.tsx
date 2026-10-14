import type { Metadata } from "next";
import CreateCourseView from "@/components/app/CreateCourseView";

export const metadata: Metadata = { title: "Create Course — QUESTORIAA" };

export default function CreateCoursePage() {
  return <CreateCourseView />;
}
