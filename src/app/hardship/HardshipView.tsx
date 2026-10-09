"use client";
import { HardshipLetter, type LetterPrefill } from "@/components/domain/HardshipLetter";
import { letterCopy as lc } from "@/content/actions";
import { ChevronRight, ExternalLink, Info, Layers, MessageCircle, Phone, Settings, type LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { track } from "@/lib/analytics/client";
import { hardshipPage as t } from "@/content/account";
import { NDH } from "@/config/services";
import { SupportOptions } from "@/components/domain/SupportOptions";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Feedback";
import { SampleTag } from "@/components/ui/SampleTag";
import { Toggle } from "@/components/ui/Form";
import { CardLink } from "@/components/ui/CardLink";
import { PageColumns } from "@/components/shell/PageColumns";
import { statesCopy } from "@/content/states";
import { useAccount } from "@/lib/account/client";
import type { AccountState } from "@/lib/account/state";
import type { PersonaId } from "@/lib/api/types";
import { Sheet } from "@/components/ui/Sheet";
import { cx } from "@/components/ui/cx";

type SheetId = "template" | "counselling" | "gambling" | "followup" | null;

export function HardshipInfoButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" aria-label={t.info} onClick={() => setOpen(true)} className="inline-flex h-tap w-tap shrink-0 items-center justify-center rounded-pill bg-surface text-text-secondary shadow-card hover:text-text desktop:h-[48px] desktop:w-[48px]">
        <Info aria-hidden size={20} strokeWidth={1.8} />
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title={t.info}>
        <div className="flex flex-col gap-t3">{t.infoBody.map((p) => <p key={p} className="text-body text-text-muted">{p}</p>)}</div>
      </Sheet>
    </>
  );
}

