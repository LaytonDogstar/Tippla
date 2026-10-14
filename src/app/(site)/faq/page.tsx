// FAQ (public): native disclosure so every answer works without JavaScript.
import type { Metadata } from "next";
import { ChevronDown } from "lucide-react";
import { site } from "@/content/site";
import { PageHead, Section, StartButton } from "@/components/site/Bits";

const t = site.faq;
export const metadata: Metadata = { title: t.meta.title, description: t.meta.description };

export default function FaqPage() {
  return (
    <>
      <Section><PageHead title={t.title} /></Section>
      <Section className="pt-0">
        <div className="max-w-[760px] divide-y divide-line rounded-[16px] bg-surface px-t5 shadow-card">
          {t.items.map((i) => (
            <details key={i.q} className="group py-t2">
              <summary className="flex min-h-tap cursor-pointer list-none items-center justify-between gap-t3 py-t2 text-body font-bold [&::-webkit-details-marker]:hidden">
                {i.q}<ChevronDown aria-hidden size={18} className="shrink-0 text-text-muted motion-safe:transition-transform group-open:rotate-180" />
              </summary>
              <p className="pb-t3 text-body14 leading-relaxed text-text-secondary">{i.a}</p>
            </details>
          ))}
        </div>
        <StartButton size="large" className="mt-t6">{site.home.start}</StartButton>
      </Section>
    </>
  );
}
