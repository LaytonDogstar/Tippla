// One-click unsubscribe from a kind of email (Spam Act 2003). Works from any browser: signed link, no login.
import { NextResponse } from "next/server";
import { unsubscribe, verifyUnsubscribe, type EmailKind } from "@/lib/notify/email";

export const dynamic = "force-dynamic";
const KINDS: EmailKind[] = ["notification", "weekly_digest", "recap", "consent_expiry", "win_back"];
const page = (msg: string, status = 200) => new NextResponse(
  `<!doctype html><html lang="en-AU"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Tippla</title></head><body style="font-family:system-ui,sans-serif;max-width:480px;margin:48px auto;padding:0 16px"><h1>Tippla</h1><p>${msg}</p></body></html>`,
  { status, headers: { "content-type": "text/html; charset=utf-8" } });

async function handle(url: URL) {
  const m = url.searchParams.get("m") ?? "", k = url.searchParams.get("k") ?? "", t = url.searchParams.get("t") ?? "";
  if (!KINDS.includes(k as EmailKind) || !verifyUnsubscribe(m, k, t)) return page("That unsubscribe link isn't valid. You can change your email settings in Tippla › Account › Profile.", 400);
  await unsubscribe(m, k as EmailKind);
  return page("Done. You won't get these emails from Tippla again. You can turn them back on in Account › Profile.");
}
export const GET = (req: Request) => handle(new URL(req.url));
// RFC 8058 one-click (List-Unsubscribe-Post) sends a POST to the same link.
export const POST = (req: Request) => handle(new URL(req.url));
