"use client";
// "Needs a look" on Today (redesign 07/10/2026; 09/10: the top two, then "{n} more to look at"): ranked rows (the existing feed order), each with a tinted
// status icon, title, one-line meta, timing chip (hidden on phones), amount and a ⋯ menu. Done / Snooze /
// Not relevant live in the ⋯ menu and, on phones, behind a swipe left (Snooze and Done). Same handlers,
// analytics and Undo as before; choices persist in the account cookie.
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  CalendarClock, CircleCheck, CirclePause, CircleX, Copy, Ellipsis, Gauge, HandCoins, LifeBuoy, Receipt, Repeat, TrendingUp,
  TriangleAlert, Unplug, Activity, type LucideIcon,
} from "lucide-react";
import { track } from "@/lib/analytics/client";
import type { PersonaId } from "@/lib/api/types";
import { feedCopy as f } from "@/content/feed";
import { todayCopy } from "@/content/today";
import { addDays, formatDollars, formatShortDay } from "@/lib/format";
import { useAccount } from "@/lib/account/client";
import type { AccountState } from "@/lib/account/state";
import { FEED_MAX, isOpen } from "@/lib/feed/rank";
import type { FeedItem, FeedItemState, FeedType } from "@/lib/feed/types";
import { feedAmount, feedTone } from "@/lib/selectors/today";
import { Button, ButtonLink } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Feedback";
import { Sheet } from "@/components/ui/Sheet";
import { cx } from "@/components/ui/cx";
import { Card, Chip, IconBubble } from "./Card";

const t = todayCopy.needs;
const ICON: Record<FeedType, LucideIcon> = {
  shortfall: TriangleAlert, bill_over_balance: Receipt, repayment_due: CalendarClock, new_subscription: Repeat, price_rise: TrendingUp,
  duplicate_charge: Copy, unusual_spend: Activity, score_change: Gauge, tippla_billing_relief: CirclePause, bank_reconnect: Unplug,
  hardship_followup: LifeBuoy, cancel_failed: CircleX, entitlements_check: HandCoins,
};
const SWIPE = 152; // width of the Snooze + Done actions revealed by a swipe

export function NeedsALook({ persona, account: initial, items, asOf, payday, checked = "", max = FEED_MAX }: {
  persona: PersonaId; account: AccountState; items: FeedItem[]; asOf: string; payday: string; checked?: string;
  /** Rows shown before "{n} more to look at" (single-column Today: 2). */
  max?: number;
}) {
  const toast = useToast();
  const { account, update } = useAccount(persona, initial);
  const [all, setAll] = useState(false);
  const [menu, setMenu] = useState<FeedItem | null>(null);
  const [snoozing, setSnoozing] = useState<FeedItem | null>(null);
  const state = account.feed ?? {};
  const open = items.filter((i) => isOpen(i, state, asOf));
  const shown = all ? open : open.slice(0, max);
  const position = (item: FeedItem) => open.indexOf(item) + 1;
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
  const done = (item: FeedItem) => set(item, { status: "done", at: asOf, amount: item.amountAtStake }, f.toast.done);
  const dismiss = (item: FeedItem) => set(item, { status: "dismissed", at: asOf, amount: item.amountAtStake }, f.toast.dismissed);
  const snoozeOptions = [{ label: f.snoozeOptions.tomorrow, until: addDays(asOf, 1) }, ...(payday > addDays(asOf, 1) ? [{ label: `${f.snoozeOptions.payday} (${formatShortDay(payday)})`, until: payday }] : [])];

  return (
    <Card id="needs-a-look" title={t.heading}
      count={open.length > 0 ? <span className="rounded-pill bg-chip px-[10px] py-[2px] text-meta font-semibold text-text-secondary" aria-label={t.count(open.length)}>{open.length}</span> : undefined}>
      {open.length === 0 ? (
        <p className="flex items-center gap-t3 text-body14 text-text-secondary"><IconBubble icon={CircleCheck} tone="positive" />{t.allClear(checked)}</p>
      ) : (
        <ol className="flex flex-col">
          {shown.map((item, i) => (
            <Row key={item.id} item={item} first={i === 0} onMenu={() => setMenu(item)} onDone={() => done(item)} onSnooze={() => setSnoozing(item)}
              onOpen={() => track("feed_item_actioned", { rule_id: item.type, position: position(item) })} />
          ))}
        </ol>
      )}
      {open.length > max && (
        <button type="button" aria-expanded={all} onClick={() => { if (!all) track("feed_see_all_opened", { item_count: open.length }); setAll((v) => !v); }}
          className="mt-t2 flex min-h-tap w-full items-center justify-center rounded-pill bg-chip text-body14 font-semibold text-accent hover:text-accent-strong">
          {all ? t.showFewer : t.moreToLook(open.length - max)}
        </button>
      )}

      <Sheet open={!!menu} onClose={() => setMenu(null)} title={menu?.title ?? ""}>
        {menu && (
          <div className="flex flex-col gap-t3">
            <p className="text-body14 text-text-secondary">{menu.body}</p>
            <ButtonLink href={menu.action.href} full onClick={() => { track("feed_item_actioned", { rule_id: menu.type, position: position(menu) }); setMenu(null); }}>{menu.action.label}</ButtonLink>
            {menu.hardship && <ButtonLink href={menu.hardship.href} full variant="secondary" onClick={() => setMenu(null)}>{menu.hardship.label}</ButtonLink>}
            <div className="grid grid-cols-3 gap-t2 border-t border-divider pt-t3">
              <Button variant="link" onClick={() => { const it = menu; setMenu(null); done(it); }}>{f.done}</Button>
              <Button variant="link" onClick={() => { const it = menu; setMenu(null); setSnoozing(it); }}>{f.snooze}</Button>
              <Button variant="tertiary" onClick={() => { const it = menu; setMenu(null); dismiss(it); }}>{f.dismiss}</Button>
            </div>
          </div>
        )}
      </Sheet>
      <Sheet open={!!snoozing} onClose={() => setSnoozing(null)} title={snoozing ? f.snoozeTitle(snoozing.title) : ""}>
        {snoozing && (
          <div className="flex flex-col gap-t2">
            {snoozeOptions.map((o) => (
              <Button key={o.until} full variant="secondary" onClick={() => { const it = snoozing; setSnoozing(null); set(it, { status: "snoozed", until: o.until, at: asOf }, f.toast.snoozed(formatShortDay(o.until))); }}>{o.label}</Button>
            ))}
          </div>
        )}
      </Sheet>
    </Card>
  );
}

