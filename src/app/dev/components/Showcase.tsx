"use client";
// Dev-only component library (Phase 1). Headings here are dev labels, not customer copy.
import { useState, type ReactNode } from "react";
import type { Offer, Transaction } from "@/lib/api/types";
import type { CalendarDay } from "@/lib/selectors/calendar";
import type { Loan, loanTotals as LT, payAdvanceRun as PAR } from "@/lib/selectors/loans";
import type { gamblingInsight as GI } from "@/lib/selectors/gambling";
import type { PayCycleSummary } from "@/lib/selectors/payCycle";
import type { Factor, ScoreState } from "@/lib/selectors/score";
import type { CategoryRow as Row, MerchantRow, SpendCategory } from "@/lib/selectors/spending";
import type { ExpectedIncome } from "@/lib/selectors/income";
import { copy } from "@/content/en-AU";
import { insightCopy } from "@/content/insights";
import type { EmptyVariant } from "@/content/components";
import { formatDayMonth, formatFactor, formatPercent, formatWhole } from "@/lib/format";
import { ScoreRing } from "@/components/domain/ScoreRing";
import { StageScale } from "@/components/domain/StageScale";
import { FactorTile } from "@/components/domain/FactorTile";
import { PayCycleHero } from "@/components/domain/PayCycleHero";
import { InsightCard, InsightSheetBody, type InsightItem } from "@/components/domain/Insight";
import { CategoryRow } from "@/components/domain/CategoryRow";
import { Donut } from "@/components/domain/Donut";
import { TransactionRow } from "@/components/domain/TransactionRow";
import { CalendarGrid, DayDetail } from "@/components/domain/Calendar";
import { LoanCard } from "@/components/domain/LoanCard";
import { OfferCard } from "@/components/domain/OfferCard";
import { RecommendationCard } from "@/components/domain/RecommendationCard";
import { MobileDock, DesktopSidebar } from "@/components/nav/Navigation";
import { Button } from "@/components/ui/Button";
import { Chip, ChipGroup, FilterChip, SegmentedControl } from "@/components/ui/Chips";
import { EmptyState, InlineAlert, Skeleton, useToast } from "@/components/ui/Feedback";
import { Checkbox, CurrencyInput, RadioGroup, TextInput, Toggle } from "@/components/ui/Form";
import { Sheet } from "@/components/ui/Sheet";
import { ThemeToggle } from "@/components/dev/ThemeToggle";

export interface ShowcaseData {
  asOf: string;
  jess: {
    score: ScoreState; factors: Factor[]; top: Factor[]; strongest: Factor | null; payCycle: PayCycleSummary;
    rows: Row[]; cycleLabel: string; merchants: Record<string, MerchantRow[]>;
    calendar: { days: CalendarDay[]; nextPayday: string; nextIncome: ExpectedIncome[] }; spendCats: Record<string, string[]>;
    loans: Loan[]; loanTotals: ReturnType<typeof LT>; advance: ReturnType<typeof PAR>; gambling: ReturnType<typeof GI>;
    tx: { posted: Transaction; pending: Transaction };
  };
  marcus: { score: ScoreState; payCycle: PayCycleSummary; offers: Offer[]; centrelink: Transaction };
  priya: { score: ScoreState; factor: Factor };
}

type SheetState = { title: string; body: ReactNode } | null;

