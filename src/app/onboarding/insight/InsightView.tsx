"use client";
// The "aha" card: one finding, one way to see the detail (a sheet, so the flow carries on), then Next.
// No alarm colours: the shortfall uses the caution tone, like Today.
import { useEffect, useState } from "react";
import { ahaCopy as t } from "@/content/firstValue";
import { formatDayMonth, formatWhole } from "@/lib/format";
import type { Aha } from "@/lib/selectors/firstValue";
import { track } from "@/lib/analytics/client";
import { OnboardingShell } from "@/components/shell/Shells";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { SampleTag } from "@/components/ui/SampleTag";

function text(a: Aha): { title: string; body: string; show: string; sheetTitle: string } {
  switch (a.type) {
    case "shortfall": return { title: t.shortfall.title(formatWhole(a.short), formatDayMonth(a.payday)), body: t.shortfall.body(formatWhole(a.balance), formatWhole(a.due), a.bills.length), show: t.shortfall.show, sheetTitle: t.shortfall.sheetTitle };
    case "subscriptions": return { title: t.subscriptions.title(formatWhole(a.perYear), a.rows.length), body: t.subscriptions.body, show: t.subscriptions.show, sheetTitle: t.subscriptions.sheetTitle };
    case "advance_fees": return { title: t.advance_fees.title(formatWhole(a.total)), body: t.advance_fees.body(a.fees.length, a.provider), show: t.advance_fees.show, sheetTitle: t.advance_fees.sheetTitle };
    case "positive": return {
      title: a.factor ? (t.positive.factor[a.factor.key] ?? t.positive.generic) : a.pay ? t.positive.pay(a.pay.weekday, formatWhole(a.pay.amount)) : t.positive.generic,
      body: a.factor ? t.positive.factorBody(a.factor.name, a.factor.value.toFixed(1)) : t.positive.payBody,
      show: t.positive.show, sheetTitle: t.positive.sheetTitle,
    };
  }
}

function Detail({ a }: { a: Aha }) {
  const row = (k: string, left: string, right: string) => (
    <li key={k} className="flex min-h-tap items-center justify-between gap-t3 border-b border-divider py-t2 text-body text-text"><span>{left}</span><span className="tnum">{right}</span></li>
  );
  if (a.type === "shortfall") return <><ul>{a.bills.map((b) => row(b.merchant + b.date, `${b.merchant} · ${formatDayMonth(b.date)}`, formatWhole(b.amount)))}</ul><p className="mt-t3 text-small text-text-muted">{t.shortfall.sheetNote}</p></>;
  if (a.type === "subscriptions") return <ul>{a.rows.map((r) => row(r.merchant, r.merchant, t.subscriptions.perYear(formatWhole(r.perYear))))}</ul>;
  if (a.type === "advance_fees") return <ul>{a.fees.map((f) => <li key={f.date} className="border-b border-divider py-t2 text-body text-text">{t.advance_fees.fee(formatDayMonth(f.date), formatWhole(f.amount))}</li>)}</ul>;
  return <p className="text-body text-text-muted">{a.factor ? a.factor.explains + "." : t.positive.payBody}</p>;
}

export function InsightView({ aha, present }: { aha: Aha; present: boolean }) {
  const [open, setOpen] = useState(false);
  useEffect(() => { track("aha_shown", { type: aha.type }); }, [aha.type]);
  const c = text(aha);
  return (
    <OnboardingShell step="aha" title={t.eyebrow} footer={<ButtonLink href="/onboarding/score-reveal" size="standard" full>{t.next}</ButtonLink>}>
      <section aria-labelledby="aha" className={aha.type === "shortfall" ? "mt-t4 rounded-lg bg-caution-soft p-t5" : "mt-t4 rounded-lg bg-accent-soft p-t5"}>
        <h2 id="aha" className="text-card text-text sm:text-card-l">{c.title}</h2>
        <p className="mt-t3 text-body text-text">{c.body}</p>
        <Button variant="secondary" full className="mt-t5" onClick={() => { track("aha_actioned", { type: aha.type }); setOpen(true); }}>{c.show}</Button>
      </section>
      <SampleTag q="Q29" present={present} className="mt-t3" />
      <Sheet open={open} onClose={() => setOpen(false)} title={c.sheetTitle}><Detail a={aha} /></Sheet>
    </OnboardingShell>
  );
}
