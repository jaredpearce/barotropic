import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Forecasts - Barotropic",
  description: "Manage and view your weather forecasts.",
};

export default function ForecastsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