function Section({ id, title, note, children }: { id: string; title: string; note?: string; children: (theme: "light" | "dark") => ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="border-t border-line py-t7">
      <h2 id={`${id}-h`} className="px-gutter text-h2 font-display">{title}</h2>
      {note && <p className="mt-t1 max-w-3xl px-gutter text-small text-text-muted">{note}</p>}
      <div className="mt-t5 grid gap-t5 px-gutter lg:grid-cols-2">
        {(["light", "dark"] as const).map((th) => (
          <div key={th} data-theme={th} className="min-w-0 rounded-lg bg-bg p-t4 text-text">
            <p className="mb-t3 text-caption text-text-muted">{th === "light" ? "Light" : "Dark"}</p>
            <div className="mx-auto flex max-w-[350px] flex-col gap-t4">{children(th)}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

const Label = ({ children }: { children: ReactNode }) => <p className="text-caption text-text-muted">{children}</p>;

export function Showcase({ data }: { data: ShowcaseData }) {
  const { jess, marcus, priya } = data;
  const toast = useToast();
  const [sheet, setSheet] = useState<SheetState>(null);
  const [donutSel, setDonutSel] = useState<SpendCategory | null>(null);
  const [period, setPeriod] = useState("this_cycle");
  const [dir, setDir] = useState<"all" | "out" | "in">("all");
  const [filters, setFilters] = useState(["Food & dining", "Uber Eats"]);
  const [check, setCheck] = useState(false);
  const [toggle, setToggle] = useState(true);
  const [radio, setRadio] = useState<"fortnight" | "month" | null>("fortnight");
  const [cents, setCents] = useState<number | null>(30000);
  const [dismissed, setDismissed] = useState(false);
  const [saved, setSaved] = useState(false);
  const [recDismissed, setRecDismissed] = useState(false);

  const adv = jess.advance!;
  const pa = insightCopy.payAdvance(formatWhole(adv.amount), adv.provider, formatDayMonth(adv.since), formatWhole(adv.fee ?? 0));
  const g = jess.gambling!;
  const gi = insightCopy.gambling(formatPercent(g.pctOfIncome90), g.factor !== null ? formatFactor(g.factor) : null);
  const bi = insightCopy.borrowing(jess.loanTotals.counts.sacc + jess.loanTotals.counts.macc + jess.loanTotals.counts.aocc, formatWhole(jess.loanTotals.totalOutstanding));
  const insights: InsightItem[] = [{ id: "pay-advance", ...pa }, { id: "gambling", ...gi }, { id: "borrowing", ...bi }];
  const openInsight = (id: string) => {
    const it = insights.find((x) => x.id === id)!;
    setSheet({ title: it.title, body: <InsightSheetBody item={it} /> });
  };
  const empty: EmptyVariant[] = ["noBankData", "noOffers", "noTransactions", "noSubscriptions", "noRecommendations", "noSearchResults"];
  const saccs = jess.loans.filter((l) => l.type === "SACC");

  return (
    <main className="min-h-screen bg-bg pb-t8 text-text">
      <header className="flex flex-wrap items-center justify-between gap-t3 px-gutter py-t5">
        <div>
          <p className="text-caption text-text-muted">Dev · Phase 1 · data as of {formatDayMonth(data.asOf)}</p>
          <h1 className="text-h1 font-display">Components</h1>
        </div>
        <ThemeToggle />
      </header>

      <Section id="score-ring" title="01 ScoreRing" note="Jess 472 (22/150 to Healthy), Marcus 612, Priya thin file, loading and unavailable.">
        {() => (
          <>
            <Label>Hero · brand surface (Jess)</Label>
            <div className="brand-surface rounded-lg p-t5"><ScoreRing state={jess.score} brand /></div>
            <Label>Hero · neutral (Jess)</Label>
            <div className="rounded-lg bg-surface p-t5"><ScoreRing state={jess.score} /></div>
            <Label>Medium (Marcus) · Small (Jess)</Label>
            <div className="flex items-start justify-between rounded-lg bg-surface p-t5">
              <ScoreRing state={marcus.score} size="medium" />
              <ScoreRing state={jess.score} size="small" />
            </div>
            <Label>Loading · Not enough history (Priya) · Unavailable</Label>
            <div className="grid grid-cols-3 gap-t2 rounded-lg bg-surface p-t3">
              <ScoreRing state={jess.score} size="medium" loading />
              <ScoreRing state={priya.score} size="medium" />
              <ScoreRing state={{ kind: "unavailable" }} size="medium" onSeeDetails={() => setSheet({ title: "Your SmartScore", body: <p className="text-body text-text-muted">{copy.score.unavailable}</p> })} />
            </div>
          </>
        )}
      </Section>

      <Section id="stage-scale" title="02 StageScale">
        {() => (
          <>
            {jess.score.kind === "scored" && <StageScale score={jess.score.score} stage={jess.score.stage} onStage={(s) => setSheet({ title: `About ${s}`, body: <p className="text-body text-text-muted">Stage bands are sample values (Q4).</p> })} onNext={() => {}} />}
            {marcus.score.kind === "scored" && <StageScale score={marcus.score.score} stage={marcus.score.stage} />}
          </>
        )}
      </Section>

      <Section id="factor-tile" title="03 FactorTile" note="Top three (lowest actionable), strongest, and a null factor (Priya).">
        {() => (
          <>
            {jess.top.map((f) => <FactorTile key={f.key} factor={f} onOpen={() => setSheet({ title: f.name, body: <p className="text-body text-text-muted">{f.explains}</p> })} />)}
            {jess.strongest && <FactorTile factor={jess.strongest} strongest />}
            <FactorTile factor={priya.factor} />
          </>
        )}
      </Section>

      <Section id="pay-cycle" title="04 PayCycleHero" note="Jess: short before payday (caution, not red). Marcus: money left.">
        {() => (
          <>
            <PayCycleHero summary={jess.payCycle} onDue={() => toast({ kind: "info", message: "Opens the due-items sheet" })} />
            <PayCycleHero summary={marcus.payCycle} />
          </>
        )}
      </Section>

      <Section id="insight" title="05 InsightCard + InsightSheet" note="Manual pager, no autoplay. See how opens the sheet.">
        {() => (
          <>
            <InsightCard items={insights} onOpen={openInsight} />
            <InsightCard items={[]} loading />
            <InsightCard items={[]} />
            <InsightCard items={insights} dismissed onDismissUndo={() => setDismissed(!dismissed)} />
          </>
        )}
      </Section>

      <Section id="category-row" title="06 CategoryRow" note="Gambling looks like every other row. Budgets here are example values (budgets are customer-set).">
        {() => {
          const gam = jess.rows.find((r) => r.category === "gambling")!;
          const food = jess.rows.find((r) => r.category === "food")!;
          const groc = jess.rows.find((r) => r.category === "groceries")!;
          return (
            <>
              <CategoryRow row={jess.rows[0]!} merchants={jess.merchants[jess.rows[0]!.category]} />
              <CategoryRow row={gam} merchants={jess.merchants.gambling} insightLabel="See insight" onInsight={() => openInsight("gambling")} />
              <CategoryRow row={food} merchants={jess.merchants.food} showLifestyle budget={150} defaultExpanded />
              <CategoryRow row={groc} merchants={jess.merchants.groceries} budget={60} />
              <CategoryRow row={jess.rows.find((r) => r.category === "transport")!} budget={null} />
            </>
          );
        }}
      </Section>

      <Section id="donut" title="07 Donut" note="Tap a slice or legend row to select; tap again clears. Others use contrast-safe dimmed fills.">
        {() => <Donut rows={jess.rows} total={jess.payCycle.spent} periodLabel={jess.cycleLabel} selected={donutSel} onSelect={setDonutSel} />}
      </Section>

      <Section id="transaction-row" title="08 TransactionRow" note="Posted, pending, recategorised, and Centrelink income (styled like wages).">
        {() => (
          <div className="overflow-hidden rounded-md">
            <TransactionRow tx={jess.tx.posted} />
            <TransactionRow tx={jess.tx.pending} />
            <TransactionRow tx={jess.tx.posted} edited />
            <TransactionRow tx={marcus.centrelink} />
          </div>
        )}
      </Section>

      <Section id="sheet" title="09 BottomSheet / drawer" note="Bottom sheet below 1,024 px, right drawer at ≥1,024. Escape, scrim and Close all close; focus returns.">
        {() => <Button variant="secondary" full onClick={() => setSheet({ title: "Example sheet", subtitle: undefined, body: <p className="text-body text-text-muted">Sheet body scrolls inside the panel.</p> } as SheetState)}>Open sheet</Button>}
      </Section>

      <Section id="controls" title="10 SegmentedControl · Chip · FilterChip">
        {() => (
          <>
            <SegmentedControl label="Transaction direction" value={dir} onChange={setDir} options={[{ value: "all", label: "All" }, { value: "out", label: "Money out" }, { value: "in", label: "Money in" }]} />
            <ChipGroup label="Period">
              {(["this_cycle", "last_cycle", "3_months", "12_months"] as const).map((p) => (
                <Chip key={p} selected={period === p} onClick={() => setPeriod(p)}>{({ this_cycle: "This pay cycle", last_cycle: "Last pay cycle", "3_months": "3 months", "12_months": "12 months" })[p]}</Chip>
              ))}
              <Chip disabled>Custom</Chip>
            </ChipGroup>
            <div className="flex flex-wrap gap-t2">{filters.map((f) => <FilterChip key={f} label={f} onRemove={() => setFilters(filters.filter((x) => x !== f))} />)}</div>
          </>
        )}
      </Section>

      <Section id="calendar" title="11 CalendarCell" note="Jess's fortnight. Arrow keys move; Enter opens the day. 30/09 is the only (forecast) below-$0 day.">
        {() => (
          <div className="rounded-md bg-surface p-t2">
            <CalendarGrid
              days={jess.calendar.days}
              label={`Pay cycle ${formatDayMonth(jess.calendar.days[0]!.date)} – ${formatDayMonth(jess.calendar.days[13]!.date)}`}
              nextPayday={jess.calendar.nextPayday}
              spendCategories={jess.spendCats}
              onDay={(d) => setSheet({ title: `Day ${formatDayMonth(d.date)}`, body: <DayDetail day={d} /> })}
            />
          </div>
        )}
      </Section>

      <Section id="loan-card" title="12 LoanCard" note="Right Road has its own estimate (one medium loan). Two small loans share one TaleFin total, so no per-loan balance.">
        {() => (
          <>
            {jess.loans.map((l) => (
              <LoanCard key={l.provider} loan={l} defaultExpanded={l.type !== "SACC"}
                combinedBalance={l.estimatedBalance === null && l.type === "SACC" ? copy.loans.combinedBalance(formatWhole(jess.loanTotals.saccOutstanding), saccs.length) : undefined} />
            ))}
          </>
        )}
      </Section>

      <Section id="offer-card" title="13 OfferCard" note="Marcus's sample offer. No urgency, no ranking.">
        {() => <>{marcus.offers.map((o) => <OfferCard key={o.id} offer={o} />)}</>}
      </Section>

      <Section id="recommendation" title="14 RecommendationCard">
        {() => (
          <RecommendationCard
            item={{ id: "pay-advance", factor: pa.context, title: pa.title, rationale: pa.rationale }}
            saved={saved} dismissed={recDismissed}
            onSeeHow={() => openInsight("pay-advance")} onSave={() => setSaved(true)} onUnsave={() => setSaved(false)}
            onDismiss={() => setRecDismissed(true)} onUndoDismiss={() => setRecDismissed(false)}
          />
        )}
      </Section>

      <Section id="forms" title="15 Buttons and form controls">
        {() => (
          <>
            <div className="flex flex-wrap gap-t2">
              <Button>Primary</Button><Button variant="secondary">Secondary</Button><Button variant="tertiary">Tertiary</Button><Button variant="destructive">Disconnect</Button>
            </div>
            <div className="flex flex-wrap items-center gap-t2">
              <Button size="compact">Compact</Button><Button size="standard">Standard</Button><Button size="large">Large</Button>
            </div>
            <div className="flex flex-wrap gap-t2"><Button disabled>Disabled</Button><Button loading>Save</Button></div>
            <TextInput label="Name" defaultValue="Jess" autoComplete="given-name" />
            <TextInput label="Email" type="email" error="Enter an email address like name@example.com" defaultValue="jess@" />
            <TextInput label="Mobile" readOnly defaultValue="0412 345 678" />
            <CurrencyInput label="Extra per pay cycle" valueCents={cents} onChangeCents={setCents}
              errorText={{ format: "Enter an amount like 25 or 25.50", precision: "Use up to two decimal places", negative: "Enter an amount above $0" }} />
            <Checkbox label="Let Tippla read my bank data through TaleFin" checked={check} onChange={setCheck} />
            <Checkbox label="Disabled option" checked disabled onChange={() => {}} />
            <Toggle label="Bill reminders by SMS" checked={toggle} onChange={setToggle} />
            <Toggle label="Saving example" checked saving onChange={() => {}} />
            <RadioGroup legend="Repayment frequency" value={radio} onChange={setRadio} options={[{ value: "fortnight", label: "Every fortnight" }, { value: "month", label: "Every month" }]} />
          </>
        )}
      </Section>

      <Section id="feedback" title="16 Toast · InlineAlert · EmptyState · Skeleton">
        {() => (
          <>
            <div className="flex flex-wrap gap-t2">
              <Button variant="secondary" onClick={() => toast({ kind: "confirm", message: "Moved to Groceries. Totals updated", onUndo: () => {} })}>Show confirmation toast</Button>
              <Button variant="tertiary" onClick={() => toast({ kind: "info", message: "Updated Fri 25/09, 9:14am" })}>Show info toast</Button>
            </div>
            <InlineAlert title="Predicted bills">These are based on your recent payments, so dates and amounts may change.</InlineAlert>
            <InlineAlert tone="caution" title={copy.payCycle.short(formatWhole(-jess.payCycle.leftAfterBills))} action={{ label: "Options if money's tight", onClick: () => {} }}>
              {`${formatWhole(jess.payCycle.balance)} balance − ${formatWhole(jess.payCycle.dueTotal)} due before payday.`}
            </InlineAlert>
            {empty.map((v) => <EmptyState key={v} variant={v} query="Uber" onAction={() => {}} />)}
            <EmptyState variant="noOffers" illustrated onAction={() => {}} />
            <div aria-hidden className="rounded-md bg-surface p-t5">
              <Skeleton className="h-[40px] w-[40px]" /><Skeleton className="mt-t3 h-t4 w-3/4" /><Skeleton className="mt-t2 h-t3 w-1/2" /><Skeleton className="mt-t4 h-tap w-full rounded-sm" />
            </div>
          </>
        )}
      </Section>

      <Section id="nav" title="17 Bottom tab bar · Desktop sidebar" note="Hardship support is always visible: a row above the mobile dock, and pinned at the bottom of the rail.">
        {(th) => (
          <>
            <div className="overflow-hidden rounded-md border border-line"><MobileDock preview={`${th}, Home`} path="/" /></div>
            <div className="overflow-hidden rounded-md border border-line"><MobileDock preview={`${th}, Loans`} path="/loans" /></div>
            <div className="overflow-hidden rounded-md border border-line"><DesktopSidebar preview={`${th}, desktop`} path="/hardship" /></div>
          </>
        )}
      </Section>

      <Sheet open={!!sheet} onClose={() => setSheet(null)} title={sheet?.title ?? ""}
        footer={sheet ? <Button full onClick={() => setSheet(null)}>Done</Button> : undefined}>
        {sheet?.body}
      </Sheet>
    </main>
  );
}
