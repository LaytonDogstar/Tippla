"use client";
// Spec 06 §3 (flag bill_switch_v1, gates G2 and G4): neutral pointers to compare telco, internet and energy
// bills. No providers recommended and no referral links: energy goes to the government comparison site,
// phone and internet to plain tips. "I've switched" is self-reported and labelled that way.
import { ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";
import { billSwitchCopy as t } from "@/content/actions";
import { ENERGY_COMPARE_VIC, PROGRAMS } from "@/data/directories";
import type { PersonaId } from "@/lib/api/types";
import type { AccountState } from "@/lib/account/state";
import { useAccount } from "@/lib/account/client";
import { track } from "@/lib/analytics/client";
import { formatDollars } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/Form";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/Feedback";

type Bill = { merchant: string; category: "telco" | "internet" | "energy"; monthly: number };

export function BillCompare({ persona, account, asOf, bills, state }: { persona: PersonaId; account: AccountState; asOf: string; bills: Bill[]; state: string }) {
  const { account: acct, update } = useAccount(persona, account);
  const toast = useToast();
  const [tips, setTips] = useState<Bill | null>(null);
  const [report, setReport] = useState<Bill | null>(null);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { for (const c of new Set(bills.map((b) => b.category))) track("bill_switch_prompt_shown", { category: c }); }, [bills]);
  const save = () => {
    const n = Number(value.replace(/[$,\s]/g, ""));
    if (!report || !Number.isFinite(n) || n < 1 || n > 500) { setError(t.invalid); return; }
    track("bill_switch_reported", { monthly_saving_cents: Math.round(n * 100) });
    update((l) => ({ ...l, billSwitches: [...(l.billSwitches ?? []).filter((b) => b.merchant !== report.merchant), { merchant: report.merchant, monthly: Math.round(n * 100) / 100, at: asOf }] }));
    toast({ kind: "confirm", message: t.reported(formatDollars(n)) });
    setReport(null);
  };
  if (!bills.length) return null;
  return (
    <section aria-labelledby="bills-h" className="flex flex-col gap-t3">
      <h2 id="bills-h" className="text-card text-text sm:text-card-l">{t.heading}</h2>
      <p className="text-small text-text-muted">{t.intro}</p>
      {bills.map((b) => {
        const reported = (acct.billSwitches ?? []).find((x) => x.merchant === b.merchant);
        return (
          <article key={b.merchant} aria-labelledby={`bill-${b.merchant.replace(/\W+/g, "-")}`} className="rounded-card-s bg-surface shadow-card sm:rounded-card p-t4">
            <p className="text-caption text-text-muted">{t.categories[b.category]}</p>
            <h3 id={`bill-${b.merchant.replace(/\W+/g, "-")}`} className="text-h3 text-text">{t.line(b.merchant, formatDollars(Math.round(b.monthly)))}</h3>
            <p className="mt-t1 text-small text-text-muted">{b.category === "energy" ? (state === "VIC" ? t.energyVic : t.energy) : t.telco}</p>
            <div className="mt-t3 flex flex-col gap-t2">
              {b.category === "energy"
                ? <a href={state === "VIC" ? ENERGY_COMPARE_VIC : PROGRAMS.energy_compare.url} target="_blank" rel="noopener noreferrer" onClick={() => track("bill_switch_link_opened", {})}
                    className="inline-flex min-h-tap items-center gap-t2 text-body-strong text-accent underline-offset-2 hover:underline">{t.compare}<ExternalLink aria-hidden size={16} /></a>
                : <Button variant="secondary" onClick={() => { track("bill_switch_link_opened", {}); setTips(b); }}>{t.tipsTitle(b.merchant)}</Button>}
              {reported
                ? <p role="status" className="text-small text-text">{t.reported(formatDollars(reported.monthly))}</p>
                : <Button variant="link" onClick={() => { setReport(b); setValue(""); setError(null); }}>{t.switched}</Button>}
            </div>
          </article>
        );
      })}
      <p className="text-caption text-text-muted">{t.general}</p>
      <Sheet open={!!tips} onClose={() => setTips(null)} title={tips ? t.tipsTitle(tips.merchant) : ""}>
        <ul className="flex list-disc flex-col gap-t2 pl-t5 text-body text-text">{t.tips.map((x) => <li key={x}>{x}</li>)}</ul>
        <p className="mt-t4 text-caption text-text-muted">{t.general}</p>
      </Sheet>
      <Sheet open={!!report} onClose={() => setReport(null)} title={report ? `${report.merchant}: ${t.switched.toLowerCase()}` : ""}
        footer={<Button full onClick={save}>{t.save}</Button>}>
        <TextInput label={t.savedLabel} inputMode="decimal" value={value} error={error ?? undefined} onChange={(e) => { setValue(e.target.value); setError(null); }} />
      </Sheet>
    </section>
  );
}
