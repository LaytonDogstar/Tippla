// The public marketing site (14/10/2026): its own header and footer, no portal chrome, no persona or dev tools.
// Public: the middleware lets these paths past the preview password (lib/gate SITE_PATHS).
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { site } from "@/content/site";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-bg text-text">
      <a href="#site-main" className="sr-only focus:not-sr-only focus:absolute focus:left-t3 focus:top-t3 focus:z-30 focus:rounded-pill focus:bg-surface focus:px-t4 focus:py-t2">{site.skip}</a>
      <SiteHeader />
      <main id="site-main" className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
