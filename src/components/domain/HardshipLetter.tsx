"use client";
// Spec 06 §1: the hardship letter, pre-filled from what Tippla can see (lender, repayment, date, name), with
// optional guided questions, assembled in plain English, then copy / email draft / PDF. Tippla never sends.
import { useEffect, useId, useState } from "react";
import { letterCopy as t } from "@/content/actions";
import { formatShortDay } from "@/lib/format";
import { buildLetter, mailtoFor } from "@/lib/hardship/letter";
import type { LenderEntry } from "@/data/directories";
import { track } from "@/lib/analytics/client";
import { Button } from "@/components/ui/Button";
import { SelectInput, TextInput } from "@/components/ui/Form";
import { useToast } from "@/components/ui/Feedback";
import { cx } from "@/components/ui/cx";

export interface LetterPrefill { lender: string; amount: number | null; date: string | null; contact: LenderEntry["hardship"] | null }

type Output = "copy" | "email" | "pdf";
const money = (n: number) => `$${Number.isInteger(n) ? n.toLocaleString("en-AU") : n.toFixed(2)}`;

function Choice({ label, options, value, onChange }: { label: string; options: Record<string, string>; value: string; onChange: (v: string) => void }) {
  return (
    <fieldset>
      <legend className="text-body-strong text-text">{label}</legend>
      <div className="mt-t2 flex flex-wrap gap-t2">
        {Object.entries(options).map(([k, v]) => (
          <button key={k} type="button" aria-pressed={value === k} onClick={() => onChange(value === k ? "" : k)}
            className={cx("min-h-tap rounded-pill border px-t4 text-small", value === k ? "border-accent bg-accent-soft text-accent" : "border-divider bg-surface text-text")}>{v}</button>
        ))}
      </div>
    </fieldset>
  );
}

export function HardshipLetter({ prefill, name, onDone }: { prefill: LetterPrefill[]; name: string; onDone: (lender: string, output: Output) => void }) {
  const toast = useToast();
  const first = prefill[0];
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [lender, setLender] = useState(first?.lender ?? "");
  const p = prefill.find((x) => x.lender === lender) ?? null;
  const [amount, setAmount] = useState(first?.amount ? String(first.amount) : "");
  const [due, setDue] = useState(first?.date ?? "");
  const [who, setWho] = useState(name);
  const [reason, setReason] = useState("");
  const [duration, setDuration] = useState("");
  const [afford, setAfford] = useState("");
  const [contact, setContact] = useState("");
  const [letter, setLetter] = useState("");
  const fieldId = useId();
  useEffect(() => { track("hardship_letter_started", {}); }, []);
  const pick = (l: string) => {
    setLender(l);
    const q = prefill.find((x) => x.lender === l);
    setAmount(q?.amount ? String(q.amount) : "");
    setDue(q?.date ?? "");
  };
  const assemble = () => {
    const n = Number(amount.replace(/[$,\s]/g, ""));
    const a = Number(afford.replace(/[$,\s]/g, ""));
    setLetter(buildLetter({
      lender, name: who.trim() || name,
      amount: Number.isFinite(n) && n > 0 ? money(n) : "my repayment",
      due: /^\d{4}-\d{2}-\d{2}$/.test(due) ? formatShortDay(due) : "its due date",
      reason: reason || undefined, duration: duration || undefined,
      afford: Number.isFinite(a) && a > 0 ? money(a) : undefined, contact: contact.trim() || undefined,
    }));
    setStep(3);
  };
  const done = (output: Output) => { track("hardship_letter_completed", { output }); onDone(lender, output); };
  const copy = async () => {
    try { await navigator.clipboard.writeText(letter); toast({ kind: "confirm", message: t.copied }); } catch { /* the text is selectable */ }
    done("copy");
  };
  const to = p?.contact?.email ?? null;
  const how = p?.contact ? [p.contact.email, p.contact.phone, p.contact.url].filter(Boolean).join(" · ") : "";

  if (step === 1) return (
    <div className="flex flex-col gap-t4">
      <p className="text-body text-text-muted">{t.intro}</p>
      {prefill.length > 1
        ? <SelectInput label={t.lender} value={lender} options={prefill.map((x) => ({ value: x.lender, label: x.lender }))} onChange={pick} />
        : <TextInput label={t.lender} value={lender} onChange={(e) => setLender(e.target.value)} />}
      <TextInput label={t.amount} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
      <TextInput label={t.due} type="date" value={due} onChange={(e) => setDue(e.target.value)} />
      <TextInput label={t.name} autoComplete="name" value={who} onChange={(e) => setWho(e.target.value)} />
      <Button full disabled={!lender.trim()} onClick={() => setStep(2)}>{t.next}</Button>
    </div>
  );
  if (step === 2) return (
    <div className="flex flex-col gap-t5">
      <h3 className="text-h3 text-text">{t.stepQuestions}</h3>
      <Choice label={t.reasonLabel} options={t.reasons} value={reason} onChange={setReason} />
      <Choice label={t.durationLabel} options={t.durations} value={duration} onChange={setDuration} />
      <TextInput label={t.affordLabel} inputMode="decimal" value={afford} onChange={(e) => setAfford(e.target.value)} />
      <TextInput label={t.contactLabel} value={contact} onChange={(e) => setContact(e.target.value)} />
      <div className="flex flex-col gap-t2">
        <Button full onClick={assemble}>{t.next}</Button>
        <Button full variant="link" onClick={() => setStep(1)}>{t.back}</Button>
      </div>
    </div>
  );
  return (
    <div className="flex flex-col gap-t4">
      <label htmlFor={fieldId} className="text-h3 text-text">{t.editLabel}</label>
      <textarea id={fieldId} value={letter} onChange={(e) => setLetter(e.target.value)} rows={14}
        className="w-full rounded-sm border border-neutral bg-surface p-t4 text-body text-text focus:border-accent focus:outline focus:outline-[length:var(--focus-width)] focus:outline-offset-[var(--focus-offset)] focus:outline-focus" />
      <p className="text-small text-text">{how ? t.contactKnown(how) : t.contactUnknown(lender)}</p>
      <p className="text-small text-text-muted">{t.neverSends}</p>
      <div className="flex flex-col gap-t2">
        <Button full onClick={copy}>{t.copy}</Button>
        <a href={mailtoFor(to, t.subject(lender), letter)} onClick={() => done("email")}
          className="flex min-h-[44px] w-full items-center justify-center rounded-sm bg-accent-soft px-t3 text-body-strong text-accent hover:shadow-[inset_0_0_0_2px_var(--color-accent)]">{t.email}</a>
        <form method="post" action="/api/hardship/letter" onSubmit={() => done("pdf")}>
          <input type="hidden" name="text" value={letter} />
          <Button type="submit" full variant="secondary">{t.pdf}</Button>
        </form>
        <Button full variant="link" onClick={() => setStep(2)}>{t.back}</Button>
      </div>
      <p className="text-caption text-text-muted">{t.law}</p>
    </div>
  );
}
