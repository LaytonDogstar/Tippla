// Save or remove this device's push subscription for the current member (spec 10).
import { NextResponse } from "next/server";
import { removeSubscription, saveSubscription } from "@/lib/notify/push";
import { requestMember } from "@/lib/notify/member";

export const dynamic = "force-dynamic";
type Body = { subscription?: { endpoint?: string; keys?: { p256dh?: string; auth?: string } }; platform?: string; endpoint?: string };
const okEndpoint = (e: unknown): e is string => typeof e === "string" && /^https:\/\//.test(e) && e.length < 1000;

export async function POST(req: Request) {
  const { member } = requestMember();
  const b = (await req.json().catch(() => ({}))) as Body;
  const s = b.subscription;
  if (!s || !okEndpoint(s.endpoint) || !s.keys?.p256dh || !s.keys.auth) return NextResponse.json({ error: "Not a push subscription" }, { status: 400 });
  await saveSubscription(member, { endpoint: s.endpoint, p256dh: s.keys.p256dh, auth: s.keys.auth }, b.platform === "pwa" ? "pwa" : "web");
  return NextResponse.json({ saved: true });
}

export async function DELETE(req: Request) {
  const { member } = requestMember();
  const b = (await req.json().catch(() => ({}))) as Body;
  if (!okEndpoint(b.endpoint)) return NextResponse.json({ error: "Expected an endpoint" }, { status: 400 });
  await removeSubscription(b.endpoint, member);
  return NextResponse.json({ removed: true });
}
