// Server-side: load a persona with the customer's own choices applied (account cookie + category edits).
import { cookies } from "next/headers";
import { loadPersona, type ClientOptions } from "@/lib/api/client";
import type { PersonaId } from "@/lib/api/types";
import { ACCOUNT_COOKIE, applyAccount, parseAccount } from "@/lib/account/state";
import { categoryEdits } from "@/lib/persona";
import { applyDevStates, DEV_COOKIE, parseDevStates } from "@/lib/dev/states";

/** Dev state toggles (docs/09), from the cookie the middleware sets for ?state=. */
export const devStates = () => parseDevStates(cookies().get(DEV_COOKIE)?.value);

export async function loadCustomer(persona: PersonaId, opts: ClientOptions = {}) {
  const states = devStates();
  const { data: loaded, scoreError } = await loadPersona(persona, opts);
  const data = applyDevStates(loaded, states);
  const account = parseAccount(cookies().get(ACCOUNT_COOKIE)?.value, persona);
  return { data: applyAccount(data, account), raw: data, account, edits: categoryEdits(persona), scoreError, states };
}
