import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'EDITH — Voice AI Incident Commander',
  description: 'Real-time AI-powered incident management co-pilot and responder bridge',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#0B0C0E',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
