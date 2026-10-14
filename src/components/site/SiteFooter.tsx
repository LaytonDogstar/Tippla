// The public site's footer: page links, free help numbers, the general-information line and legal placeholders.
import Link from "next/link";
import { site } from "@/content/site";

const t = site.footer;

export function SiteFooter() {
  return (
    <footer className="mt-t8 border-t border-line bg-surface">
      <div className="mx-auto flex max-w-[1120px] flex-col gap-t6 px-t4 py-t7">
        <div className="grid gap-t6 min-[720px]:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="flex flex-col gap-t2">
            <span className="text-[1.25rem] font-extrabold tracking-[-0.02em] text-text">{site.name}</span>
            <p className="max-w-[32ch] text-body14 text-text-secondary">{t.tagline}</p>
          </div>
          {t.columns.map((c) => (
            <nav key={c.title} aria-label={c.title} className="flex flex-col gap-[2px]">
              <h2 className="mb-t1 text-meta font-bold text-text">{c.title}</h2>
              {c.links.map((l) => <Link key={l.href} href={l.href} className="inline-flex min-h-tap items-center text-body14 text-text-secondary hover:text-text">{l.label}</Link>)}
            </nav>
          ))}
        </div>
        <div className="flex flex-col gap-t2 border-t border-line pt-t5 text-meta text-text-muted">
          <p className="font-semibold text-text-secondary">{t.help}</p>
          <p>{t.general}</p>
          <p>{t.legal}</p>
          <p>{t.copyright(new Date().getFullYear())}</p>
        </div>
      </div>
    </footer>
  );
}
