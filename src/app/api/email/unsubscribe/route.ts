// One-click unsubscribe from a kind of email (Spam Act 2003). Works from any browser: signed link, no login.
import { NextResponse } from "next/server";
import { unsubscribe, verifyUnsubscribe, type EmailKind } from "@/lib/notify/email";

export const dynamic = "force-dynamic";
const KINDS: EmailKind[] = ["notification", "weekly_digest", "recap", "consent_expiry", "win_back"];
const page = (msg: string, status = 200) => new NextResponse(
  `<!doctype html><html lang="en-AU"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Tippla</title></head><body style="font-family:system-ui,sans-serif;max-width:480px;margin:48px auto;padding:0 16px"><h1>Tippla</h1><p>${msg}</p></body></html>`,
  { status, headers: { "content-type": "text/html; charset=utf-8" } });

const INVALID = "That unsubscribe link isn't valid. You can change your email settings in Tippla › Account › Profile.";
const valid = (url: URL) => {
  const m = url.searchParams.get("m") ?? "", k = url.searchParams.get("k") ?? "", t = url.searchParams.get("t") ?? "";
  return KINDS.includes(k as EmailKind) && verifyUnsubscribe(m, k, t) ? { m, k: k as EmailKind } : null;
};
const attr = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

// Opening the link (GET) never unsubscribes: mail scanners and link previews fetch every link. It shows one
// button; pressing it (POST) unsubscribes. RFC 8058 one-click (List-Unsubscribe-Post) POSTs the same link.
export async function GET(req: Request) {
  const url = new URL(req.url);
  if (!valid(url)) return page(INVALID, 400);
  return page(`Stop these emails from Tippla?</p><form method="post" action="${attr(url.pathname + url.search)}"><button type="submit" style="min-height:48px;padding:0 16px;font:inherit">Unsubscribe</button></form><p>You can turn them back on in Account › Profile.`);
}
export async function POST(req: Request) {
  const v = valid(new URL(req.url));
  if (!v) return page(INVALID, 400);
  await unsubscribe(v.m, v.k);
  return page("Done. You won't get these emails from Tippla again. You can turn them back on in Account › Profile.");
}
