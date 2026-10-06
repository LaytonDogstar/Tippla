"use client";
// O2: three separate, unticked consents. Continue needs the two required ones; lender matching plays no part.
// Each choice is recorded with a timestamp and text version. Expanders never toggle a checkbox.
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { onboarding } from "@/content/onboarding";
import { OnboardingShell } from "@/components/shell/Shells";
import { Button } from "@/components/ui/Button";
import { cx } from "@/components/ui/cx";
import { CONSENT_VERSION, readOnboarding, writeOnboarding, type OnboardingState } from "@/lib/onboarding/store";

const t = onboarding.consents;
type Id = keyof typeof t.items;
const IDS: { id: Id; required: boolean }[] = [
  { id: "ff_data_sharing", required: true },
  { id: "talefin_bank_data", required: true },
  { id: "lender_matching", required: false },
];

function ConsentCard({ id, required, checked, onChange }: { id: Id; required: boolean; checked: boolean; onChange: (v: boolean) => void }) {
  const [open, setOpen] = useState(false);
  const base = useId();
  const item = t.items[id];
  return (
    <section className="rounded-md bg-surface p-t4">
      <label htmlFor={`${base}-cb`} className="flex min-h-tap cursor-pointer items-start gap-t4 rounded-sm has-[:focus-visible]:outline has-[:focus-visible]:outline-[length:var(--focus-width)] has-[:focus-visible]:outline-offset-[var(--focus-offset)] has-[:focus-visible]:outline-focus">
        <input id={`${base}-cb`} type="checkbox" className="sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)}
          aria-describedby={`${base}-st ${base}-ex`} data-consent={id} />
        <span aria-hidden className={cx("mt-[2px] inline-flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-xs border-2",
          checked ? "border-accent bg-accent text-on-accent" : "border-neutral bg-surface")}>
          {checked && <Check size={16} strokeWidth={3} />}
        </span>
        <span className="text-h3 text-text">{item.title}</span>
      </label>
      <p id={`${base}-st`} className="mt-t3 text-caption text-text-muted">{required ? t.required : t.optional}</p>
      <p id={`${base}-ex`} className="mt-t2 text-small text-text-muted">{item.explanation}</p>
      <button type="button" aria-expanded={open} aria-controls={`${base}-detail`} onClick={() => setOpen((v) => !v)}
        className="mt-t2 flex min-h-tap w-full items-center justify-between rounded-sm text-small text-accent hover:bg-surface2">
        {t.whatThisMeans}
        {open ? <ChevronUp aria-hidden size={20} /> : <ChevronDown aria-hidden size={20} />}
      </button>
      <div id={`${base}-detail`} hidden={!open} className="mt-t1 text-small text-text">{item.detail}</div>
    </section>
  );
}

export default function Consents() {
  const router = useRouter();
  const [values, setValues] = useState<Record<Id, boolean>>({ ff_data_sharing: false, talefin_bank_data: false, lender_matching: false });
  const [submitting, setSubmitting] = useState(false);
  // Back from a later step keeps local choices.
  useEffect(() => {
    const c = readOnboarding().consents;
    if (c) setValues({ ff_data_sharing: c.ff_data_sharing.granted, talefin_bank_data: c.talefin_bank_data.granted, lender_matching: c.lender_matching.granted });
  }, []);
  const ready = values.ff_data_sharing && values.talefin_bank_data && !submitting;
  const submit = async () => {
    if (!ready) return;
    setSubmitting(true);
    const at = new Date().toISOString();
    const consents = Object.fromEntries(IDS.map(({ id }) => [id, { granted: values[id], at, version: CONSENT_VERSION }])) as NonNullable<OnboardingState["consents"]>;
    await new Promise((r) => setTimeout(r, 300)); // mock save
    writeOnboarding({ consents });
    router.push("/onboarding/connect-bank");
  };
  return (
    <OnboardingShell step="consents" backHref="/onboarding/password" title={t.title}
      footer={<>
        {!values.ff_data_sharing || !values.talefin_bank_data ? <p id="consent-hint" className="text-center text-caption text-text-muted">{t.tickBoth}</p> : null}
        <Button size="standard" full disabled={!ready} loading={submitting} loadingLabel={t.saving} aria-describedby="consent-hint" onClick={submit}>{t.continue}</Button>
      </>}>
      <p className="text-small text-text-muted">{t.intro}</p>
      <form className="mt-t4 flex flex-col gap-t3" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        {IDS.map(({ id, required }) => (
          <ConsentCard key={id} id={id} required={required} checked={values[id]} onChange={(v) => setValues((s) => ({ ...s, [id]: v }))} />
        ))}
      </form>
    </OnboardingShell>
  );
}
