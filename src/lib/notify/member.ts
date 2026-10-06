// Which member a request is for (mock: the persona cookie) and their account state. Server only.
import { cookies } from "next/headers";
import { isPersona } from "@/lib/api/client";
import type { PersonaId } from "@/lib/api/types";
import { ACCOUNT_COOKIE, parseAccount } from "@/lib/account/state";

export function requestMember(): { member: PersonaId; account: ReturnType<typeof parseAccount> } {
  const persona = cookies().get("tippla-persona")?.value;
  const member: PersonaId = isPersona(persona) ? persona : "jess";
  return { member, account: parseAccount(cookies().get(ACCOUNT_COOKIE)?.value, member) };
}
