import type { Metadata } from "next";
import AchievementsView from "@/components/app/AchievementsView";

export const metadata: Metadata = {
  title: "Achievements — QUESTORIAA",
};

export default function AchievementsPage() {
  return <AchievementsView />;
}
