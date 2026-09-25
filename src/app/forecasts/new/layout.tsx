import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "New Forecast - Barotropic",
  description: "Create a new weather forecast analysis.",
};

export default function NewForecastLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
