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
  const c = cookies().get("tippla-present")?.value;
  if (c === "1") return true;
  if (c === "0") return false;
  return !devToolsByDefault();
}

/**
 * Dev tools (the persona pill, "Sample logic" tags) are off by default on a production build, so the hosted site
 * looks like the real product (UX round 2, 1.4). ?dev=1 turns them on for that browser (remembered), ?dev=0 off;
 * TIPPLA_DEV_TOOLS=1 turns them on by default. Local development always starts with them on.
 */
export const devToolsByDefault = () => process.env.NODE_ENV !== "production" || process.env.TIPPLA_DEV_TOOLS === "1";

/** The customer's recategorised transactions (cookie, so every server-rendered screen agrees). */
export function categoryEdits(persona: PersonaId): CategoryOverrides {
  return parseEdits(cookies().get(EDITS_COOKIE)?.value, persona);
}
