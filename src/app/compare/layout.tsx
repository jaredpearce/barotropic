import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Compare - Barotropic',
  description: 'Compare NWS and Open-Meteo model guidance on one timeline.',
};

export default function CompareLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
