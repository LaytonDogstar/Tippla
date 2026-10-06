// Home status line: what Tippla did at the last refresh. "Checked 38 new transactions this morning".
import type { PersonaData } from "@/lib/api/types";
import { statusCopy as t } from "@/content/feed";
import { formatShortDay, toAEST } from "@/lib/format/dates";
import { posted } from "./transactions";

/** The latest refresh: the score's, unless bank data has been refreshed on a later day since (payday). */
export function lastRefresh(d: PersonaData): { at: string; since: string | null } {
  const h = d.scoreHistory;
  const scoredAt = d.score?.scoredAt;
  const bankAt = d.bankStatement.timestamp;
  if (scoredAt && toAEST(bankAt).date > toAEST(scoredAt).date) return { at: bankAt, since: toAEST(scoredAt).date };
  return { at: scoredAt ?? bankAt, since: h.length >= 2 ? h[h.length - 2]!.scored_date : null };
}

/** Spec 01 variants: stale bank data (reconnect), all caught up, or what Tippla checked + what needs a look. */
export function refreshStatus(d: PersonaData, openItems: number, opts: { staleSince?: string | null } = {}) {
  const { at: refreshedAt, since: prev } = lastRefresh(d);
  const { date, minutes } = toAEST(refreshedAt);
  const fresh = posted(d.transactions).filter((x) => (prev ? x.date > prev : true) && x.date <= d.asOf).length;
  const when = date !== d.asOf ? t.when.day(formatShortDay(date)) : minutes < 12 * 60 ? t.when.morning : minutes < 17 * 60 ? t.when.afternoon : t.when.evening;
  const checked = prev ? t.checked(fresh, when) : t.firstCheck(fresh);
  const line = opts.staleSince ? t.stale(formatShortDay(opts.staleSince))
    : openItems === 0 ? t.allCaughtUp(formatShortDay(d.derived.pay_cycle.next_payday))
    : `${checked} · ${t.things(openItems)}`;
  return { checked, things: t.things(openItems), newTransactions: fresh, line, stale: !!opts.staleSince };
}
