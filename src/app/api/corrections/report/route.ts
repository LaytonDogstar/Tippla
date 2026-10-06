// Spec 05 correction reports (anonymised; see lib/corrections/report.ts). The member comes from the server's
// own cookies and is used only to check the flag and consent, never stored.
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { isPersona } from "@/lib/api/client";
import { ACCOUNT_COOKIE, parseAccount } from "@/lib/account/state";
import { reportCorrection, type CorrectionReport } from "@/lib/corrections/report";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const persona = cookies().get("tippla-persona")?.value;
  const member = isPersona(persona) ? persona : "jess";
  let body: CorrectionReport;
  try { body = (await req.json()) as CorrectionReport; } catch { return NextResponse.json({ error: "Expected JSON" }, { status: 400 }); }
  const consent = parseAccount(cookies().get(ACCOUNT_COOKIE)?.value, member).analytics !== false;
  return NextResponse.json({ result: await reportCorrection(member, body, { consent }) });
}
