// Dev conveniences carried in cookies so every route sees them:
//   ?persona=jess|marcus|priya   switches the mock customer
//   ?present=1 / ?present=0       presentation mode on/off (hides dev tools and "Sample logic" tags)
//   ?state=lapsed,offline / none  dev state toggles (src/lib/dev/states.ts)
// And, when SITE_PASSWORD is set (hosted preview), every page needs the preview password first.
import { NextResponse, type NextRequest } from "next/server";
import { GATE_COOKIE, GATE_PATHS, gateToken, sameToken } from "@/lib/gate";

const PERSONAS = ["jess", "marcus", "priya"];

export async function middleware(req: NextRequest) {
  const password = process.env.SITE_PASSWORD;
  if (password && !GATE_PATHS.some((p) => req.nextUrl.pathname === p || req.nextUrl.pathname.startsWith(`${p}/`))) {
    const cookie = req.cookies.get(GATE_COOKIE)?.value ?? "";
    if (!sameToken(cookie, await gateToken(password))) {
      const url = req.nextUrl.clone();
      url.pathname = "/gate";
      url.search = `?next=${encodeURIComponent(req.nextUrl.pathname + req.nextUrl.search)}`;
      return NextResponse.redirect(url);
    }
  }
  const persona = req.nextUrl.searchParams.get("persona");
  const present = req.nextUrl.searchParams.get("present");
  const state = req.nextUrl.searchParams.get("state");
  if (!persona && present === null && state === null) return NextResponse.next();
  // Mirror the change onto this request too, so the page rendering now already sees it.
  if (state !== null) {
    if (state === "none" || state === "") req.cookies.delete("tippla-dev");
    else req.cookies.set("tippla-dev", state);
  }
  const res = NextResponse.next({ request: { headers: req.headers } });
  if (persona && PERSONAS.includes(persona)) res.cookies.set("tippla-persona", persona, { path: "/", sameSite: "lax" });
  if (present === "1" || present === "0") res.cookies.set("tippla-present", present, { path: "/", sameSite: "lax" });
  if (state !== null) {
    if (state === "none" || state === "") res.cookies.delete("tippla-dev");
    else res.cookies.set("tippla-dev", state, { path: "/", sameSite: "lax" });
  }
  // Pages read the query first, so this same request already sees the new value.
  return res;
}

export const config = { matcher: ["/((?!_next|favicon.ico).*)"] };
