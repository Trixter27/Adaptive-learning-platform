import type { Metadata } from "next";
import QuestsView from "@/components/app/QuestsView";

export const metadata: Metadata = {
  title: "Quests — QUESTORIAA",
};

export default function QuestsPage() {
  return <QuestsView />;
}
