// Spending on Today (09/10/2026): the same summary component and selector as the Spending page (SpendSummary,
// spendingView), so both show the same numbers. Then fixed costs and repayments as one line each, and everyday
// categories by amount spent (never by size of change): the top five, then Other. The change column compares the
// same day of the last cycle and is tinted only past CHANGE_THRESHOLD. With no previous cycle there's no comparison.
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { todayCopy } from "@/content/today";
import { formatWhole } from "@/lib/format";
import { sumMoney } from "@/lib/format/money";
import type { SpendingView } from "@/lib/selectors/spendingCycle";
import { changeTone, type ChangeTone } from "@/lib/selectors/today";
import { catVar } from "@/components/icons";
import { SpendSummary } from "@/components/money/SpendSummary";
import { cx } from "@/components/ui/cx";
import { Card } from "./Card";

const t = todayCopy.spending;
/** Everyday categories named on Today before "Other (n categories)". */
export const TODAY_TOP_CATEGORIES = 5;
const TONE: Record<ChangeTone, string> = { up: "bg-negative-soft text-negative", down: "bg-positive-soft text-positive", neutral: "text-text-muted" };

export function SpendingSummary({ v }: { v: SpendingView }) {
  const rows = v.groups.flatMap((g) => g.rows).sort((a, b) => b.total - a.total);
  const top = rows.slice(0, TODAY_TOP_CATEGORIES);
  const rest = rows.slice(TODAY_TOP_CATEGORIES);
  const compare = rows.some((r) => r.previous !== null);
  const other = rest.length ? (() => {
    const total = sumMoney(rest.map((r) => r.total));
    const prev = compare ? sumMoney(rest.map((r) => r.previous ?? 0)) : null;
    const change = prev === null ? null : sumMoney([total, -prev]);
    return { count: rest.length, total, change, tone: change === null ? "neutral" as const : changeTone(change, prev!) };
  })() : null;
  return (
    <Card id="spending-h" title={t.heading} action={{ href: "/spending", label: t.explore }}>
      <SpendSummary v={v} />
      {[{ label: t.fixed, line: v.fixed }, { label: t.repayments, line: v.repayments }].filter((x) => x.line.total > 0).map(({ label, line }) => (
        <div key={label} className="tnum mt-t3 flex items-center gap-t3 rounded-inset bg-surface2 px-t3 py-t3">
          <span className="min-w-0 flex-1">
            <strong className="block text-body14 font-bold text-text">{label}</strong>
            <span className="block text-meta text-text-muted">{line.categories.map((c) => c.name).join(" · ")}</span>
          </span>
          <span className="text-body14 font-bold text-text">{formatWhole(line.total)}</span>
          {compare && line.change !== null && (
            <span className="w-[64px] text-right text-meta text-text-muted">{Math.round(line.change) === 0 ? t.fixedSame : <Change amount={line.change} tone="neutral" />}</span>
          )}
        </div>
      ))}

      {rows.length > 0 && (
        <div className="mt-t4">
          <div className="flex items-baseline gap-t3 pb-t1">
            <h3 className="flex-1 text-body14 font-bold text-text">{t.everyday}</h3>
            {compare && <span className="text-meta-s text-text-muted">{t.sinceLast}</span>}
          </div>
          <ul className="-mx-t2">
            {top.map((r) => (
              <li key={r.category}>
                <Link href={`/spending?category=${r.category}`} className="tnum flex min-h-tap items-center gap-t2 rounded-md px-t2 text-body14 hover:bg-surface2">
                  <span aria-hidden className="h-[10px] w-[10px] shrink-0 rounded-pill" style={{ background: catVar(r.category) }} />
                  <span className="min-w-0 flex-1 text-text-secondary">{r.name}</span>
                  <strong className="font-bold text-text">{formatWhole(r.total)}</strong>
                  {compare && <span className="flex w-[72px] justify-end">{r.previous !== null && r.change !== null && <Change amount={r.change} tone={r.tone} />}</span>}
                  <ChevronRight aria-hidden size={16} className="shrink-0 text-icon-muted" />
                </Link>
              </li>
            ))}
            {other && (
              <li>
                <Link href="/spending" className="tnum flex min-h-tap items-center gap-t2 rounded-md px-t2 text-body14 hover:bg-surface2">
                  <span aria-hidden className="h-[10px] w-[10px] shrink-0 rounded-pill bg-icon-muted" />
                  <span className="min-w-0 flex-1 text-text-secondary">{t.otherN(other.count)}</span>
                  <strong className="font-bold text-text">{formatWhole(other.total)}</strong>
                  {compare && <span className="flex w-[72px] justify-end">{other.change !== null && <Change amount={other.change} tone={other.tone} />}</span>}
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
