// Security and privacy (public). TaleFin's claims are quoted from its own website; Tippla's own statement is a
// placeholder for counsel. Nothing here goes beyond what's sourced.
import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { site } from "@/content/site";
import { PageHead, Section } from "@/components/site/Bits";

const t = site.security;
export const metadata: Metadata = { title: t.meta.title, description: t.meta.description };

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-t2 rounded-[16px] bg-surface p-t5 shadow-card">
      <h2 className="text-body font-extrabold">{title}</h2>
      {children}
    </div>
  );
}

export default function SecurityPage() {
  return (
    <>
      <Section><PageHead title={t.title} lead={t.lead} /></Section>
      <Section className="pt-0">
        <div className="grid gap-t4 min-[900px]:grid-cols-2">
          <Block title={t.bankTitle}>
            <p className="text-body14 text-text-secondary">{t.bankBody}</p>
            <ul className="flex flex-col gap-t2">
              {t.talefin.map((c) => <li key={c} className="flex items-start gap-t2 text-body14"><ShieldCheck aria-hidden size={18} className="mt-[1px] shrink-0 text-accent-strong" />{c}</li>)}
            </ul>
            <p className="text-meta text-text-muted">{t.source}</p>
          </Block>
          <div className="flex flex-col gap-t4">
            <Block title={t.seeTitle}><p className="text-body14 text-text-secondary">{t.see}</p></Block>
            <Block title={t.neverTitle}><p className="text-body14 text-text-secondary">{t.never}</p></Block>
            <Block title={t.whoTitle}><p className="text-body14 text-text-secondary">{t.who}</p></Block>
          </div>
          <Block title={t.deleteTitle}><p className="text-body14 text-text-secondary">{t.delete}</p></Block>
          <Block title={t.ownTitle}>
            <span className="self-start rounded-pill bg-caution-soft px-t2 py-[2px] text-meta-s font-bold text-caution">{t.placeholder}</span>
            <p className="text-body14 text-text-secondary">{t.own}</p>
          </Block>
        </div>
      </Section>
    </>
  );
}
