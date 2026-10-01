"use client";
import { CalendarClock, ChevronRight, HandCoins } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { loansPage as t } from "@/content/account";
import { copy } from "@/content/en-AU";
import { formatCents, formatMonthLong, formatPercent, formatShortDay, formatWhole } from "@/lib/format";
import { sumMoney } from "@/lib/format/money";
import type { HistoryMonth, Loan, OtherCredit, PayAdvance, UpcomingRepayment, failedPayments, loanTotals } from "@/lib/selectors";
import { LoanCard } from "@/components/domain/LoanCard";
import { Chip, ChipGroup, FilterChip, SegmentedControl } from "@/components/ui/Chips";

type Tab = "overview" | "upcoming" | "history" | "other";
const TABS: Tab[] = ["overview", "upcoming", "history", "other"];
const money = (n: number) => (Number.isInteger(n) ? formatWhole(n) : formatCents(n));

export function LoansView({ initialTab, initialProvider, loans, other, totals, advance, upcoming, history, failed, offersCount }: {
  initialTab?: string; initialProvider: string | null; loans: Loan[]; other: OtherCredit[]; totals: ReturnType<typeof loanTotals>;
  advance: PayAdvance | null; upcoming: Record<30 | 60 | 90, UpcomingRepayment[]>; history: HistoryMonth[];
  failed: ReturnType<typeof failedPayments>; offersCount: number;
}) {
  const [tab, setTab] = useState<Tab>(TABS.includes(initialTab as Tab) ? (initialTab as Tab) : "overview");
  const [range, setRange] = useState<30 | 60 | 90>(30);
  const [provider, setProvider] = useState<string | null>(initialProvider);
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

  return (
    <div className="pb-t6">
      <SegmentedControl label={t.tabsLabel} value={tab} onChange={setTab} options={TABS.map((v) => ({ value: v, label: t.tabs[v] }))} />

      {tab === "overview" && (
        <div className="mt-t4 flex flex-col gap-t3">
          {totals.debtToIncomePct90 !== null && (
            <section className="rounded-md bg-accent-soft p-t5">
              <p className="text-h3 text-text">{t.dti(formatPercent(totals.debtToIncomePct90, 0))}</p>
              <p className="mt-t1 text-caption text-text-muted">{t.dtiNote}</p>
            </section>
          )}
          {loans.length ? (
            <>
              <h2 className="mt-t3 text-h2 font-display text-text">{t.loansHeading}</h2>
              {[...loans].sort((a, b) => (a.type === "SACC" ? 0 : 1) - (b.type === "SACC" ? 0 : 1)).map((l) => (
                <LoanCard key={l.provider} loan={l} combinedBalance={l.estimatedBalance === null && l.type === "SACC" ? combined : undefined}
                  onViewRepayments={() => viewRepayments(l.provider)} />
              ))}
              {totals.totalOutstanding > 0 && <p className="tnum px-t1 text-small text-text-muted">{t.totalLeft(formatWhole(totals.totalOutstanding))}</p>}
            </>
          ) : <p className="rounded-md bg-surface p-t5 text-small text-text">{t.noLoans}</p>}
          <CreditGroups bnpl={bnpl} advances={advances} advance={advance} onView={viewRepayments} />
          <nav aria-label={t.title} className="mt-t3 flex flex-col overflow-hidden rounded-md bg-surface">
            {[{ href: "/loans/repayment", label: t.calculatorLink }, { href: "/offers", label: offersCount ? `${t.offersLink} (${offersCount})` : t.offersLink }].map((l) => (
              <Link key={l.href} href={l.href} className="flex min-h-[52px] items-center justify-between border-b border-line px-t4 text-small text-accent last:border-b-0 hover:bg-surface2">
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
          ) : <p className="mt-t3 rounded-md bg-surface p-t5 text-small text-text">{t.upcoming.empty}</p>}
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
              <section key={m.month} aria-label={label} className="rounded-md bg-surface">
                <h2 className="tnum flex justify-between p-t4 pb-t2 text-h3 text-text"><span>{label}</span><span>{formatWhole(sumMoney(items.map((i) => i.amount)))}</span></h2>
                <ul>
                  {items.map((i) => (
                    <li key={i.id} className="flex min-h-[52px] items-center justify-between gap-t3 border-t border-line px-t4">
                      <span><span className="block text-small text-text">{i.provider}</span><span className="block text-caption text-text-muted">{formatShortDay(i.date)}</span></span>
                      <span className="tnum text-small text-text">{formatCents(i.amount)}</span>
                    </li>
                  ))}
                </ul>
              </section>
            );
          }) : <p className="rounded-md bg-surface p-t5 text-small text-text">{t.history.empty}</p>}
          <section aria-labelledby="failed-h" className="rounded-md bg-surface p-t4">
            <h2 id="failed-h" className="text-h3 text-text">{t.history.failedHeading}</h2>
            {failed.length ? (
              <ul className="mt-t2 flex flex-col gap-t2">{failed.map((f) => <li key={f.id} className="text-small text-text">{t.history.failed(f.lender, formatShortDay(f.date), formatCents(f.fee))}</li>)}</ul>
            ) : <p className="mt-t2 text-small text-text-muted">{t.history.noFailed}</p>}
          </section>
        </div>
      )}

      {tab === "other" && (
        <div className="mt-t4 flex flex-col gap-t3">
          <p className="text-small text-text-muted">{t.other.intro}</p>
          {bnpl.length || advances.length ? <CreditGroups bnpl={bnpl} advances={advances} advance={advance} onView={viewRepayments} /> : <p className="rounded-md bg-surface p-t5 text-small text-text">{t.other.none}</p>}
          <section aria-labelledby="cards-h" className="rounded-md bg-surface p-t4">
            <h2 id="cards-h" className="text-h3 text-text">{t.other.cards}</h2>
            <p className="mt-t2 text-small text-text-muted">{t.other.noCards}</p>
          </section>
        </div>
      )}
    </div>
  );
}

