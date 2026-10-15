import type { Metadata } from "next";
import LibraryView from "@/components/app/LibraryView";

export const metadata: Metadata = {
  title: "Library — QUESTORIAA",
};

export default function LibraryPage() {
  return <LibraryView />;
}
