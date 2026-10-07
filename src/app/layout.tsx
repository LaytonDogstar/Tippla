import type { Metadata, Viewport } from "next";
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
  width: "device-width", initialScale: 1, viewportFit: "cover",
  themeColor: [{ media: "(prefers-color-scheme: light)", color: "#F5F6FB" }, { media: "(prefers-color-scheme: dark)", color: "#0E1024" }],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-AU" suppressHydrationWarning>
      <head>
        {/* Apply the saved theme before paint (Account › Profile › Appearance). */}
        <script dangerouslySetInnerHTML={{ __html: "try{var t=localStorage.getItem('tippla-theme');if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t)}catch(e){}" }} />
        {/* Manrope is self-hosted (public/fonts, SIL Open Font License): no third-party request before first paint. */}
        <link rel="preload" href="/fonts/manrope-latin.woff2" as="font" type="font/woff2" crossOrigin="" />
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
