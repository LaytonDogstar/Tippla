"use client";
import { useMemo, useState } from "react";
import { calculatorPage as t, loansPage } from "@/content/account";
import { formatDate, formatWhole } from "@/lib/format";
import { compareRepayment } from "@/lib/selectors/repayments";
import { ButtonLink } from "@/components/ui/Button";
import { CurrencyInput, SelectInput, TextInput } from "@/components/ui/Form";
import { SampleTag } from "@/components/ui/SampleTag";

interface CalcLoan { provider: string; repayment: number; cadenceDays: number; estimatedBalance: number | null; sharedBalance: number | null }
const err = { format: t.invalid, precision: t.invalid, negative: t.invalid };

export function CalculatorView({ loans, asOf, pro, present, initialLoan }: { loans: CalcLoan[]; asOf: string; pro: boolean; present: boolean; initialLoan: string | null }) {
  const [provider, setProvider] = useState(loans.find((l) => l.provider === initialLoan)?.provider ?? loans[0]?.provider ?? "");
  if (!loans.length) return <p className="mt-t4 rounded-md bg-surface p-t5 text-small text-text">{t.noLoans}</p>;
  const loan = loans.find((l) => l.provider === provider)!;
  return (
    <div className="pb-t6">
      <h1 className="sr-only">{t.title}</h1>
      <p className="mt-t2 text-small text-text-muted">{t.intro}</p>
      <div className="mt-t4">
        <SelectInput label={t.loanLabel} value={provider} onChange={setProvider} options={loans.map((l) => ({ value: l.provider, label: l.provider }))} />
      </div>
      <Inputs key={provider} loan={loan} asOf={asOf} pro={pro} present={present} />
    </div>
  );
}

function Inputs({ loan, asOf, pro, present }: { loan: CalcLoan; asOf: string; pro: boolean; present: boolean }) {
  const [balance, setBalance] = useState<number | null>(loan.estimatedBalance !== null ? Math.round(loan.estimatedBalance * 100) : null);
  const [repayment, setRepayment] = useState<number | null>(Math.round(loan.repayment * 100));
  const [fee, setFee] = useState<number | null>(0);
  const [rate, setRate] = useState("0");
  const [extra, setExtra] = useState(20);
  const [lump, setLump] = useState<number | null>(0);
  const ratePct = Number(rate.replace(",", "."));
  const rateOk = Number.isFinite(ratePct) && ratePct >= 0 && ratePct <= 100;
  const result = useMemo(() => {
    if (!balance || !repayment || !rateOk) return null;
    return compareRepayment({ balance: balance / 100, repayment: repayment / 100, cadenceDays: loan.cadenceDays, ratePct, monthlyFee: (fee ?? 0) / 100, extraPerCycle: extra, lumpSum: pro ? (lump ?? 0) / 100 : 0 }, asOf);
  }, [balance, repayment, rateOk, ratePct, fee, extra, lump, pro, loan.cadenceDays, asOf]);

  return (
    <>
      <div className="mt-t4 flex flex-col gap-t4 rounded-md bg-surface p-t4">
        <CurrencyInput label={t.balanceLabel} valueCents={balance} onChangeCents={setBalance} errorText={err}
          helper={loan.sharedBalance !== null ? t.balanceHintShared(formatWhole(loan.sharedBalance)) : t.balanceHint} />
        <CurrencyInput label={`${t.repaymentLabel} (${loansPage.cadence(loan.cadenceDays)})`} valueCents={repayment} onChangeCents={setRepayment} errorText={err} />
        <TextInput label={t.rateLabel} helper={t.rateHint} inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} error={rateOk ? undefined : t.invalid} />
        <CurrencyInput label={t.feeLabel} helper={t.feeHint} valueCents={fee} onChangeCents={setFee} errorText={err} />
        <div>
          <label htmlFor="extra" className="block text-small text-text">{t.extraLabel}</label>
          <input id="extra" type="range" min={0} max={200} step={5} value={extra} onChange={(e) => setExtra(Number(e.target.value))}
            aria-valuetext={t.extraValue(formatWhole(extra))} className="mt-t3 h-tap w-full accent-[var(--color-accent)]" />
          <output htmlFor="extra" className="tnum block text-body-strong text-text">{t.extraValue(formatWhole(extra))}</output>
        </div>
        {pro && (
          <div>
            <CurrencyInput label={t.lumpLabel} valueCents={lump} onChangeCents={setLump} errorText={err} helper={t.lumpHint} />
            <SampleTag q="Q9" present={present} className="mt-t2" />
          </div>
        )}
      </div>

      <section aria-labelledby="calc-h" aria-live="polite" className="mt-t3 rounded-lg bg-accent-soft p-t5">
        <h2 id="calc-h" className="text-h3 text-text">{t.resultHeading}</h2>
        {!result ? <p className="mt-t2 text-small text-text">{t.balanceHint}</p> : result.base.weeks === null ? (
          <>
            <p className="mt-t2 text-body text-text">{t.never}</p>
            <ButtonLink variant="secondary" className="mt-t3" href="/hardship">{t.hardship}</ButtonLink>
          </>
        ) : (
          <>
            <p className="tnum mt-t2 text-h2 font-display text-text">{result.weeksSooner ? t.sooner(result.weeksSooner) : t.noSooner}</p>
            {result.weeksSooner !== null && result.weeksSooner > 0 && (
              <p className="tnum mt-t1 text-body-strong text-text">{result.saved ? t.saved(formatWhole(result.saved)) : t.noSaving}</p>
            )}
            <p className="tnum mt-t3 text-small text-text-muted">{t.current(result.base.weeks, formatDate(result.base.payoffDate!))}</p>
            {result.plan.weeks !== null && (extra > 0 || (lump ?? 0) > 0) && <p className="tnum mt-t1 text-small text-text-muted">{t.withExtra(result.plan.weeks, formatDate(result.plan.payoffDate!))}</p>}
          </>
        )}
        <p className="mt-t3 text-caption text-text-muted">{t.basedOn}</p>
      </section>
    </>
  );
}
