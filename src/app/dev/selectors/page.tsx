// Dev-only: every selector output per persona, plus the headline figures in customer format.
// /dev/selectors?persona=marcus  ·  &fail=score to simulate a score API failure.
import Link from "next/link";
import { DEFAULT_PERSONA, isPersona, loadPersona, PERSONAS, type FailTarget } from "@/lib/api/client";
import { STAGES_ARE_SAMPLE } from "@/config/stages";
import { copy, weekdayLong } from "@/content/en-AU";
import { formatDate, formatDayMonth, formatFactor, formatMonthLong, formatMonthShort, formatPercent, formatShortDay, formatUpdated, formatWhole } from "@/lib/format";
import { allSelectorOutputs } from "@/lib/selectors/debug";
import { ThemeToggle } from "@/components/dev/ThemeToggle";

export const dynamic = "force-dynamic";

type Search = { persona?: string; fail?: string };

export default async function SelectorsPage({ searchParams }: { searchParams: Search }) {
  const persona = isPersona(searchParams.persona) ? searchParams.persona : DEFAULT_PERSONA;
  const fail = (["score", "bank", "all"] as const).find((f) => f === searchParams.fail) as FailTarget | undefined;

  let loaded;
  try {
    loaded = await loadPersona(persona, { fail });
  } catch (e) {
    return (
      <Shell persona={persona}>
        <p className="rounded-md bg-caution-soft p-t4 text-caution">Bank data request failed ({String((e as Error).message)}). The real app shows cached data with &quot;Couldn&apos;t refresh&quot;.</p>
      </Shell>
    );
  }
  const { data: d, scoreError } = loaded;
  const out = allSelectorOutputs(d);
  const pc = out.payCycle;
  const st = out.score.state;

  const figures: [string, string][] = [];
  if (st.kind === "scored") {
    figures.push(["SmartScore", `${st.score} · ${st.stage.name}${STAGES_ARE_SAMPLE ? " (sample bands, Q4)" : ""}`]);
    figures.push(["Next stage", st.stage.next ? copy.score.nextStage(st.stage.next.name, st.stage.next.at, st.stage.next.pointsToGo) : copy.score.topStage]);
    figures.push(["Ring progress", formatPercent(st.stage.progress * 100, 0)]);
    figures.push(["Updated", formatUpdated(st.scoredAt)]);
  } else if (st.kind === "override") {
    figures.push(["SmartScore", `No score (override ${st.code}, ${st.override})`]);
    if (st.estimatedReadyDate) figures.push(["Expected", copy.score.thinFileDate(formatDate(st.estimatedReadyDate))]);
  } else figures.push(["SmartScore", copy.score.unavailable]);
  if (out.score.change) figures.push(["Change", copy.score.change(out.score.change.delta, formatDayMonth(out.score.change.since))]);
  out.score.topThree.forEach((f, i) => figures.push([`Top factor ${i + 1}`, `${f.name} · ${formatFactor(f.value!)}`]));
  if (out.score.strongest) figures.push(["Strongest", copy.score.strongest(out.score.strongest.name, out.score.strongest.value!.toFixed(1))]);
  figures.push(["Banner", out.banner ? out.banner.kind : "none"]);
  figures.push(["Pay cycle", copy.payCycle.range(formatDayMonth(pc.cycle.start), formatDayMonth(pc.cycle.end))]);
  figures.push(["Payday", copy.payCycle.daysToPayday(pc.daysToPayday, formatShortDay(pc.nextPayday))]);
  figures.push(["Spent", copy.payCycle.spent(formatWhole(pc.spent))]);
  figures.push(["Paid in", `${copy.payCycle.paidIn(formatWhole(pc.paidIn))} (${pc.incomeLines.map((l) => `${l.payer} ${formatWhole(l.amount)} ${formatShortDay(l.date)}`).join(", ")})`]);
  pc.payAdvances.forEach((a) =>
    figures.push(["Pay advance", a.repayAmount !== null && a.repayDate
      ? copy.payCycle.payAdvance(formatWhole(a.amount), formatWhole(a.repayAmount), formatDayMonth(a.repayDate), formatWhole(a.fee ?? 0))
      : `${formatWhole(a.amount)} from ${a.provider}`]));
  figures.push(["Due before payday", `${copy.payCycle.due(formatWhole(pc.dueTotal))}: ${pc.dueBeforePayday.map((b) => `${b.merchant} ${formatWhole(b.expected_amount)} (${formatShortDay(b.date)})`).join(", ") || "nothing"}`]);
  figures.push(["Balance", formatWhole(pc.balance)]);
  figures.push(["Headline", pc.isShort ? copy.payCycle.short(formatWhole(-pc.leftAfterBills)) : copy.payCycle.left(formatWhole(pc.leftAfterBills))]);
  if (out.nextBill) figures.push(["Next bill", `${formatShortDay(out.nextBill.date)} · ${out.nextBill.merchant} · ${formatWhole(out.nextBill.expected_amount)} · predicted`]);
  figures.push(["Six months", out.sixMonthSpending.map((b) => `${formatMonthShort(b.month)} ${b.total === null ? copy.months.noData : formatWhole(b.total)}${b.partial ? ` (${copy.months.partial(formatDayMonth(d.asOf))})` : ""}`).join(" · ")]);
  figures.push(["Monthly income", `${formatWhole(out.income.monthly.amount)}${out.income.monthly.basedOnDays < 90 ? ` (${copy.income.basedOn(out.income.monthly.basedOnDays)})` : ""}`]);
  if (out.income.pattern.weekday && out.income.pattern.everyDays === 14)
    figures.push(["Pay pattern", copy.income.payPattern(formatWhole(out.income.pattern.typicalAmount), weekdayLong[out.income.pattern.weekday] ?? "")]);
  figures.push(["Income coming in", pc.expectedIncome.map((i) => copy.income.expected(i.payer, formatWhole(i.amount), i.exact, formatShortDay(i.date))).join(" · ") || "none expected"]);
  out.loans.active.forEach((l) => figures.push([`Lender · ${l.provider}`, copy.loans.repaid(l.provider, formatWhole(l.activity.repaid90), l.activity.repayments90)]));
  figures.push(["Overdrawn", copy.balance.overdrawn(out.balance.daysOverdrawn90, 90)]);
  if (out.loans.dishonours90.count && out.loans.dishonours90.latest) figures.push(["Dishonours", copy.balance.dishonours(out.loans.dishonours90.count, formatDayMonth(out.loans.dishonours90.latest))]);
  if (out.loans.totals.debtToIncomePct90 !== null) figures.push(["Debt-to-income", copy.loans.dti(formatPercent(out.loans.totals.debtToIncomePct90, 0))]);
  if (out.gambling) {
    figures.push(["Gambling insight", `${copy.gambling.body(formatPercent(out.gambling.pctOfIncome90))}${out.gambling.factor !== null ? " " + copy.gambling.factor(formatFactor(out.gambling.factor)) : ""}`]);
    if (out.gambling.trend) figures.push(["Gambling trend", copy.gambling.trend(formatWhole(out.gambling.trend.from.amount), formatMonthLong(out.gambling.trend.from.month), formatWhole(out.gambling.trend.to.amount), formatMonthLong(out.gambling.trend.to.month))]);
  }

  return (
    <Shell persona={persona} fail={fail}>
      {scoreError && <p className="mb-t4 rounded-md bg-caution-soft p-t4 text-caution">Simulated score failure: the score shows its &quot;still being worked out&quot; state.</p>}
      <section aria-labelledby="figures" className="rounded-lg bg-surface p-t4 shadow-e1">
        <h2 id="figures" className="text-h2 font-display">Headline figures</h2>
        <p className="text-small text-text-muted">Formatted as a screen would show them. Data as of {formatShortDay(d.asOf)}.</p>
        <dl className="mt-t4 divide-y divide-line">
          {figures.map(([k, v], i) => (
            <div key={i} className="grid grid-cols-1 gap-t1 py-t2 sm:grid-cols-[180px_1fr]">
              <dt className="text-small font-semibold text-text-muted">{k}</dt>
              <dd className="tnum">{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="cats" className="mt-t5 rounded-lg bg-surface p-t4 shadow-e1">
        <h2 id="cats" className="text-h2 font-display">This pay cycle by category</h2>
        <ul className="mt-t3">
          {out.spending.this_cycle.categories.map((r) => (
            <li key={r.category} className="flex min-h-tap items-center gap-t3 border-b border-line last:border-0">
              <span aria-hidden className="h-t3 w-t3 shrink-0 rounded-pill" style={{ background: `var(--cat-${r.category.replace(/_/g, "-")})` }} />
              <span className="flex-1">{r.name}</span>
              <span className="tnum font-semibold">{formatWhole(r.total)}</span>
            </li>
          ))}
        </ul>
        <p className="mt-t2 text-small text-text-muted tnum">Total {formatWhole(out.spending.this_cycle.totalSpent)} (rows rounded)</p>
      </section>

      <section aria-labelledby="raw" className="mt-t5">
        <h2 id="raw" className="text-h2 font-display">Raw selector output</h2>
        {Object.entries(out).map(([k, v]) => (
          <details key={k} className="mt-t2 rounded-md bg-surface p-t3 shadow-e1">
            <summary className="min-h-tap cursor-pointer py-t2 font-semibold">{k}</summary>
            <pre className="mt-t2 max-h-[480px] overflow-auto rounded-sm bg-surface2 p-t3 text-caption">{JSON.stringify(v, null, 2)}</pre>
          </details>
        ))}
      </section>
    </Shell>
  );
}

function Shell({ persona, fail, children }: { persona: string; fail?: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-t5">
      <p className="text-eyebrow uppercase text-text-muted">Dev · Phase 0</p>
      <h1 className="font-display text-h1">Selectors</h1>
      <nav aria-label="Persona" className="mt-t4 flex flex-wrap items-center gap-t2">
        {PERSONAS.map((p) => (
          <Link
            key={p}
            href={`/dev/selectors?persona=${p}${fail ? `&fail=${fail}` : ""}`}
            aria-current={p === persona ? "page" : undefined}
            className={`inline-flex min-h-tap items-center rounded-pill px-t4 capitalize ${p === persona ? "bg-accent text-on-accent" : "border border-line bg-surface"}`}
          >
            {p}
          </Link>
        ))}
        <Link href={`/dev/selectors?persona=${persona}${fail ? "" : "&fail=score"}`} className="inline-flex min-h-tap items-center rounded-pill border border-line bg-surface px-t4 text-small">
          {fail ? "Clear failure" : "Simulate score failure"}
        </Link>
        <ThemeToggle />
      </nav>
      <div className="mt-t5">{children}</div>
    </main>
  );
}
