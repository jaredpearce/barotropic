import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Settings - Barotropic',
  description: 'Units, navigation appearance, and location preferences.',
};

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
