import type { Metadata } from "next";
import "./globals.css";
import { QueryProvider } from "@/providers/query-provider";

export const metadata: Metadata = {
  title: "CrewUp - Connecting Skilled Trade Workers with Employers",
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
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}
