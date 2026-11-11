import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Track record - Barotropic',
  description: 'Verification results for past forecasts against NWS observations.',
};

export default function TrackRecordLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
