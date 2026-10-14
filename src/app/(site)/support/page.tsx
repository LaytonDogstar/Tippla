// Free help and support (public): no membership needed.
import type { Metadata } from "next";
import { ExternalLink, Phone } from "lucide-react";
import { site } from "@/content/site";
import { PageHead, Section } from "@/components/site/Bits";

const t = site.support;
export const metadata: Metadata = { title: t.meta.title, description: t.meta.description };

export default function SupportPage() {
  const linkCls = "inline-flex min-h-tap items-center gap-t1 rounded-pill text-body14 font-bold text-accent-strong underline-offset-2 hover:underline";
  return (
    <>
      <Section><PageHead title={t.title} lead={t.lead} /></Section>
      <Section className="pt-0">
        <ul className="grid gap-t4 min-[900px]:grid-cols-3">
          {t.items.map((i) => (
            <li key={i.title} className="flex flex-col gap-t2 rounded-[16px] bg-surface p-t5 shadow-card">
              <h2 className="text-body font-extrabold">{i.title}</h2>
              <p className="flex-1 text-body14 text-text-secondary">{i.body}</p>
              <div className="flex flex-wrap gap-x-t4">
                {i.tel && i.href && <a href={i.href} className={linkCls}><Phone aria-hidden size={16} />{i.tel}</a>}
                <a href={i.web} target="_blank" rel="noopener noreferrer" className={linkCls}>{i.webLabel}<ExternalLink aria-hidden size={14} /><span className="sr-only">{t.opensIn}</span></a>
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-t6 flex max-w-[720px] flex-col gap-t2 rounded-[16px] bg-accent-soft p-t5">
          <h2 className="text-body font-extrabold">{t.hardshipTitle}</h2>
          <p className="text-body14 text-text">{t.hardship}</p>
        </div>
      </Section>
    </>
  );
}
