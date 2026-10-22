import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Current Conditions - Barotropic',
  description:
    'Live current conditions for temperature, feels-like, wind, pressure, and dewpoint.',
};

export default function ConditionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
