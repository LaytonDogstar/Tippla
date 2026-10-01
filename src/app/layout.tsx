import type { Metadata, Viewport } from "next";
import fonts from "@/styles/fonts.json";
import "@/styles/globals.css";
import { Providers } from "@/components/Providers";

export const metadata: Metadata = {
  title: "Tippla",
  description: "See what's shaping your SmartScore and what would change a lender's answer.",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-AU" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* Families come from the design tokens; see scripts/tokens-to-css.mjs. */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href={fonts.href} />
      </head>
      <body className="min-h-screen antialiased">
        {/* Sheets portal outside #app-root and make it inert while open. */}
        <div id="app-root">
          <Providers>{children}</Providers>
        </div>
      </body>
    </html>
  );
}
