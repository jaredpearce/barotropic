import type { Metadata } from "next";
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
      <body className="bg-white text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}
