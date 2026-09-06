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
//
// viewportFit: 'cover' is required for env(safe-area-inset-*) to report
// anything but 0 — without it the safe-area padding in globals.css
// (.topbar, .composer) is inert. Needed because theme-color (above) makes
// Chrome/Safari extend page content edge-to-edge behind the status bar
// once their own toolbar collapses on scroll, instead of reserving that
// strip the way an untinted page normally would.
export const viewport: Viewport = {
  themeColor: '#17645f',
  viewportFit: 'cover',
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
