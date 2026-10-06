// Spec 08: POST a question, get an answer grounded in the member's own figures. Member from the server's own
// cookies. Off unless assistant_v1 is on (gates G1, G2, G3, G6: internal and demo only until sign-off).
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isOn } from "@/config/featureFlags";
import { isPersona } from "@/lib/api/client";
import { loadCustomer } from "@/lib/customer";
import { ask } from "@/lib/assistant/service";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const p = cookies().get("tippla-persona")?.value;
  const member = isPersona(p) ? p : "jess";
  if (!isOn("assistant_v1", member)) return NextResponse.json({ error: "Not available" }, { status: 404 });
  let body: { question?: unknown };
  try { body = (await req.json()) as { question?: unknown }; } catch { return NextResponse.json({ error: "Expected JSON" }, { status: 400 }); }
  const question = typeof body.question === "string" ? body.question.trim() : "";
  if (!question || question.length > 500) return NextResponse.json({ error: "Ask a question of up to 500 characters" }, { status: 400 });
  const { data, account } = await loadCustomer(member);
  return NextResponse.json(await ask(member, question, data, account));
}
