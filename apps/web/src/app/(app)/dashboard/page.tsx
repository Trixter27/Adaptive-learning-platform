import type { Metadata } from "next";
import DashboardView from "@/components/app/DashboardView";

export const metadata: Metadata = {
  title: "Dashboard — QUESTORIAA",
};

export default function DashboardPage() {
  return <DashboardView />;
}
