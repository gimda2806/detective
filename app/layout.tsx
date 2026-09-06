import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Detective Case',
  description: 'AI GM과 함께 진행하는 한국어 추리 게임',
};

// Home-screen install (PWA): app/manifest.json + app/icon.png + app/apple-icon.png
// are auto-discovered by vinext's file-based metadata and injected into <head>.
// themeColor here covers the browser chrome tint outside of standalone mode;
// manifest.json's own theme_color/background_color apply once installed.
export const viewport: Viewport = {
  themeColor: '#17645f',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
