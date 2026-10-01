// Server-side: load a persona with the customer's own choices applied (account cookie + category edits).
import { cookies } from "next/headers";
import { loadPersona, type ClientOptions } from "@/lib/api/client";
import type { PersonaId } from "@/lib/api/types";
import { ACCOUNT_COOKIE, applyAccount, parseAccount } from "@/lib/account/state";
import { categoryEdits } from "@/lib/persona";

export async function loadCustomer(persona: PersonaId, opts: ClientOptions = {}) {
  const { data, scoreError } = await loadPersona(persona, opts);
  const account = parseAccount(cookies().get(ACCOUNT_COOKIE)?.value, persona);
  return { data: applyAccount(data, account), raw: data, account, edits: categoryEdits(persona), scoreError };
}
