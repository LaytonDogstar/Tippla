"use client";
import { ChevronRight, ExternalLink, Info, Layers, MessageCircle, Phone, Settings, type LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { track } from "@/lib/analytics/client";
import { hardshipPage as t } from "@/content/account";
import { NDH } from "@/config/services";
import { SupportOptions } from "@/components/domain/SupportOptions";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Feedback";
import { SampleTag } from "@/components/ui/SampleTag";
import { Toggle } from "@/components/ui/Form";
import { statesCopy } from "@/content/states";
import { useAccount } from "@/lib/account/client";
import type { AccountState } from "@/lib/account/state";
import type { PersonaId } from "@/lib/api/types";
import { Sheet } from "@/components/ui/Sheet";
import { cx } from "@/components/ui/cx";

type SheetId = "template" | "counselling" | "gambling" | null;

export function HardshipInfoButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" aria-label={t.info} onClick={() => setOpen(true)} className="inline-flex h-[48px] w-[48px] items-center justify-center rounded-pill bg-surface2 text-text hover:bg-neutral-soft">
        <Info aria-hidden size={24} />
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title={t.info}>
        <div className="flex flex-col gap-t3">{t.infoBody.map((p) => <p key={p} className="text-body text-text-muted">{p}</p>)}</div>
      </Sheet>
    </>
  );
}

export function HardshipView({ persona, account: initial, present, lenders }: { persona: PersonaId; account: AccountState; present: boolean; lenders: string[] }) {
  const { account, save } = useAccount(persona, initial);
  const router = useRouter();
  const toast = useToast();
  const [sheet, setSheet] = useState<SheetId>(null);
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
    { id: "lender", icon: MessageCircle, ...t.lender, onClick: () => { track("hardship_letter_started", {}); setSheet("template"); }, soft: true },
    { id: "counselling", icon: Phone, ...t.counselling, onClick: () => setSheet("counselling") },
    { id: "tippla", icon: Settings, ...t.tippla, onClick: () => router.push("/account/subscription") },
    { id: "gambling", icon: Layers, ...t.gambling, onClick: () => setSheet("gambling") },
  ];

  return (
    <div className="pb-t6">
      <p className="mt-t2 text-h1 font-display text-text">{t.opener}</p>
      <p className="mt-t2 text-body text-text-muted">{t.scoreNote} <SampleTag q="Q8" present={present} /></p>
      <ul className="mt-t5 flex flex-col gap-t3">
        {cards.map((c) => (
          <li key={c.id}>
            <section aria-labelledby={`h-${c.id}`} className={cx("rounded-md p-t4", c.soft ? "bg-accent-soft" : "bg-surface")}>
              <div className="flex items-start gap-t3">
                <span aria-hidden className="inline-flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-sm bg-surface2 text-neutral"><c.icon size={24} /></span>
                <div className="min-w-0 flex-1">
                  <h2 id={`h-${c.id}`} className="text-h3 text-text">{c.title}</h2>
                  <p className="mt-t1 text-small text-text-muted">{c.body}</p>
                </div>
              </div>
              <button type="button" onClick={c.onClick} className="mt-t3 flex min-h-tap w-full items-center justify-between rounded-sm pl-[52px] text-small text-accent hover:bg-surface2">
                {c.action}<ChevronRight aria-hidden size={20} />
              </button>
            </section>
          </li>
        ))}
      </ul>

      <section className="mt-t4 rounded-md bg-surface p-t4">
        <Toggle label={statesCopy.hardshipSelf.label} checked={!!account.hardshipSelfSelected}
          onChange={(v) => save({ ...account, hardshipSelfSelected: v || undefined })} />
        {account.hardshipSelfSelected && <p role="status" className="mt-t1 px-t1 text-small text-text-muted">{statesCopy.hardshipSelf.on}</p>}
      </section>

      <Sheet open={sheet === "template"} onClose={() => setSheet(null)} title={t.template.title}
        footer={<>
          <Button full onClick={copyMessage}>{t.template.copy}</Button>
          <Button full variant="tertiary" onClick={() => { setDraft(t.template.body); setCopyFailed(false); setSheet(null); }}>{t.template.cancel}</Button>
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