function CreditGroups({ bnpl, advances, advance, onView }: { bnpl: OtherCredit[]; advances: OtherCredit[]; advance: PayAdvance | null; onView: (p: string) => void }) {
  return (
    <>
      {bnpl.length > 0 && (
        <>
          <h2 className="mt-t3 text-h2 font-display text-text">{t.bnplHeading}</h2>
          {bnpl.map((o) => (
            <CreditCard key={o.provider} icon="bnpl" title={o.provider} onView={() => onView(o.provider)}
              lines={[t.perCadence(money(o.repayment), t.cadence(o.cadenceDays)), ...(o.nextDue ? [t.nextDue(formatShortDay(o.nextDue))] : [])]} note={t.balanceUnavailable} />
          ))}
        </>
      )}
      {advances.length > 0 && (
        <>
          <h2 className="mt-t3 text-h2 font-display text-text">{t.advanceHeading}</h2>
          {advances.map((o) => {
            const a = advance && advance.provider === o.provider ? advance : null;
            return (
              <CreditCard key={o.provider} icon="advance" title={o.provider} subtitle={t.advanceHeading} onView={() => onView(o.provider)}
                lines={a ? [t.received(formatWhole(a.amount), formatShortDay(a.date))] : [t.perCadence(money(o.repayment), t.cadence(o.cadenceDays))]}
                detail={a && a.repayAmount !== null && a.repayDate ? `${copy.payCycle.advanceLine(formatWhole(a.amount))}: ${copy.payCycle.advanceRepay(formatWhole(a.repayAmount), formatShortDay(a.repayDate), formatWhole(a.amount), formatWhole(a.fee ?? 0))}` : undefined}
                note={t.estimated} />
            );
          })}
        </>
      )}
    </>
  );
}

function CreditCard({ icon, title, subtitle, lines, detail, note, onView }: { icon: "bnpl" | "advance"; title: string; subtitle?: string; lines: string[]; detail?: string; note: string; onView: () => void }) {
  const Icon = icon === "bnpl" ? CalendarClock : HandCoins;
  return (
    <article aria-label={title} className="rounded-md bg-surface p-t4">
      <div className="flex items-start gap-t3">
        <span aria-hidden className="inline-flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-sm bg-surface2 text-neutral"><Icon size={24} /></span>
        <div className="min-w-0 flex-1">
          <h3 className="text-h3 text-text">{title}</h3>
          {subtitle && <p className="text-caption text-text-muted">{subtitle}</p>}
          {lines.map((l) => <p key={l} className="tnum mt-t2 text-body text-text">{l}</p>)}
          {detail && <p className="mt-t2 text-small text-text-muted">{detail}</p>}
          <p className="mt-t2 text-caption text-text-muted">{note}</p>
        </div>
      </div>
      <button type="button" onClick={onView} className="mt-t2 flex min-h-tap w-full items-center justify-between rounded-sm text-small text-accent hover:bg-surface2">
        {t.viewRepayments}<ChevronRight aria-hidden size={20} />
      </button>
    </article>
  );
}
