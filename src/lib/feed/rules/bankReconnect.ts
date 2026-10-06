// Spec 01 bank_reconnect: the bank connection is broken or was disconnected, so forecasts have stopped
// updating. (Consent expiring within 14 days joins this rule with spec 05, once consent end dates exist.)
import { feedCopy } from "@/content/feed";
import { formatShortDay } from "@/lib/format";
import type { Rule } from "../types";

const t = feedCopy.rules.bankReconnect;

export const bankReconnect: Rule = ({ d, account = {}, states = [] }) => {
  const broken = !!account.bank?.disconnected || states.includes("bank_expired");
  if (!broken) return [];
  return [{
    id: `bank_reconnect:${d.asOf}`, type: "bank_reconnect", section: "today",
    title: t.title, body: t.body(formatShortDay(d.asOf)),
    action: { label: t.action, href: "/account/bank" },
    urgency: 4, amountAtStake: 0, expiresAt: null,
  }];
};
