import type { Metadata } from "next";
import AppShell from "@/components/app/AppShell";

export const metadata: Metadata = {
  title: "Questoriaa Cockpit",
};

export default function AppSectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
