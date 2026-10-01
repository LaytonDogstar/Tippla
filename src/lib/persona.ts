// Server-side: which mock customer is active, and whether presentation mode is on.
import { cookies } from "next/headers";
import { DEFAULT_PERSONA, isPersona } from "@/lib/api/client";
import type { PersonaId } from "@/lib/api/types";
import { EDITS_COOKIE, parseEdits } from "@/lib/selectors/edits";
import type { CategoryOverrides } from "@/lib/selectors/transactions";

export function currentPersona(searchParam?: string | string[]): PersonaId {
  const q = Array.isArray(searchParam) ? searchParam[0] : searchParam;
  if (isPersona(q)) return q;
  const c = cookies().get("tippla-persona")?.value;
  return isPersona(c) ? c : DEFAULT_PERSONA;
}

export function presentationMode(searchParam?: string | string[]): boolean {
  const q = Array.isArray(searchParam) ? searchParam[0] : searchParam;
  if (q === "1") return true;
  if (q === "0") return false;
  return cookies().get("tippla-present")?.value === "1";
}

/** The customer's recategorised transactions (cookie, so every server-rendered screen agrees). */
export function categoryEdits(persona: PersonaId): CategoryOverrides {
  return parseEdits(cookies().get(EDITS_COOKIE)?.value, persona);
}
