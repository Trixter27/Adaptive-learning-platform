import type { Metadata } from "next";
import SettingsView from "@/components/app/SettingsView";

export const metadata: Metadata = {
  title: "Settings — QUESTORIAA",
};

export default function SettingsPage() {
  return <SettingsView />;
}
