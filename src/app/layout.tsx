import type { Metadata } from 'next';
import { Manrope } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import TopNavigation from '@/components/TopNavigation';
// @ts-ignore CSS is loaded by Next.js and has no TypeScript declarations.
import '@/styles/globals.css';

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font_manrope',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Barotropic - Weather Intelligence Platform',
  description:
    'Weather forecasting as a process of examining evidence, recognizing atmospheric patterns, forming hypotheses, and communicating forecasts.',
  keywords: ['weather', 'forecast', 'meteorology', 'atmospheric', 'patterns'],
};

/**
 * Applies the persisted navigation theme before first paint so the light and
 * dark header variants do not flicker on load.
 */
const themeBootstrap = `(function(){try{var theme=localStorage.getItem('barotropic.theme');document.documentElement.dataset.theme=theme==='light'?'light':'dark';}catch(error){document.documentElement.dataset.theme='dark';}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html className={manrope.variable} data-theme="dark" lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body className="bg-background text-foreground antialiased">
        <div className="app-shell">
          <TopNavigation />
          <div className="app-shell-content">{children}</div>
        </div>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