export function HardshipView({ persona, account: initial, present, lenders, asOf, letter = null, followup = null }: {
  persona: PersonaId; account: AccountState; present: boolean; lenders: string[]; asOf: string;
  /** Spec 06: the pre-filled letter (null: the plain template), and a lender to ask "Did you hear back?" about. */
  letter?: { prefill: LetterPrefill[]; name: string } | null; followup?: string | null;
}) {
  const { account, save, update } = useAccount(persona, initial);
  // Opening Hardship support this pay cycle means Tippla offers its own pause openly (spec 03 §8).
  useEffect(() => {
    track("pause_offered", { source: "hardship" });
    if (initial.hardshipVisitedAt !== asOf) update((l) => ({ ...l, hardshipVisitedAt: asOf }));
  }, [asOf]); // eslint-disable-line react-hooks/exhaustive-deps
  const router = useRouter();
  const toast = useToast();
  const [sheet, setSheet] = useState<SheetId>(followup ? "followup" : null);
  const [outcome, setOutcome] = useState<string | null>(null);
  const letterDone = (lender: string, output: "copy" | "email" | "pdf") =>
    update((l) => ({ ...l, hardshipLetters: [...(l.hardshipLetters ?? []).filter((x) => x.lender !== lender), { lender, at: asOf, output }] }));
  const answer = (o: "agreed" | "declined" | "not_yet") => {
    track("hardship_followup_answered", { outcome: o });
    setOutcome(o);
    update((l) => ({ ...l, hardshipLetters: (l.hardshipLetters ?? []).map((x) => (x.lender === followup ? { ...x, outcome: o, answeredAt: asOf } : x)) }));
  };
  const [draft, setDraft] = useState<string>(t.template.body);
  const [copyFailed, setCopyFailed] = useState(false);
  const fieldId = useId();

  const copyMessage = async () => {
    try {
      await navigator.clipboard.writeText(draft);
      setCopyFailed(false);
      track("hardship_letter_completed", { output: "copy" });
      toast({ kind: "confirm", message: t.template.copied });
    } catch {
      setCopyFailed(true);
    }
  };

  const cards: { id: string; icon: LucideIcon; title: string; body: string; action: string; onClick: () => void; soft?: boolean }[] = [
    { id: "lender", icon: MessageCircle, ...t.lender, ...(letter ? { action: lc.start } : {}), onClick: () => { if (!letter) track("hardship_letter_started", {}); setSheet("template"); }, soft: true },
    { id: "counselling", icon: Phone, ...t.counselling, onClick: () => setSheet("counselling") },
    { id: "tippla", icon: Settings, ...t.tippla, onClick: () => router.push("/account/subscription") },
    { id: "gambling", icon: Layers, ...t.gambling, onClick: () => setSheet("gambling") },
  ];

  const rail = (
    <>
      <section aria-labelledby="ndh-h" className="rounded-card-s bg-surface p-t5 shadow-card sm:rounded-card">
        <h2 id="ndh-h" className="text-card text-text sm:text-card-l">{t.rail.ndhTitle}</h2>
        <p className="mt-t1 text-body14 text-text-secondary">{NDH.name}. {t.rail.ndhBody}</p>
        <p className="tnum mt-t3 text-section-num text-text">{NDH.phoneDisplay}</p>
        <p className="text-meta text-text-muted">{NDH.hours}</p>
        <div className="mt-t3 flex flex-wrap gap-t2">
          <a href={NDH.tel} className="inline-flex min-h-tap items-center gap-t2 rounded-pill bg-accent-soft px-t4 text-body14 font-bold text-accent-strong hover:bg-accent-tint2"><Phone aria-hidden size={16} />{t.rail.call(NDH.phoneDisplay)}</a>
          <a href={NDH.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-tap items-center gap-t1 px-t2 text-body14 font-semibold text-accent">{t.rail.website}<ExternalLink aria-hidden size={14} /></a>
        </div>
      </section>
      <section aria-labelledby="expect-h" className="rounded-card-s bg-surface p-t5 shadow-card sm:rounded-card">
        <h2 id="expect-h" className="text-card text-text sm:text-card-l">{t.rail.expectTitle}</h2>
        <ol className="mt-t3 flex flex-col gap-t3">
          {t.rail.expect.map((x, i) => (
            <li key={x} className="flex gap-t3 text-body14 text-text-secondary">
              <span aria-hidden className="tnum flex min-h-[24px] min-w-[24px] shrink-0 items-center justify-center self-start rounded-pill bg-accent-soft px-[6px] text-meta font-bold text-accent-strong">{i + 1}</span>{x}
            </li>
          ))}
        </ol>
      </section>
    </>
  );

  return (
    <div className="pb-t6">
      <PageColumns railLabel={t.rail.label} rail={rail} main={<>
      <p className="mt-t2 text-h1 font-display text-text">{t.opener}</p>
      <p className="mt-t2 text-body text-text-muted">{t.scoreNote} <SampleTag q="Q8" present={present} /></p>
      <p className="mt-t1 text-body14 text-text-secondary">{t.creditReportNote}</p>
      <ul className="mt-t5 flex flex-col gap-t3">
        {cards.map((c) => (
          <li key={c.id}>
            {/* Whole card is the target, with a chevron; the title says what it is (UX round 2, 3.4). */}
            <CardLink icon={c.icon} title={c.title} body={c.body} soft={c.soft} onClick={c.onClick} ariaLabel={`${c.title}: ${c.action}`} />
          </li>
        ))}
      </ul>

      <section className="mt-t4 rounded-card-s bg-surface shadow-card sm:rounded-card p-t4">
        <Toggle label={statesCopy.hardshipSelf.label} description={statesCopy.hardshipSelf.description} checked={!!account.hardshipSelfSelected}
          onChange={(v) => {
            update((l) => ({ ...l, hardshipSelfSelected: v || undefined }));
            toast({ kind: "confirm", message: v ? statesCopy.hardshipSelf.toastOn : statesCopy.hardshipSelf.toastOff });
          }} />
        {account.hardshipSelfSelected && <p role="status" className="mt-t1 px-t1 text-small text-text-muted">{statesCopy.hardshipSelf.on}</p>}
      </section>
      </>} />

      {letter && (
        <Sheet open={sheet === "template"} onClose={() => setSheet(null)} title={lc.title}>
          <HardshipLetter prefill={letter.prefill} name={letter.name} onDone={letterDone} />
        </Sheet>
      )}
      {followup && (
        <Sheet open={sheet === "followup"} onClose={() => setSheet(null)} title={lc.followup.title(followup)}>
          {!outcome ? (
            <div className="flex flex-col gap-t2">
              <p className="text-body text-text-muted">{lc.followup.body}</p>
              {(["agreed", "declined", "not_yet"] as const).map((o) => <Button key={o} full variant="secondary" onClick={() => answer(o)}>{lc.followup.answers[o]}</Button>)}
            </div>
          ) : (
            <div role="status" className="flex flex-col gap-t3">
              <p className="text-body text-text">{outcome === "agreed" ? lc.followup.agreed : outcome === "declined" ? lc.followup.declined : lc.followup.notYet}</p>
              {outcome === "declined" && <a href={NDH.tel} className="flex min-h-[48px] items-center justify-center rounded-sm bg-accent text-body-strong text-on-accent">{t.ndh.call(NDH.phoneDisplay)}</a>}
            </div>
          )}
        </Sheet>
      )}
      <Sheet open={!letter && sheet === "template"} onClose={() => setSheet(null)} title={t.template.title}
        footer={<>
          <Button full onClick={copyMessage}>{t.template.copy}</Button>
          <Button full variant="link" onClick={() => { setDraft(t.template.body); setCopyFailed(false); setSheet(null); }}>{t.template.cancel}</Button>
        </>}>
        <p className="text-body text-text-muted">{t.template.intro}</p>
        {lenders.length > 0 && <p className="mt-t2 text-small text-text-muted">{t.template.yourLenders(lenders.join(", "))}</p>}
        <label htmlFor={fieldId} className="mt-t4 block text-h3 text-text">{t.template.label}</label>
        <textarea id={fieldId} value={draft} onChange={(e) => setDraft(e.target.value)} rows={12}
          className="mt-t2 w-full rounded-sm border border-neutral bg-surface p-t4 text-body text-text focus:border-accent focus:outline focus:outline-[length:var(--focus-width)] focus:outline-offset-[var(--focus-offset)] focus:outline-focus" />
        {copyFailed && <p role="status" className="mt-t2 text-small text-text">{t.template.copyFailed}</p>}
      </Sheet>

      <Sheet open={sheet === "counselling"} onClose={() => setSheet(null)} title={t.ndh.title}
        footer={<Button full variant="tertiary" onClick={() => setSheet(null)}>{t.ndh.notNow}</Button>}>
        <h3 className="text-h3 text-text">{NDH.name}</h3>
        <p className="mt-t2 text-body text-text-muted">{t.ndh.body}</p>
        <a href={NDH.tel} className="mt-t5 flex min-h-[48px] w-full items-center py-t2 text-center justify-center rounded-sm bg-accent text-body-strong text-on-accent hover:opacity-90">{t.ndh.call(NDH.phoneDisplay)}</a>
        <p className="mt-t2 select-text text-center text-small text-text-muted">{NDH.hours}</p>
        <a href={NDH.url} target="_blank" rel="noopener noreferrer" className="mt-t5 flex min-h-[48px] w-full items-center py-t2 text-center justify-center gap-t2 rounded-sm bg-accent-soft text-body-strong text-accent hover:shadow-[inset_0_0_0_2px_var(--color-accent)]">
          {t.ndh.visit}<ExternalLink aria-hidden size={16} />
        </a>
        <p className="mt-t2 text-caption text-text-muted">{t.ndh.visitNote}</p>
      </Sheet>

      <Sheet open={sheet === "gambling"} onClose={() => setSheet(null)} title={t.gambling.title}
        footer={<Button full variant="tertiary" onClick={() => setSheet(null)}>{t.notNow}</Button>}>
        <SupportOptions />
      </Sheet>
    </div>
  );
}
