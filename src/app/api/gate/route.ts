// Checks the preview password and sets the gate cookie. POST from /gate.
import { NextResponse, type NextRequest } from "next/server";
import { GATE_COOKIE, gateToken, safeNext, sameToken } from "@/lib/gate";

export async function POST(req: NextRequest) {
  const expected = process.env.SITE_PASSWORD;
  const form = await req.formData();
  const next = safeNext(String(form.get("next") ?? "/"));
  if (!expected) return NextResponse.redirect(new URL(next, req.url), 303);
  const given = String(form.get("password") ?? "");
  const ok = sameToken(await gateToken(given), await gateToken(expected));
  if (!ok) return NextResponse.redirect(new URL(`/gate?error=1&next=${encodeURIComponent(next)}`, req.url), 303);
  const res = NextResponse.redirect(new URL(next, req.url), 303);
  res.cookies.set(GATE_COOKIE, await gateToken(expected), {
    httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30,
    secure: req.nextUrl.protocol === "https:" || req.headers.get("x-forwarded-proto") === "https",
  });
  return res;
}

/** Sign out: /api/gate?signout=1 (GET) clears the cookie. */
export async function GET(req: NextRequest) {
  const res = NextResponse.redirect(new URL("/gate", req.url), 303);
  if (req.nextUrl.searchParams.get("signout")) res.cookies.delete(GATE_COOKIE);
  return res;
}
