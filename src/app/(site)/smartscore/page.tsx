// How SmartScore works (public). Factor and stage names come from the portal's own copy, so they always match.
import type { Metadata } from "next";
import { site } from "@/content/site";
import { factorCopy, stageNames } from "@/content/en-AU";
import { PageHead, Section, StartButton } from "@/components/site/Bits";

const t = site.smartscore;
export const metadata: Metadata = { title: t.meta.title, description: t.meta.description };

export default function SmartScorePage() {
  const stageIds = Object.keys(stageNames) as (keyof typeof stageNames)[];
  return (
    <>
      <Section><PageHead title={t.title} lead={t.lead} /></Section>
      <Section tone="surface" label="stages-h">
        <h2 id="stages-h" className="text-[1.5rem] font-extrabold tracking-[-0.02em]">{t.stagesTitle}</h2>
        <p className="mt-t2 max-w-[60ch] text-body text-text-secondary">{t.stagesBody}</p>
        <ol className="mt-t5 grid gap-t3 min-[560px]:grid-cols-2 min-[900px]:grid-cols-4">
          {stageIds.map((id, i) => (
            <li key={id} className="flex flex-col gap-t2 rounded-[16px] border border-line bg-bg p-t4">
              <span aria-hidden className="h-[6px] w-full rounded-pill" style={{ background: `var(--band-${id})` }} />
              <span className="text-meta font-bold text-text-muted">{t.stageOf(i + 1, stageIds.length)}</span>
              <h3 className="text-body font-extrabold">{stageNames[id]}</h3>
              <p className="text-body14 text-text-secondary">{t.stages[i]?.body}</p>
            </li>
          ))}
        </ol>
      </Section>
      <Section label="factors-h">
        <h2 id="factors-h" className="text-[1.5rem] font-extrabold tracking-[-0.02em]">{t.factorsTitle}</h2>
        <p className="mt-t2 max-w-[60ch] text-body text-text-secondary">{t.factorsBody}</p>
        <ul className="mt-t5 grid gap-t3 min-[560px]:grid-cols-2 min-[900px]:grid-cols-3">
          {Object.values(factorCopy).map((f) => (
            <li key={f.name} className="flex flex-col gap-t1 rounded-[16px] bg-surface p-t4 shadow-card">
              <h3 className="text-body font-extrabold">{f.name}</h3>
              <p className="text-body14 text-text-secondary">{f.explains}</p>
            </li>
          ))}
        </ul>
      </Section>
      <Section tone="surface" label="not-h">
        <h2 id="not-h" className="text-[1.5rem] font-extrabold tracking-[-0.02em]">{t.notTitle}</h2>
        <ul className="mt-t4 flex max-w-[70ch] flex-col gap-t2">
          {t.not.map((n) => <li key={n} className="text-body text-text-secondary">{n}</li>)}
        </ul>
        <StartButton size="large" className="mt-t6">{site.home.start}</StartButton>
      </Section>
    </>
  );
}
