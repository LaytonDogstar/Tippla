// Spec 01 bank_reconnect, extended by spec 05 connection health: broken (disconnected or expired), stale
// (no new data for 48 h+), or the CDR consent ending within 14 days. Reconnecting brings the member back.
import { feedCopy } from "@/content/feed";
import { healthCopy } from "@/content/corrections";
import { isOn } from "@/config/featureFlags";
import { formatShortDay } from "@/lib/format";
import { connectionHealth } from "@/lib/selectors/connection";
import type { Rule } from "../types";

const t = feedCopy.rules.bankReconnect;
const h = healthCopy.feed;

export const bankReconnect: Rule = ({ d, account = {}, states = [] }) => {
  const broken = !!account.bank?.disconnected || (states.includes("bank_expired") && !(account.bank?.renewedOn && account.bank.renewedOn >= d.asOf));
  if (broken) return [{
    id: `bank_reconnect:${d.asOf}`, type: "bank_reconnect", section: "today",
    title: t.title, body: t.body(formatShortDay(d.asOf)),
    action: { label: t.action, href: "/account/bank" },
    urgency: 4, amountAtStake: 0, expiresAt: null,
  }];
  if (!isOn("connection_health_v1", d.id)) return [];
  const health = connectionHealth(d, account, states);
  if (health.status === "stale") return [{
    id: `bank_reconnect:stale:${health.dataFrom}`, type: "bank_reconnect", section: "today",
    title: h.staleTitle, body: h.staleBody(formatShortDay(health.dataFrom)),
    action: { label: healthCopy.reconnect, href: "/account/bank/reconnect?return=/" },
    urgency: 4, amountAtStake: 0, expiresAt: null,
  }];
  if (health.status === "expiring" && health.consentEndsOn && health.daysToConsentEnd !== null) return [{
    id: `bank_reconnect:expiring:${health.consentEndsOn}`, type: "bank_reconnect", section: "today",
    title: h.expiringTitle(Math.max(0, health.daysToConsentEnd)), body: h.expiringBody(formatShortDay(health.consentEndsOn)),
    action: { label: h.renew, href: "/account/bank/reconnect?return=/" },
    urgency: health.daysToConsentEnd <= 3 ? 4 : 3, amountAtStake: 0, expiresAt: health.consentEndsOn,
  }];
  return [];
};
