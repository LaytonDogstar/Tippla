"use client";
import { CalendarClock, ChevronRight, Flag, HandCoins } from "lucide-react";
import type { PersonaId } from "@/lib/api/types";
import { RuleChoiceSheet, LOAN_OPTIONS } from "@/components/domain/RuleChoice";
import { correctionCopy } from "@/content/corrections";
import Link from "next/link";
import { useEffect, useState } from "react";
import { loansPage as t } from "@/content/account";
import { copy } from "@/content/en-AU";
import { formatCents, formatMonthLong, formatPercent, formatShortDay, formatWhole } from "@/lib/format";
import { sumMoney } from "@/lib/format/money";
import type { HistoryMonth, Loan, OtherCredit, PayAdvance, UpcomingRepayment, failedPayments, loanTotals } from "@/lib/selectors";
import { LoanCard } from "@/components/domain/LoanCard";
import { PageColumns } from "@/components/shell/PageColumns";
import { CardLink } from "@/components/ui/CardLink";
import { ProductCard } from "@/components/domain/ProductCard";
import { loan as lc } from "@/content/components";
import { Chip, ChipGroup, FilterChip, SegmentedControl } from "@/components/ui/Chips";

type Tab = "overview" | "upcoming" | "history" | "other";
const TABS: Tab[] = ["overview", "upcoming", "history", "other"];
const money = (n: number) => (Number.isInteger(n) ? formatWhole(n) : formatCents(n));

