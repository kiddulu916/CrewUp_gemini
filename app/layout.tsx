import type { Metadata } from "next";
import "./globals.css";
import { QueryProvider } from "@/providers/query-provider";
import { ToastProvider } from "@/components/providers/toast-provider";
import { Analytics } from "@vercel/analytics/next";
import { ConsentBanner, AdScripts } from "@/components/ads";
import Script from "next/script";

export const metadata: Metadata = {
  title: "KrewUp - Connecting Skilled Trade Workers with Employers",
  description: "The premier job marketplace for skilled trade workers and contractors",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <QueryProvider>
          <ToastProvider>
            {children}
            <Analytics />
            <Script
              id="google-adsense"
              async
              strategy="afterInteractive"
              src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4807961095325796"
              crossOrigin="anonymous"
            />
            <ConsentBanner />
            <AdScripts />
          </ToastProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
