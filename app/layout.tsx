import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, DM_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-display',
  display: 'swap',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-sans',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Foolsgold — Agent Security Benchmark for Personal Finance',
  description:
    'Open-source, episode-based benchmark testing AI agents against indirect prompt injection, tool misuse, and data exfiltration inside a realistic personal-finance ledger.',
  openGraph: {
    title: 'Foolsgold — Agent Security Benchmark for Personal Finance',
    description:
      'Episode-based benchmark testing AI agents against indirect prompt injection, tool misuse, and data exfiltration inside a realistic personal-finance ledger.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Foolsgold — Agent Security Benchmark for Personal Finance',
    description:
      'Episode-based benchmark testing AI agents against indirect prompt injection, tool misuse, and data exfiltration.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${plusJakarta.variable} ${dmSans.variable} ${jetbrainsMono.variable}`}
    >
      <body
        suppressHydrationWarning
        className="min-h-screen bg-slate-50 font-sans text-slate-900 antialiased selection:bg-blue-100 selection:text-blue-950"
      >
        {children}
      </body>
    </html>
  );
}
