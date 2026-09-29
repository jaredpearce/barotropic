import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "Barotropic - Weather Intelligence Platform",
  description:
    "Weather forecasting as a process of examining evidence, recognizing atmospheric patterns, forming hypotheses, and communicating forecasts.",
  keywords: [
    "weather",
    "forecast",
    "meteorology",
    "atmospheric",
    "patterns",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-background text-foreground antialiased">
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
