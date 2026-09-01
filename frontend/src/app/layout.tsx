import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'VAIC — Voice AI Incident Commander',
  description: 'Real-time AI-powered incident management co-pilot',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
