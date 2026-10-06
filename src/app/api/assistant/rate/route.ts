// Spec 08: "Was this helpful?" on an answer (quality review only).
import { NextResponse } from "next/server";
import { rate } from "@/lib/assistant/service";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { id?: unknown; helpful?: unknown } | null;
  if (!body || !Number.isInteger(body.id) || typeof body.helpful !== "boolean") return NextResponse.json({ error: "Expected id and helpful" }, { status: 400 });
  await rate(body.id as number, body.helpful);
  return NextResponse.json({ ok: true });
}
