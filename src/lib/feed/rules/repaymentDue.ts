// A pay advance, loan or buy-now-pay-later repayment coming out within 3 days.
import { feedCopy } from "@/content/feed";
import { daysBetween, formatShortDay, formatWhole } from "@/lib/format";
import { billsBeforePayday } from "@/lib/selectors/payCycle";
import { BILL_WINDOW_DAYS } from "./billOverBalance";
import { upcomingRepayments } from "@/lib/selectors/repayments";
import type { Rule } from "../types";
import { balanceBefore } from "./_helpers";

const t = feedCopy.rules.repaymentDue;
export const REPAYMENT_DUE_DAYS = 3;

export const repaymentDue: Rule = ({ d }) => {
  // A repayment that's bigger than the balance already has a "bill bigger than your balance" card.
  const overBalance = new Set(billsBeforePayday(d).filter((b) => daysBetween(d.asOf, b.date) <= BILL_WINDOW_DAYS && b.expected_amount > balanceBefore(d, b.date)).map((b) => `${b.merchant}:${b.date}`));
  return upcomingRepayments(d, 30)
    .filter((r) => daysBetween(d.asOf, r.date) <= REPAYMENT_DUE_DAYS && !overBalance.has(`${r.provider}:${r.date}`))
    .map((r) => {
      const days = daysBetween(d.asOf, r.date);
      const bal = balanceBefore(d, r.date);
      const tight = r.amount > bal;
      return {
        id: `repayment_due:${r.provider}:${r.date}`, type: "repayment_due" as const, section: "borrowing" as const,
        title: t.title(r.provider, formatWhole(r.amount), formatShortDay(r.date)),
        body: tight ? `${t.body(days)} ${t.bodyShort(formatWhole(bal))}` : t.body(days),
        action: { label: t.action, href: "/loans?tab=upcoming" },
        hardship: tight ? { label: feedCopy.hardship, href: "/hardship" } : undefined,
        urgency: 4 as const, amountAtStake: r.amount, expiresAt: r.date,
      };
    });
};
