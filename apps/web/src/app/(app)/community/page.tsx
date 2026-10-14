import type { Metadata } from "next";
import CommunityView from "@/components/app/CommunityView";

export const metadata: Metadata = {
  title: "Community — QUESTORIAA",
};

export default function CommunityPage() {
  return <CommunityView />;
}
