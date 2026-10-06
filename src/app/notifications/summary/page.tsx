// Weekly summary (the digest the customer can choose in Profile › Notifications): the week's events, safe to
// spend, goal and the value tally in one place. Never offers, gambling or alcohol (same events as the inbox).
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { loadCustomer } from "@/lib/customer";
import { currentPersona, presentationMode } from "@/lib/persona";
import { goalPlan, safeToSpendFor, valueTally, weeklySummary } from "@/lib/selectors";
import { summaryCopy as t, progressCopy } from "@/content/progress";
import { safeCopy } from "@/content/loop";
import { formatDayMonth, formatDollars, formatShortDay, formatWhole } from "@/lib/format";
import { PortalShell } from "@/components/shell/Portal";

export const dynamic = "force-dynamic";

export default async function Summary({ searchParams }: { searchParams: { persona?: string; present?: string } }) {
  const persona = currentPersona(searchParams.persona);
  const { data, account } = await loadCustomer(persona);
  const week = weeklySummary(data, account);
  const plan = goalPlan(data, account.goal);
  const safe = safeToSpendFor(data, account);
  const tally = valueTally(data, account);
  const row = "flex min-h-tap items-center justify-between gap-t3 border-t border-line px-t4 py-t3 hover:bg-surface2";
  return (
    <PortalShell path="/notifications/summary" title={t.title} backHref="/notifications" persona={persona} present={presentationMode(searchParams.present)}>
      <h1 className="sr-only">{t.title}</h1>
      <div className="flex flex-col gap-t4 pb-t6">
        <p className="mt-t2 text-small text-text-muted">{t.range(formatShortDay(week.from), formatShortDay(week.to))} · {t.intro}</p>
        <section aria-labelledby="sum-now" className="overflow-hidden rounded-md bg-surface">
          <h2 id="sum-now" className="sr-only">{t.updates}</h2>
          <Link href="/" className={row}>
            <span className="text-small text-text">{t.safe}</span>
            <span className="tnum text-body-strong text-text">{safe.nothingSpare ? safeCopy.none : safeCopy.perDay(formatWhole(safe.perDay))}</span>
          </Link>
          {plan && (
            <Link href="/progress" className={row}>
              <span className="text-small text-text">{t.goal}</span>
              <span className="text-body-strong text-text">{progressCopy.homeGoalPending(formatWhole(plan.amount), formatDayMonth(plan.by))}</span>
            </Link>
          )}
          <Link href="/progress" className={row}>
            <span className="text-small text-text">{t.saved}</span>
            <span className="tnum text-body-strong text-text">{formatDollars(tally.total)}</span>
          </Link>
        </section>
        <section aria-labelledby="sum-week">
          <h2 id="sum-week" className="px-t1 pb-t2 text-h3 text-text">{t.updates}</h2>
          {week.items.length ? (
            <ul className="overflow-hidden rounded-md bg-surface">
              {week.items.map((n) => (
                <li key={n.id} className="border-b border-line last:border-b-0">
                  <Link href={n.href} className="flex items-start gap-t3 p-t4 hover:bg-surface2">
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-baseline justify-between gap-x-t3">
                        <span className="text-body-strong text-text">{n.title}</span>
                        <span className="text-caption text-text-muted">{formatShortDay(n.date)}</span>
                      </span>
                      <span className="mt-t1 block text-small text-text-muted">{n.body}</span>
                    </span>
                    <ChevronRight aria-hidden size={20} className="mt-t1 shrink-0 text-accent" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : <p className="rounded-md bg-surface p-t4 text-small text-text">{t.nothing}</p>}
        </section>
      </div>
    </PortalShell>
  );
}
