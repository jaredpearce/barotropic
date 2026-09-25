import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard - Barotropic",
  description: "Weather forecasting dashboard with evidence-based analysis.",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
