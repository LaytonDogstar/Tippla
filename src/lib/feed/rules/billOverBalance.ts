// A predicted bill before payday that is bigger than the balance expected going into that day.
import { feedCopy } from "@/content/feed";
import { formatShortDay, formatWhole } from "@/lib/format";
import { billsBeforePayday } from "@/lib/selectors/payCycle";
import type { Rule } from "../types";
import { balanceBefore, sectionFor } from "./_helpers";

const t = feedCopy.rules.billOverBalance;

export const billOverBalance: Rule = ({ d }) =>
  billsBeforePayday(d).flatMap((b) => {
    const bal = balanceBefore(d, b.date);
    if (b.expected_amount <= bal) return [];
    return [{
      id: `bill_over_balance:${b.merchant}:${b.date}`, type: "bill_over_balance" as const, section: sectionFor(b.category),
      title: t.title(b.merchant, formatWhole(b.expected_amount), formatShortDay(b.date)),
      body: t.body(formatWhole(bal)),
      action: { label: t.action, href: `/calendar?day=${b.date}` },
      hardship: { label: feedCopy.hardship, href: "/hardship" },
      urgency: 4 as const, amountAtStake: b.expected_amount - Math.max(0, bal), expiresAt: b.date,
    }];
  });