export function LoansView({ persona, corrections = false, initialTab, initialProvider, loans, other, totals, advance, upcoming, history, failed, offersCount, showOffers = true }: {
  /** UX round 2, 2.2 (shouldShowLenderOffers): no offers link during a debt plan or when finding things hard. */
  showOffers?: boolean;
  persona: PersonaId; corrections?: boolean;
  initialTab?: string; initialProvider: string | null; loans: Loan[]; other: OtherCredit[]; totals: ReturnType<typeof loanTotals>;
  advance: PayAdvance | null; upcoming: Record<30 | 60 | 90, UpcomingRepayment[]>; history: HistoryMonth[];
  failed: ReturnType<typeof failedPayments>; offersCount: number;
}) {
  const [tab, setTab] = useState<Tab>(TABS.includes(initialTab as Tab) ? (initialTab as Tab) : "overview");
  const [range, setRange] = useState<30 | 60 | 90>(30);
  const [provider, setProvider] = useState<string | null>(initialProvider);
  const [fixing, setFixing] = useState<string | null>(null);
  useEffect(() => {
    const u = new URL(window.location.href);
    if (tab === "overview") u.searchParams.delete("tab"); else u.searchParams.set("tab", tab);
    if (provider && tab === "history") u.searchParams.set("provider", provider); else u.searchParams.delete("provider");
    window.history.replaceState(window.history.state, "", u.toString());
  }, [tab, provider]);

  const saccs = loans.filter((l) => l.type === "SACC");
  const combined = saccs.length > 1 ? copy.loans.combinedBalance(formatWhole(totals.saccOutstanding), saccs.length) : undefined;
  const bnpl = other.filter((o) => o.kind === "bnpl");
  const advances = other.filter((o) => o.kind === "wage_advance");
  const viewRepayments = (p: string) => { setProvider(p); setTab("history"); window.scrollTo({ top: 0 }); };

  const next3 = upcoming[30].slice(0, 3);
  // Rail (UX round 2, 4.1): the debt-to-income summary, the next three repayments and the plan.
  const rail = (
    <>
      {totals.debtToIncomePct90 !== null && (
        <section className="rounded-card-s bg-accent-soft p-t5 sm:rounded-card">
          <p className="text-row text-text">{t.dti(formatPercent(totals.debtToIncomePct90, 0))}</p>
          <p className="mt-t1 text-meta text-text-secondary">{t.dtiNote}</p>
        </section>
      )}
      <section aria-labelledby="next3-h" className="rounded-card-s bg-surface p-t5 shadow-card sm:rounded-card">
        <h2 id="next3-h" className="text-card text-text sm:text-card-l">{t.nextRepayments}</h2>
        {next3.length ? (
          <ul className="mt-t2 flex flex-col">
            {next3.map((u) => (
              <li key={`${u.provider}-${u.date}`} className="flex min-h-[52px] items-center justify-between gap-t3 border-t border-divider first:border-t-0">
                <span><span className="block text-body14 font-semibold text-text">{u.provider}</span><span className="block text-meta text-text-muted">{formatShortDay(u.date)} · {t.upcoming.predicted}</span></span>
                <span className="tnum text-row text-text">{money(u.amount)}</span>
              </li>
            ))}
          </ul>
        ) : <p className="mt-t2 text-body14 text-text-muted">{t.upcoming.empty}</p>}
        <button type="button" onClick={() => setTab("upcoming")} className="mt-t2 inline-flex min-h-tap items-center gap-t1 text-body14 font-semibold text-accent">{t.seeAllUpcoming}<ChevronRight aria-hidden size={16} /></button>
      </section>
      <CardLink icon={Flag} title={t.planLink} body={t.planLinkBody} href="/savings" as="p" />
    </>
  );

  return (
    <div className="pb-t6">
      <PageColumns railLabel={t.railLabel} rail={rail} main={<>
      <RuleChoiceSheet persona={persona} merchant={fixing ?? ""} title={fixing ? correctionCopy.loan.title(fixing) : ""} options={LOAN_OPTIONS} open={!!fixing} onClose={() => setFixing(null)} scoreNote />
      <SegmentedControl label={t.tabsLabel} value={tab} onChange={setTab} options={TABS.map((v) => ({ value: v, label: t.tabs[v] }))} />

      {tab === "overview" && (
        <div className="mt-t4 flex flex-col gap-t3">
          {loans.length ? (
            <>
              <h2 className="mt-t3 px-t1 text-card text-text sm:text-card-l">{t.loansHeading}</h2>
              {/* The small loans' balance can't be split per lender: say it once, for the group (1.6). */}
              {combined && saccs.some((l) => l.estimatedBalance === null) && <p className="tnum px-t1 text-body14 text-text-secondary">{combined}</p>}
              {[...loans].sort((a, b) => (a.type === "SACC" ? 0 : 1) - (b.type === "SACC" ? 0 : 1)).map((l) => (
                <LoanCard key={l.provider} loan={l}
                  onViewRepayments={() => viewRepayments(l.provider)} onNotRight={corrections ? () => setFixing(l.provider) : undefined} />
              ))}
              {totals.totalOutstanding > 0 && <p className="tnum px-t1 text-small text-text-muted">{t.totalLeft(formatWhole(totals.totalOutstanding))}</p>}
            </>
          ) : <p className="rounded-card-s bg-surface shadow-card sm:rounded-card p-t5 text-small text-text">{t.noLoans}</p>}
          <CreditGroups bnpl={bnpl} advances={advances} advance={advance} onView={viewRepayments} />
          <nav aria-label={t.title} className="mt-t3 flex flex-col overflow-hidden rounded-card-s bg-surface shadow-card sm:rounded-card">
            {[{ href: "/loans/repayment", label: t.calculatorLink }, ...(showOffers ? [{ href: "/offers", label: offersCount ? `${t.offersLink} (${offersCount})` : t.offersLink }] : [])].map((l) => (
              <Link key={l.href} href={l.href} className="flex min-h-[52px] items-center justify-between border-b border-divider px-t4 text-small text-accent last:border-b-0 hover:bg-surface2">
                {l.label}<ChevronRight aria-hidden size={20} />
              </Link>
            ))}
          </nav>
        </div>
      )}

      {tab === "upcoming" && (
        <div className="mt-t4">
          <ChipGroup label={t.upcoming.rangeLabel}>
            {([30, 60, 90] as const).map((n) => <Chip key={n} selected={range === n} onClick={() => setRange(n)}>{t.upcoming.ranges[n]}</Chip>)}
          </ChipGroup>
          <p className="tnum mt-t4 text-h2 font-display text-text">{t.upcoming.total(formatWhole(sumMoney(upcoming[range].map((u) => u.amount))), range)}</p>
          <p className="mt-t1 text-caption text-text-muted">{t.upcoming.note}</p>
          {upcoming[range].length ? (
            <ul className="mt-t3 flex flex-col gap-t2">
              {upcoming[range].map((u) => (
                <li key={`${u.provider}-${u.date}`} className="flex min-h-[64px] items-center justify-between gap-t3 rounded-sm border border-dashed bg-surface p-t4" style={{ borderColor: "var(--chart-predicted)" }}>
                  <span><span className="block text-body-strong text-text">{u.provider}</span><span className="block text-caption text-text-muted">{formatShortDay(u.date)} · {t.upcoming.predicted}</span></span>
                  <span className="tnum text-body-strong text-text">{money(u.amount)}</span>
                </li>
              ))}
            </ul>
          ) : <p className="mt-t3 rounded-card-s bg-surface shadow-card sm:rounded-card p-t5 text-small text-text">{t.upcoming.empty}</p>}
        </div>
      )}

      {tab === "history" && (
        <div className="mt-t4 flex flex-col gap-t3">
          {provider && <div><FilterChip label={provider} onRemove={() => setProvider(null)} /></div>}
          {history.length ? history.map((m) => {
            const items = provider ? m.items.filter((i) => i.provider === provider) : m.items;
            if (!items.length) return null;
            const label = `${formatMonthLong(m.month)} ${m.month.slice(0, 4)}`;
            return (
              <section key={m.month} aria-label={label} className="rounded-card-s bg-surface shadow-card sm:rounded-card">
                <h2 className="tnum flex justify-between p-t4 pb-t2 text-h3 text-text"><span>{label}</span><span>{formatWhole(sumMoney(items.map((i) => i.amount)))}</span></h2>
                <ul>
                  {items.map((i) => (
                    <li key={i.id} className="flex min-h-[52px] items-center justify-between gap-t3 border-t border-divider px-t4">
                      <span><span className="block text-small text-text">{i.provider}</span><span className="block text-caption text-text-muted">{formatShortDay(i.date)}</span></span>
                      <span className="tnum text-small text-text">{formatCents(i.amount)}</span>
                    </li>
                  ))}
                </ul>
              </section>
            );
          }) : <p className="rounded-card-s bg-surface shadow-card sm:rounded-card p-t5 text-small text-text">{t.history.empty}</p>}
          <section aria-labelledby="failed-h" className="rounded-card-s bg-surface shadow-card sm:rounded-card p-t4">
            <h2 id="failed-h" className="text-card text-text sm:text-card-l">{t.history.failedHeading}</h2>
            {failed.length ? (
              <ul className="mt-t2 flex flex-col gap-t2">{failed.map((f) => <li key={f.id} className="text-small text-text">{t.history.failed(f.lender, formatShortDay(f.date), formatCents(f.fee))}</li>)}</ul>
            ) : <p className="mt-t2 text-small text-text-muted">{t.history.noFailed}</p>}
          </section>
        </div>
      )}

      {tab === "other" && (
        <div className="mt-t4 flex flex-col gap-t3">
          <p className="text-small text-text-muted">{t.other.intro}</p>
          {bnpl.length || advances.length ? <CreditGroups bnpl={bnpl} advances={advances} advance={advance} onView={viewRepayments} /> : <p className="rounded-card-s bg-surface shadow-card sm:rounded-card p-t5 text-small text-text">{t.other.none}</p>}
          <section aria-labelledby="cards-h" className="rounded-card-s bg-surface shadow-card sm:rounded-card p-t4">
            <h2 id="cards-h" className="text-card text-text sm:text-card-l">{t.other.cards}</h2>
            <p className="mt-t2 text-small text-text-muted">{t.other.noCards}</p>
          </section>
        </div>
      )}
      </>} />
    </div>
  );
}

