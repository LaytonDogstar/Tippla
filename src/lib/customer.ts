// Server-side: load a persona with the customer's own choices applied (account cookie + category edits).
import { cookies } from "next/headers";
import { cache } from "react";
import { loadPersona, type ClientOptions } from "@/lib/api/client";
import type { PersonaId } from "@/lib/api/types";
import { ACCOUNT_COOKIE, applyAccount, parseAccount } from "@/lib/account/state";
import { categoryEdits } from "@/lib/persona";
import { isOn } from "@/config/featureFlags";
import { applyDevStates, DEV_COOKIE, parseDevStates } from "@/lib/dev/states";

/** Dev state toggles (docs/09), from the cookie the middleware sets for ?state=. */
export const devStates = () => parseDevStates(cookies().get(DEV_COOKIE)?.value);

/**
 * Cached per request (React cache), so the page and the shell's nav badges share one load.
 * Options are only used by tests and dev; the cached path is the no-options call.
 */
export const loadCustomer = cache(async (persona: PersonaId, opts?: ClientOptions) => loadCustomerUncached(persona, opts ?? {}));

async function loadCustomerUncached(persona: PersonaId, opts: ClientOptions) {
  const states = devStates();
  // "payday" swaps in the snapshot taken the morning the next pay lands (check-in and recap).
  // "bill_due" swaps in Jess's 29/09 snapshot (a repayment tomorrow bigger than her balance).
  const snapshot = states.includes("payday") ? "payday" : states.includes("bill_due") ? "billdue" : opts.snapshot;
  const { data: loaded, scoreError } = await loadPersona(persona, { ...opts, snapshot });
  const data = applyDevStates(loaded, states);
  const account = parseAccount(cookies().get(ACCOUNT_COOKIE)?.value, persona);
  // Spec 04: the member's goal shapes the plan, check-in and recap only while goals_v1 is on.
  const goal = isOn("goals_v1", persona) ? account.focusGoal : undefined;
  return { data: applyAccount(data, account), raw: data, account, goal, edits: categoryEdits(persona), scoreError, states };
}
