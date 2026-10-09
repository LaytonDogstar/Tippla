"use client";
// "Needs a look": up to 3 ranked cards, each with one clear action plus Done / Snooze / Dismiss.
// Choices persist in the account cookie (router.refresh updates the nav badges too), each with Undo.
import { ChevronRight, CircleCheck } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { track } from "@/lib/analytics/client";
import type { PersonaId } from "@/lib/api/types";
import { feedCopy as t } from "@/content/feed";
import { addDays, formatShortDay } from "@/lib/format";
import { useAccount } from "@/lib/account/client";
import type { AccountState } from "@/lib/account/state";
import { FEED_MAX, isOpen } from "@/lib/feed/rank";
import type { FeedItem, FeedItemState } from "@/lib/feed/types";
import { Button, ButtonLink } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Feedback";
import { Sheet } from "@/components/ui/Sheet";
import { cx } from "@/components/ui/cx";

export function AttentionFeed({ persona, account: initial, items, asOf, payday, checked = "" }: {
  persona: PersonaId; account: AccountState; items: FeedItem[]; asOf: string; payday: string; checked?: string;
}) {
  const toast = useToast();
  const { account, update } = useAccount(persona, initial);
  const [all, setAll] = useState(false);
  const [snoozing, setSnoozing] = useState<FeedItem | null>(null);
  const state = account.feed ?? {};
  const open = items.filter((i) => isOpen(i, state, asOf));
  const shown = all ? open : open.slice(0, FEED_MAX);
  const position = (item: FeedItem) => open.indexOf(item) + 1;
  // One view per distinct set of cards shown (not on every re-render).
  const shownKey = shown.map((i) => i.type).join(",");
  useEffect(() => { track("feed_viewed", { item_count: shown.length, rule_ids: shownKey }); }, [shownKey, shown.length]);

  const set = (item: FeedItem, s: FeedItemState, message: string) => {
    if (s.status === "done") track("feed_item_done", { rule_id: item.type, position: position(item) });
    else if (s.status === "dismissed") track("feed_item_dismissed", { rule_id: item.type, reason: "not_relevant" });
    else track("feed_item_snoozed", { rule_id: item.type, duration: s.until === payday ? "payday" : "tomorrow" });
    const prev = state[item.id];
    const put = (v: FeedItemState | undefined) => update((l) => {
      const feed = { ...l.feed };
      if (v) feed[item.id] = v; else delete feed[item.id];
      return { ...l, feed };
    });
    put(s);
    toast({ kind: "confirm", message, onUndo: () => put(prev) });
  };

  return (
    <section aria-labelledby="needs-a-look">
      <div className="flex flex-wrap items-baseline justify-between gap-x-t3 px-t1 pb-t2">
        <h2 id="needs-a-look" className="text-card text-text sm:text-card-l">{t.heading}</h2>
        {open.length > FEED_MAX && (
          <button type="button" onClick={() => { if (!all) track("feed_see_all_opened", { item_count: open.length }); setAll((v) => !v); }} className="min-h-tap rounded-sm px-t1 text-small text-accent hover:bg-surface2">
            {all ? t.showFewer : t.seeAll(open.length)}
          </button>
        )}
      </div>
      {open.length === 0 ? (
        <p className="flex items-center gap-t3 rounded-card-s bg-surface shadow-card sm:rounded-card p-t4 text-small text-text">
          <CircleCheck aria-hidden size={24} className="shrink-0 text-neutral" />{t.allClear(checked)}
        </p>
      ) : (
        <ol className="flex flex-col gap-t3">
          {shown.map((item) => (
            <li key={item.id}>
              <article aria-labelledby={`fi-${item.id}`} className={cx("rounded-md p-t4", item.urgency >= 4 ? "bg-caution-soft" : "bg-surface")}>
                <p className={cx("text-caption", item.urgency >= 4 ? "text-caution" : "text-text-muted")}>{t.urgency[item.urgency]}</p>
                <h3 id={`fi-${item.id}`} className="mt-t1 text-h3 text-text">{item.title}</h3>
                <p className="mt-t1 text-small text-text-muted">{item.body}</p>
                <div className="mt-t3 flex flex-col gap-t2">
                  <ButtonLink href={item.action.href} variant="secondary" full onClick={() => track("feed_item_actioned", { rule_id: item.type, position: position(item) })}>{item.action.label}</ButtonLink>
                  {item.hardship && (
                    <Link href={item.hardship.href} className="flex min-h-tap items-center justify-between rounded-sm px-t1 text-small text-accent hover:bg-surface2">
                      {item.hardship.label}<ChevronRight aria-hidden size={20} />
                    </Link>
                  )}
                </div>
                <div className="mt-t1 flex flex-wrap gap-x-t2 border-t border-divider pt-t1">
                  <Button variant="link" aria-label={`${t.done}: ${item.title}`} onClick={() => set(item, { status: "done", at: asOf, amount: item.amountAtStake }, t.toast.done)}>{t.done}</Button>
                  <Button variant="tertiary" aria-label={`${t.snooze}: ${item.title}`} onClick={() => setSnoozing(item)}>{t.snooze}</Button>
                  <Button variant="link" aria-label={`${t.dismiss}: ${item.title}`} onClick={() => set(item, { status: "dismissed", at: asOf, amount: item.amountAtStake }, t.toast.dismissed)}>{t.dismiss}</Button>
                </div>
              </article>
            </li>
          ))}
        </ol>
      )}

      <Sheet open={!!snoozing} onClose={() => setSnoozing(null)} title={snoozing ? t.snoozeTitle(snoozing.title) : ""}>
        {snoozing && (
          <div className="flex flex-col gap-t2">
            {[{ label: t.snoozeOptions.tomorrow, until: addDays(asOf, 1) }, ...(payday > addDays(asOf, 1) ? [{ label: `${t.snoozeOptions.payday} (${formatShortDay(payday)})`, until: payday }] : [])].map((o) => (
              <Button key={o.until} full variant="secondary" onClick={() => { const it = snoozing; setSnoozing(null); set(it, { status: "snoozed", until: o.until, at: asOf }, t.toast.snoozed(formatShortDay(o.until))); }}>
                {o.label}
              </Button>
            ))}
          </div>
        )}
      </Sheet>
    </section>
  );
}
