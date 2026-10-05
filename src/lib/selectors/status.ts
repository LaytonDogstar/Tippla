// Home status line: what Tippla did at the last refresh. "Checked 38 new transactions this morning".
import type { PersonaData } from "@/lib/api/types";
import { statusCopy as t } from "@/content/feed";
import { formatShortDay, toAEST } from "@/lib/format/dates";
import { posted } from "./transactions";

export function refreshStatus(d: PersonaData, openItems: number) {
  const h = d.scoreHistory;
  const prev = h.length >= 2 ? h[h.length - 2]!.scored_date : null;
  const refreshedAt = d.score?.scoredAt ?? d.bankStatement.timestamp;
  const { date, minutes } = toAEST(refreshedAt);
  const fresh = posted(d.transactions).filter((x) => (prev ? x.date > prev : true) && x.date <= d.asOf).length;
  const when = date !== d.asOf ? t.when.day(formatShortDay(date)) : minutes < 12 * 60 ? t.when.morning : minutes < 17 * 60 ? t.when.afternoon : t.when.evening;
  const checked = prev ? t.checked(fresh, when) : t.firstCheck(fresh);
  return { checked, things: t.things(openItems), newTransactions: fresh, line: `${checked} · ${t.things(openItems)}` };
}
