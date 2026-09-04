import type { Metadata, Viewport } from 'next';
import { Space_Grotesk, Inter } from 'next/font/google';
import './globals.css';
import Sidebar from '@/components/Sidebar';

const display = Space_Grotesk({
  subsets: ['latin'],
  weight: ['500', '700'],
  variable: '--font-display',
  display: 'swap',
});

const sans = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://huntboard-nu.vercel.app'),
  title: {
    default: 'Huntboard',
    template: '%s, Huntboard',
  },
  description: 'Your job search, reviewed before it sends.',
  manifest: '/manifest.json',
  icons: { icon: '/icon.svg' },
  openGraph: {
    title: 'Huntboard',
    description: 'Your job search, reviewed before it sends.',
    url: 'https://huntboard-nu.vercel.app',
    siteName: 'Huntboard',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Huntboard',
    description: 'Your job search, reviewed before it sends.',
  },
};

export const viewport: Viewport = {
  themeColor: '#0A0E17',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <body className="bg-bg text-text font-sans min-h-screen">
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </body>
    </html>
  );
}
