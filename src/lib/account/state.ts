// Customer account choices that change what screens show: consents (lender matching hides Offers at once),
// subscription status, dismissed offers, read notifications, bank connection. Mock persistence: a cookie,
// so server-rendered screens agree immediately. Real build: Tippla's own API.
import type { Consent, PersonaData, PersonaId } from "@/lib/api/types";
import type { PlanId } from "@/config/plans";

export const ACCOUNT_COOKIE = "tippla-account";

export type ConsentId = Consent["id"];
export interface SubscriptionState { status: "active" | "paused" | "cancelled"; plan: PlanId; effective: string; changedAt: string }
export interface AccountState {
  consents?: Partial<Record<ConsentId, { granted: boolean; at: string }>>;
  subscription?: SubscriptionState;
  dismissedOffers?: string[];
  readNotifications?: string[];
  bank?: { disconnected?: boolean; refreshedAt?: string };
}
type AllAccounts = Partial<Record<PersonaId, AccountState>>;

function parseAll(raw: string | undefined): AllAccounts {
  if (!raw) return {};
  try {
    const v = JSON.parse(decodeURIComponent(raw)) as unknown;
    return v && typeof v === "object" ? (v as AllAccounts) : {};
  } catch {
    return {};
  }
}

const strings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

/** Defensive parse: anything malformed is dropped, never thrown. */
export function parseAccount(raw: string | undefined, persona: PersonaId): AccountState {
  const a = parseAll(raw)[persona];
  if (!a || typeof a !== "object") return {};
  const out: AccountState = { dismissedOffers: strings(a.dismissedOffers), readNotifications: strings(a.readNotifications) };
  if (a.consents && typeof a.consents === "object") {
    out.consents = {};
    for (const id of ["ff_data_sharing", "talefin_bank_data", "lender_matching"] as const) {
      const c = a.consents[id];
      if (c && typeof c.granted === "boolean" && typeof c.at === "string") out.consents[id] = { granted: c.granted, at: c.at };
    }
  }
  const s = a.subscription;
  if (s && ["active", "paused", "cancelled"].includes(s.status) && ["standard", "pro"].includes(s.plan) && typeof s.effective === "string") out.subscription = s;
  if (a.bank && typeof a.bank === "object") out.bank = { disconnected: a.bank.disconnected === true, refreshedAt: typeof a.bank.refreshedAt === "string" ? a.bank.refreshedAt : undefined };
  return out;
}

export function serialiseAccount(raw: string | undefined, persona: PersonaId, state: AccountState): string {
  const all = parseAll(raw);
  all[persona] = state;
  return encodeURIComponent(JSON.stringify(all));
}

/** Apply the customer's choices to the persona data, so every selector sees the same truth. */
export function applyAccount(d: PersonaData, a: AccountState): PersonaData {
  const consents = d.consents.map((c) => {
    const o = a.consents?.[c.id];
    return o ? { ...c, granted: o.granted, granted_at: o.granted ? o.at : c.granted_at } : c;
  });
  const dismissed = new Set(a.dismissedOffers ?? []);
  const matching = consents.find((c) => c.id === "lender_matching")?.granted ?? false;
  return {
    ...d,
    consents,
    offers: { lender_matching_consent: matching, offers: d.offers.offers.filter((o) => !dismissed.has(o.id)) },
  };
}

/** "Now" in the mock world: the data date, mid-morning AEST. */
export const mockNow = (d: Pick<PersonaData, "asOf">) => `${d.asOf}T09:30:00+10:00`;
