// Checks the preview password and sets the gate cookie. POST from /gate.
import { NextResponse, type NextRequest } from "next/server";
import { GATE_COOKIE, gateToken, safeNext, sameToken } from "@/lib/gate";

// Redirect by path only. Behind Railway's proxy, req.url is the server's own address (localhost:8080), so an
// absolute URL built from it sends the browser somewhere it can't reach; a relative Location stays on the site.
const seeOther = (path: string) => new NextResponse(null, { status: 303, headers: { Location: path } });

export async function POST(req: NextRequest) {
  const expected = process.env.SITE_PASSWORD;
  const form = await req.formData();
  const next = safeNext(String(form.get("next") ?? "/"));
  if (!expected) return seeOther(next);
  const given = String(form.get("password") ?? "");
  const ok = sameToken(await gateToken(given), await gateToken(expected));
  if (!ok) return seeOther(`/gate?error=1&next=${encodeURIComponent(next)}`);
  const res = seeOther(next);
  res.cookies.set(GATE_COOKIE, await gateToken(expected), {
    httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30,
    secure: req.nextUrl.protocol === "https:" || req.headers.get("x-forwarded-proto") === "https",
  });
  return res;
}

/** Sign out: /api/gate?signout=1 (GET) clears the cookie. */
export async function GET(req: NextRequest) {
  const res = seeOther("/gate");
  if (req.nextUrl.searchParams.get("signout")) res.cookies.delete(GATE_COOKIE);
  return res;
}
