// Spec 01 bill_exceeds_balance: a bill due in the next 3 days that is bigger than the balance expected going
// into that day. Urgency 5 when it's due tomorrow (or today), else 4.
import { feedCopy } from "@/content/feed";
import { daysBetween, formatShortDay, formatWhole } from "@/lib/format";
import { billsBeforePayday } from "@/lib/selectors/payCycle";
import type { Rule } from "../types";
import { balanceBefore, sectionFor } from "./_helpers";

const t = feedCopy.rules.billOverBalance;

export const BILL_WINDOW_DAYS = 3;

export const billOverBalance: Rule = ({ d }) =>
  billsBeforePayday(d).filter((b) => daysBetween(d.asOf, b.date) <= BILL_WINDOW_DAYS).flatMap((b) => {
    const bal = balanceBefore(d, b.date);
    if (b.expected_amount <= bal) return [];
    return [{
      id: `bill_over_balance:${b.merchant}:${b.date}`, type: "bill_over_balance" as const, section: sectionFor(b.category),
      title: t.title(b.merchant, formatWhole(b.expected_amount), formatShortDay(b.date)),
      body: t.body(formatWhole(bal)),
      action: { label: t.action, href: `/calendar?day=${b.date}` },
      hardship: { label: feedCopy.hardship, href: "/hardship" },
      urgency: (daysBetween(d.asOf, b.date) <= 1 ? 5 : 4) as 4 | 5, amountAtStake: b.expected_amount - Math.max(0, bal), expiresAt: b.date,
    }];
  });