function Row({ item, first, onMenu, onDone, onSnooze, onOpen }: {
  item: FeedItem; first: boolean; onMenu: () => void; onDone: () => void; onSnooze: () => void; onOpen: () => void;
}) {
  const tone = feedTone(item);
  const money = feedAmount(item);
  const [dx, setDx] = useState(0);
  const drag = useRef<{ x: number; y: number; base: number; engaged: boolean | null } | null>(null);
  const moved = useRef(false);
  // Swipe engages only after a clear sideways intent (more than 10px, and more sideways than up/down), so the
  // page still scrolls normally. Snaps open (Snooze + Done showing) or closed.
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse") return;
    drag.current = { x: e.clientX, y: e.clientY, base: dx, engaged: null };
    moved.current = false;
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const mx = e.clientX - d.x, my = e.clientY - d.y;
    if (d.engaged === null && (Math.abs(mx) > 10 || Math.abs(my) > 10)) d.engaged = Math.abs(mx) > 10 && Math.abs(mx) > Math.abs(my);
    if (!d.engaged) return;
    moved.current = true;
    setDx(Math.max(-SWIPE, Math.min(0, d.base + mx)));
  };
  const onPointerUp = () => {
    if (drag.current?.engaged) setDx((v) => (v < -SWIPE / 2 ? -SWIPE : 0));
    drag.current = null;
  };
  // Wraps rather than truncating, so nothing is clipped at 200% text size.
  const meta = <span className="block text-meta text-text-muted">{item.body}</span>;
  const amount = money ? (money.negative ? `–${formatDollars(Math.round(money.amount))}` : formatDollars(money.amount)) : null;
  const amountTone = money?.negative ? "text-negative" : "text-text";
  return (
    <li className={cx("relative overflow-hidden", !first && "border-t border-divider")}>
      {/* Revealed by a swipe left (phones). Hidden from the tab order unless open; the ⋯ menu is the accessible route. */}
      <div aria-hidden={dx === 0} className="absolute inset-y-0 right-0 flex sm:hidden" style={{ width: SWIPE }}>
        <button type="button" tabIndex={dx === 0 ? -1 : 0} onClick={() => { setDx(0); onSnooze(); }} className="flex-1 bg-caution-soft text-meta font-semibold text-caution">{f.snooze}</button>
        <button type="button" tabIndex={dx === 0 ? -1 : 0} onClick={() => { setDx(0); onDone(); }} className="flex-1 bg-positive-soft text-meta font-semibold text-positive">{f.done}</button>
      </div>
      <div className="relative flex min-h-[64px] touch-pan-y items-center gap-t3 bg-surface py-t3 transition-transform duration-base ease-tippla motion-reduce:transition-none sm:gap-[14px] sm:px-t1"
        style={{ transform: `translateX(${dx}px)` }}
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
        <IconBubble icon={ICON[item.type]} tone={tone} />
        <Link href={item.action.href} onClick={(e) => { if (moved.current || dx !== 0) { e.preventDefault(); setDx(0); return; } onOpen(); }}
          className="min-w-0 flex-1 rounded-md py-t1">
          <span className="block text-row text-text">{item.title}</span>
          {/* Phones: the amount goes under the title, so the title has the row's full width. */}
          {amount && <span className={cx("block text-row sm:hidden", amountTone)}>{amount}</span>}
          {meta}
        </Link>
        <Chip tone={tone} className="hidden sm:inline-flex">{f.urgency[item.urgency]}</Chip>
        {amount && <span className={cx("hidden min-w-[56px] text-right text-row sm:block", amountTone)}>{amount}</span>}
        <button type="button" onClick={onMenu} aria-label={t.more(item.title)} aria-haspopup="dialog"
          className="flex h-tap w-tap shrink-0 items-center justify-center rounded-pill text-icon-muted hover:bg-surface2">
          <Ellipsis aria-hidden size={20} strokeWidth={1.8} />
        </button>
      </div>
    </li>
  );
}
