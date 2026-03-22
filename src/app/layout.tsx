import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Escalation Risks Tracker',
  description: 'Monitor at-risk Rocketlane projects for customer escalation signals',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
