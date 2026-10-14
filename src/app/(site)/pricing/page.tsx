// Pricing (public): one plan, one price (config/plans PRICE_PER_MONTH, the same figure the app charges).
import type { Metadata } from "next";
import { Check } from "lucide-react";
import { site } from "@/content/site";
import { PRICE_PER_MONTH } from "@/config/plans";
import { formatCents } from "@/lib/format";
import { PageHead, Section, StartButton } from "@/components/site/Bits";

const t = site.pricing;
export const metadata: Metadata = { title: t.meta.title, description: t.meta.description };

export default function PricingPage() {
  return (
    <>
      <Section><PageHead title={t.title} /></Section>
      <Section className="pt-0">
        <div className="grid gap-t5 min-[900px]:grid-cols-[1fr_1.2fr]">
          <div data-testid="price-card" className="flex flex-col gap-t4 rounded-card-s bg-surface p-t6 shadow-card sm:rounded-card">
            <p className="flex items-baseline gap-t2"><span className="tnum text-[3rem] font-extrabold leading-none tracking-[-0.03em]">{formatCents(PRICE_PER_MONTH)}</span><span className="text-body text-text-secondary">{t.per}</span></p>
            <ul className="flex flex-col gap-t2">
              {t.includes.map((i) => <li key={i} className="flex items-start gap-t2 text-body14"><Check aria-hidden size={18} className="mt-[1px] shrink-0 text-accent-strong" />{i}</li>)}
            </ul>
            <StartButton size="large" className="self-start">{t.start}</StartButton>
          </div>
          <ul className="flex flex-col gap-t3">
            {t.terms.map((x) => (
              <li key={x.title} className="flex flex-col gap-t1 rounded-[16px] border border-line bg-bg p-t4">
                <h2 className="text-body font-extrabold">{x.title}</h2>
                <p className="text-body14 text-text-secondary">{x.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </Section>
    </>
  );
}
