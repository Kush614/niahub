import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { Analytics } from '@vercel/analytics/react';
import './globals.css';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { ConvexClientProvider } from '@/components/providers/ConvexClientProvider';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono', display: 'swap' });

export const metadata: Metadata = {
  title: 'NiaHub — The Nia Index Marketplace',
  description:
    'One line, perfect context. Subscribe to expert-curated Nia indexes from any MCP-compatible agent.',
  metadataBase: new URL('https://niahub.dev'),
  openGraph: {
    title: 'NiaHub — The Nia Index Marketplace',
    description:
      'Pre-indexed, continuously synced knowledge packs for Cursor, Claude Code, Codex, and any MCP agent.',
    url: 'https://niahub.dev',
    siteName: 'NiaHub',
    type: 'website',
  },
  icons: { icon: '/favicon.svg' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable}`}>
      <body className="min-h-screen bg-[var(--color-bg)] text-[var(--color-fg)]">
        <ConvexClientProvider>
          <SiteHeader />
          <main className="mx-auto max-w-6xl px-6 pb-24">{children}</main>
          <SiteFooter />
        </ConvexClientProvider>
        <Analytics />
      </body>
    </html>
  );
}
