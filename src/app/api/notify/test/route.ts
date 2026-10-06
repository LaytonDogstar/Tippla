// "Send me a test notification" (spec 10 acceptance: a test payday notification reaches the installed app).
// Uses the member's payday check-in from the payday snapshot. It's a test the member asked for, so caps and
// quiet hours don't apply; the block list and lock-screen privacy still do.
import { NextResponse } from "next/server";
import { loadPersona } from "@/lib/api/client";
import { notificationEvents } from "@/lib/selectors/notifications";
import { GENERIC, isBlocked } from "@/lib/notify/policy";
import { prefsFor } from "@/lib/notify/prefs";
import { sendPush } from "@/lib/notify/push";
import { requestMember } from "@/lib/notify/member";
import { trackServer } from "@/lib/analytics/server";

export const dynamic = "force-dynamic";
export async function POST() {
  const { member, account } = requestMember();
  const { data } = await loadPersona(member, { latencyMs: 0, snapshot: "payday" });
  const ev = notificationEvents(data, account).find((e) => e.id.startsWith("payday-"));
  if (!ev || isBlocked(ev)) return NextResponse.json({ devices: 0, delivered: 0 });
  const prefs = prefsFor(account);
  const lock = prefs.detailed ? { title: ev.title, body: ev.body } : GENERIC;
  const r = await sendPush(member, { ...lock, url: ev.href, tag: `test:${ev.id}` });
  if (r.delivered) await trackServer(member, "notification_sent", { type: "payday", channel: "push" }, { consent: account.analytics !== false });
  return NextResponse.json(r);
}
