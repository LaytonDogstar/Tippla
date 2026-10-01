"use client";
import { useEffect, useState } from "react";
import { compare as t } from "@/content/spending";
import { formatDayMonth, formatWhole } from "@/lib/format";
import type { compareWithHistory, sampleCohort } from "@/lib/selectors/cohort";
import { catVar } from "@/components/icons";
import { SegmentedControl } from "@/components/ui/Chips";
import { SampleTag } from "@/components/ui/SampleTag";

type Tab = "history" | "cohort";

export function CompareView({ present, initialTab, history, cohort }: {
  present: boolean; initialTab: Tab; history: ReturnType<typeof compareWithHistory>; cohort: ReturnType<typeof sampleCohort>;
}) {
  const [tab, setTab] = useState<Tab>(initialTab);
  useEffect(() => {
    const u = new URL(window.location.href);
    if (tab === "cohort") u.searchParams.set("tab", "cohort"); else u.searchParams.delete("tab");
    window.history.replaceState(window.history.state, "", u.toString());
  }, [tab]);
  return (
    <div className="pb-t6">
      <h1 className="sr-only">{t.title}</h1>
      <p className="mt-t2 text-small text-text-muted">{t.intro}</p>
      <div className="mt-t4">
        <SegmentedControl label={t.tabsLabel} value={tab} onChange={setTab}
          options={[{ value: "history", label: t.tabs.history }, { value: "cohort", label: t.tabs.cohort }]} />
      </div>
      {tab === "history" ? <History h={history} /> : <Cohort c={cohort} present={present} />}
    </div>
  );
}

function History({ h }: { h: ReturnType<typeof compareWithHistory> }) {
  if (!h.hasHistory) return <p className="mt-t4 rounded-md bg-surface p-t5 text-small text-text">{t.history.notEnough}</p>;
  const max = Math.max(1, ...h.rows.flatMap((r) => [r.thisCycle, ...r.cycles.map((c) => c.total)]));
  return (
    <>
      <p className="mt-t4 text-small text-text-muted">{t.history.note(h.daysSoFar)}</p>
      <ul className="mt-t3 flex flex-col gap-t3">
        {h.rows.map((r) => (
          <li key={r.category} className="rounded-md bg-surface p-t4">
            <div className="flex flex-wrap items-baseline justify-between gap-x-t3">
              <h2 className="text-h3 text-text">{r.name}</h2>
              <span className="tnum text-small text-text-muted">{t.history.average}: <span className="text-body-strong text-text">{formatWhole(r.average)}</span></span>
            </div>
            <dl className="mt-t3 flex flex-col gap-t2">
              {[...r.cycles.map((c) => ({ label: t.history.cycleLabel(formatDayMonth(c.start)), v: c.total, now: false })), { label: t.history.thisCycle, v: r.thisCycle, now: true }].map((b) => (
                <div key={b.label} className="grid grid-cols-[112px_1fr_auto] items-center gap-t3">
                  <dt className="text-caption text-text-muted">{b.label}</dt>
                  <span aria-hidden className="h-t3 overflow-hidden rounded-pill" style={{ background: "var(--chart-ring-track)" }}>
                    <span className="block h-full rounded-pill" style={{ width: `${(b.v / max) * 100}%`, background: b.now ? "repeating-linear-gradient(45deg, var(--chart-hatch) 0 2px, var(--color-surface) 2px 6px)" : catVar(r.category), outline: b.now ? `2px solid ${catVar(r.category)}` : undefined, outlineOffset: -2 }} />
                  </span>
                  <dd className="tnum text-small text-text">{formatWhole(b.v)}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
    </>
  );
}

function Cohort({ c, present }: { c: ReturnType<typeof sampleCohort>; present: boolean }) {
  const income = t.cohort.incomeBand(formatWhole(c.incomeBand.from), formatWhole(c.incomeBand.to));
  return (
    <>
      <div className="mt-t4 flex flex-wrap items-center gap-t2">
        <span className="inline-flex h-[24px] items-center rounded-xs bg-neutral-soft px-t2 text-caption text-neutral">{t.cohort.sample}</span>
        <SampleTag q="Q6" present={present} />
      </div>
      <p className="mt-t3 text-small text-text">{t.cohort.intro}</p>
      <p className="mt-t1 text-small text-text-muted">{t.cohort.who(c.ageBand, income, c.region)}</p>
      <p className="mt-t1 text-caption text-text-muted">{t.cohort.perCycle} {t.cohort.excluded}</p>
      <ul className="mt-t3 flex flex-col gap-t3">
        {c.rows.map((r) => {
          const max = Math.max(r.high * 1.25, (r.you ?? 0) * 1.1, 1);
          const pct = (v: number) => `${Math.min(100, (v / max) * 100)}%`;
          const label = t.cohort.row(r.name, r.you === null ? "—" : formatWhole(r.you), formatWhole(r.low), formatWhole(r.high), formatWhole(r.middle));
          return (
            <li key={r.category} className="rounded-md bg-surface p-t4">
              <div className="flex flex-wrap items-baseline justify-between gap-x-t3">
                <h2 className="text-h3 text-text">{r.name}</h2>
                <span className="tnum text-small text-text">{t.cohort.you} {r.you === null ? "—" : formatWhole(r.you)}</span>
              </div>
              <div role="img" aria-label={label} className="relative mt-t4 h-[24px]">
                <span className="absolute inset-x-0 top-[10px] h-[4px] rounded-pill" style={{ background: "var(--chart-ring-track)" }} />
                <span className="absolute top-[6px] h-[12px] rounded-pill bg-accent-soft" style={{ left: pct(r.low), width: `calc(${pct(r.high)} - ${pct(r.low)})`, boxShadow: "inset 0 0 0 1px var(--color-accent)" }} />
                <span className="absolute top-[4px] h-[16px] w-[2px] bg-text-muted" style={{ left: pct(r.middle) }} />
                {r.you !== null && <span className="absolute top-[2px] h-[20px] w-[20px] -translate-x-1/2 rounded-pill border-2 border-surface bg-accent" style={{ left: pct(r.you) }} />}
              </div>
              <p aria-hidden className="tnum mt-t2 text-caption text-text-muted">{t.cohort.typical} {formatWhole(r.low)}–{formatWhole(r.high)} · {t.cohort.middle} {formatWhole(r.middle)}</p>
            </li>
          );
        })}
      </ul>
    </>
  );
}
