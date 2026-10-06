import type { Metadata, Viewport } from "next";
import fonts from "@/styles/fonts.json";
import "@/styles/globals.css";
import { Providers } from "@/components/Providers";
import { ServiceWorkerRegistration } from "@/components/notify/ServiceWorker";

export const metadata: Metadata = {
  title: "Tippla",
  description: "See what's shaping your SmartScore and what would change a lender's answer.",
  appleWebApp: { capable: true, title: "Tippla", statusBarStyle: "default" },
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
};
export const viewport: Viewport = {
  width: "device-width", initialScale: 1,
  themeColor: [{ media: "(prefers-color-scheme: light)", color: "#FBFCFF" }, { media: "(prefers-color-scheme: dark)", color: "#14161A" }],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-AU" suppressHydrationWarning>
      <head>
        {/* Apply the saved theme before paint (Account › Profile › Appearance). */}
        <script dangerouslySetInnerHTML={{ __html: "try{var t=localStorage.getItem('tippla-theme');if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t)}catch(e){}" }} />
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
          <ServiceWorkerRegistration />
        </div>
      </body>
    </html>
  );
}
