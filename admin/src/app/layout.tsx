import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'Croe Admin',
  description: 'Croe Trust & Escrow Administration Dashboard',
};

export const viewport: Viewport = {
  themeColor: '#EEF3F9',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="font-sans" suppressHydrationWarning>
      <body className="min-h-screen bg-page" suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