function CreditGroups({ bnpl, advances, advance, onView }: { bnpl: OtherCredit[]; advances: OtherCredit[]; advance: PayAdvance | null; onView: (p: string) => void }) {
  // The same card template as loans (UX round 2, 3.5): Balance, Next repayment, Frequency as label/value pairs.
  return (
    <>
      {bnpl.length > 0 && (
        <>
          <h2 className="mt-t3 px-t1 text-card text-text sm:text-card-l">{t.bnplHeading}</h2>
          {bnpl.map((o) => (
            <ProductCard key={o.provider} icon={CalendarClock} name={o.provider} type={t.bnplHeading} onOpen={() => onView(o.provider)} openLabel={t.viewRepayments}
              pairs={[
                { label: lc.nextRepayment, value: <>{money(o.repayment)}{o.nextDue ? <span className="text-body14 font-semibold text-text-secondary"> · {formatShortDay(o.nextDue)}</span> : null}</>, main: true },
                { label: lc.balanceShort, value: lc.notAvailable, status: true },
                { label: lc.frequencyShort, value: t.cadenceLabel(o.cadenceDays) },
              ]} note={t.estimated} />
          ))}
        </>
      )}
      {advances.length > 0 && (
        <>
          <h2 className="mt-t3 px-t1 text-card text-text sm:text-card-l">{t.advanceHeading}</h2>
          {advances.map((o) => {
            const a = advance && advance.provider === o.provider ? advance : null;
            return (
              <ProductCard key={o.provider} icon={HandCoins} name={o.provider} type={t.advanceHeading} onOpen={() => onView(o.provider)} openLabel={t.viewRepayments}
                pairs={a ? [
                  ...(a.repayAmount !== null && a.repayDate ? [{ label: t.dueBackLabel, value: <>{formatWhole(a.repayAmount)}<span className="text-body14 font-semibold text-text-secondary"> · {formatShortDay(a.repayDate)}</span></>, main: true }] : []),
                  { label: t.receivedLabel, value: <>{formatWhole(a.amount)}<span className="text-body14 font-semibold text-text-secondary"> · {formatShortDay(a.date)}</span></> },
                  ...(a.repayAmount !== null && a.repayDate ? [{ label: t.feeLabel, value: formatWhole(a.fee ?? 0) }] : []),
                ] : [
                  { label: lc.nextRepayment, value: money(o.repayment), main: true },
                  { label: lc.frequencyShort, value: t.cadenceLabel(o.cadenceDays) },
                ]}
                note={a ? <>{t.notIncome} {t.estimated[0]!.toUpperCase() + t.estimated.slice(1)}.</> : t.estimated} />
            );
          })}
        </>
      )}
    </>
  );
}
