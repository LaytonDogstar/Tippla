// Logs a member's change to how Tippla charges them (spec 03: every billing date change is logged with its
// reason). The preference itself lives in the account state; this only records it.
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { isPersona } from "@/lib/api/client";
import { parseAccount, serialiseAccount } from "@/lib/account/state";
import { logPreference } from "@/lib/billing/log";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const persona = cookies().get("tippla-persona")?.value;
  const member = isPersona(persona) ? persona : "jess";
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Expected JSON" }, { status: 400 }); }
  // Validate through the same parser the account cookie uses.
  const pref = parseAccount(serialiseAccount(undefined, member, { billingPref: body as never }), member).billingPref;
  if (!pref) return NextResponse.json({ error: "Not a valid billing preference" }, { status: 400 });
  await logPreference(member, pref);
  return NextResponse.json({ logged: true });
}
