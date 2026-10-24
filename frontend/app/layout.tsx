import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { TopProgressBar } from "@/components/ui/TopProgressBar";

export const metadata: Metadata = {
  title: "DeepTrace Forensics | Police Media Authenticity Verification",
  description: "Law enforcement evidence screening platform for estimating synthetic AI media likelihood with calibrated uncertainty.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body
        suppressHydrationWarning
        className="min-h-screen font-sans antialiased text-neutral-900 dark:text-neutral-100 bg-neutral-100 dark:bg-neutral-950 selection:bg-blue-600 selection:text-white"
      >
        <Suspense fallback={null}>
          <TopProgressBar />
        </Suspense>
        <div className="flex flex-col min-h-screen">
          <Navbar />
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-6 sm:py-8">
            {children}
          </main>

          <footer className="w-full border-t border-neutral-200 dark:border-neutral-850 py-4 px-4 sm:px-8 bg-neutral-100 dark:bg-neutral-950 text-center text-xs text-neutral-500">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
              <div>
                <b>DeepTrace Forensic Screening Division</b> • Law Enforcement Restricted Network
              </div>
              <div>
                NIST FIPS 180-4 SHA-256 Validated • Neyman-Pearson Decision Boundaries
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
