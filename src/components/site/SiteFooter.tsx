// The public site's footer, on ink (homepage redesign 14/10/2026): four columns, then free help numbers, the
// general-information line and legal placeholders.
import Link from "next/link";
import { site } from "@/content/site";

const t = site.footer;

export function SiteFooter() {
  return (
    <footer className="bg-site-ink text-site-ink-muted">
      <div className="mx-auto flex max-w-[1180px] flex-col gap-t7 px-t4 pb-t7 pt-t8 min-[480px]:px-t5">
        <div className="grid gap-t6 min-[600px]:grid-cols-2 min-[901px]:grid-cols-4">
          <div className="flex flex-col gap-t2">
            <span className="text-[1.375rem] font-extrabold tracking-[-0.02em] text-site-ink-on">{site.name}</span>
            <p className="max-w-[32ch] text-body14 leading-relaxed">{t.tagline}</p>
          </div>
          {t.columns.map((c) => (
            <nav key={c.title} aria-label={c.title} className="flex flex-col">
              <h2 className="mb-t1 text-body14 font-extrabold text-site-ink-on">{c.title}</h2>
              {c.links.map((l) => (
                <Link key={l.label} href={l.href} className="inline-flex min-h-tap items-center self-start rounded-sm text-body14 hover:text-site-ink-on focus-visible:outline focus-visible:outline-2 focus-visible:outline-site-ink-on">{l.label}</Link>
              ))}
            </nav>
          ))}
        </div>
        <div className="flex flex-col gap-t2 border-t border-site-ink-line pt-t5 text-[0.8125rem] leading-[1.7]">
          <p className="font-semibold text-site-ink-on">{t.help}</p>
          <p>{t.general}</p>
          {/* TODO(launch): Tippla's company name and ABN, and links to the privacy policy, terms and complaints process. */}
          <p>{t.legal}</p>
          <p>{t.copyright(new Date().getFullYear())}</p>
        </div>
      </div>
    </footer>
  );
}
