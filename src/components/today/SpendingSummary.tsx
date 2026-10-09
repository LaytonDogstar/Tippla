// Spending on Today (single column, 09/10/2026): how this pay cycle compares with the same point of the last one.
// "$1,832 by day 9 of 14", then the change against day 9 of the last cycle (never the whole of it, which would make
// every mid-cycle view look like underspending), the usual full cycle, fixed costs as one line, and everyday
// categories by amount spent (never by size of change). Changes over CHANGE_THRESHOLD get a soft tint; smaller
// ones stay grey. With no previous cycle to compare, the comparison and the change column are left out.
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { todayCopy } from "@/content/today";
import { categoryNames } from "@/content/en-AU";
import { formatWhole } from "@/lib/format";
import type { ChangeTone, SpendingSoFar } from "@/lib/selectors/today";
import { catVar } from "@/components/icons";
import { cx } from "@/components/ui/cx";
import { Card } from "./Card";

const t = todayCopy.spending;
const TONE: Record<ChangeTone, string> = { up: "bg-negative-soft text-negative", down: "bg-positive-soft text-positive", neutral: "text-text-muted" };

export function SpendingSummary({ s }: { s: SpendingSoFar }) {
  const compare = s.change !== null;
  return (
    <Card id="spending-h" title={t.heading} action={{ href: "/spending", label: t.explore }}>
      <p className="tnum flex flex-wrap items-baseline gap-x-t2">
        <span className="text-section-num text-text desktop:text-section-num-l">{formatWhole(s.total)}</span>
        <span className="text-body14 text-text-muted">{t.byDay(s.day, s.of)}</span>
      </p>
      {compare && (
        <p className="tnum mt-t1 text-body14 font-semibold text-text">
          {Math.round(s.change!) === 0 ? t.same : <><span aria-hidden>{s.change! > 0 ? "↑ " : "↓ "}</span>{s.change! > 0 ? t.more(formatWhole(s.change!)) : t.less(formatWhole(-s.change!))}</>}
        </p>
      )}
      {s.usual !== null && <p className="tnum mt-t1 text-meta text-text-muted">{t.usually(formatWhole(s.usual))}</p>}

      {s.fixed.total > 0 && (
        <div className="tnum mt-t4 flex items-center gap-t3 rounded-inset bg-surface2 px-t3 py-t3">
          <span className="min-w-0 flex-1">
            <strong className="block text-body14 font-bold text-text">{t.fixed}</strong>
            <span className="block text-meta text-text-muted">{s.fixed.categories.map((c) => categoryNames[c]).join(" · ")}</span>
          </span>
          <span className="text-body14 font-bold text-text">{formatWhole(s.fixed.total)}</span>
          {compare && s.fixed.change !== null && (
            <span className="w-[64px] text-right text-meta text-text-muted">
              {Math.round(s.fixed.change) === 0 ? t.fixedSame : <Change amount={s.fixed.change} tone="neutral" />}
            </span>
          )}
        </div>
      )}

      {(s.everyday.length > 0 || s.other) && (
        <div className="mt-t4">
          <div className="flex items-baseline gap-t3 pb-t1">
            <h3 className="flex-1 text-body14 font-bold text-text">{t.everyday}</h3>
            {compare && <span className="text-meta-s text-text-muted">{t.sinceLast}</span>}
          </div>
          <ul className="-mx-t2">
            {s.everyday.map((r) => (
              <li key={r.category}>
                <Link href={`/spending?category=${r.category}`} className="tnum flex min-h-tap items-center gap-t2 rounded-md px-t2 text-body14 hover:bg-surface2">
                  <span aria-hidden className="h-[10px] w-[10px] shrink-0 rounded-pill" style={{ background: catVar(r.category) }} />
                  <span className="min-w-0 flex-1 text-text-secondary">{categoryNames[r.category]}</span>
                  <strong className="font-bold text-text">{formatWhole(r.total)}</strong>
                  {compare && <span className="flex w-[72px] justify-end">{r.change !== null && <Change amount={r.change} tone={r.tone} />}</span>}
                  <ChevronRight aria-hidden size={16} className="shrink-0 text-icon-muted" />
                </Link>
              </li>
            ))}
            {s.other && (
              <li>
                <Link href="/spending?tab=categories" className="tnum flex min-h-tap items-center gap-t2 rounded-md px-t2 text-body14 hover:bg-surface2">
                  <span aria-hidden className="h-[10px] w-[10px] shrink-0 rounded-pill bg-icon-muted" />
                  <span className="min-w-0 flex-1 text-text-secondary">{t.otherN(s.other.count)}</span>
                  <strong className="font-bold text-text">{formatWhole(s.other.total)}</strong>
                  {compare && <span className="flex w-[72px] justify-end">{s.other.change !== null && <Change amount={s.other.change} tone={s.other.tone} />}</span>}
                  <ChevronRight aria-hidden size={16} className="shrink-0 text-icon-muted" />
                </Link>
              </li>
            )}
          </ul>
        </div>
      )}
    </Card>
  );
}

function Change({ amount, tone }: { amount: number; tone: ChangeTone }) {
  const n = Math.round(amount);
  if (n === 0) return <span className="text-meta text-text-muted"><span aria-hidden>—</span><span className="sr-only">, {t.sameSr}</span></span>;
  return (
    <span className={cx("whitespace-nowrap rounded-pill text-meta font-semibold", tone !== "neutral" && "px-t2", TONE[tone])}>
      <span aria-hidden>{n > 0 ? "↑" : "↓"} {formatWhole(Math.abs(n))}</span>
      <span className="sr-only">, {t.changeSr(formatWhole(Math.abs(n)), n > 0)}</span>
    </span>
  );
}
