// The service worker reports a tapped notification (spec 10: notification_opened).
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requestMember } from "@/lib/notify/member";
import { trackServer } from "@/lib/analytics/server";

export const dynamic = "force-dynamic";
export async function POST(req: Request) {
  const { member, account } = requestMember();
  const { tag } = (await req.json().catch(() => ({}))) as { tag?: string };
  if (typeof tag !== "string" || tag.length > 200) return NextResponse.json({ error: "Expected a tag" }, { status: 400 });
  const r = await (await db()).query<{ type: string }>(
    "UPDATE notifications SET opened_at = now() WHERE member_id = $1 AND key = $2 AND opened_at IS NULL RETURNING type", [member, tag.replace(/^test:/, "")]);
  await trackServer(member, "notification_opened", { type: r.rows[0]?.type ?? (tag.startsWith("test:") ? "payday" : "unknown") }, { consent: account.analytics !== false });
  return NextResponse.json({ ok: true });
}
