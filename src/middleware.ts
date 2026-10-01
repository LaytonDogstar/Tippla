// Dev conveniences carried in cookies so every route sees them:
//   ?persona=jess|marcus|priya   switches the mock customer
//   ?present=1 / ?present=0       presentation mode on/off (hides dev tools and "Sample logic" tags)
//   ?state=lapsed,offline / none  dev state toggles (src/lib/dev/states.ts)
import { NextResponse, type NextRequest } from "next/server";

const PERSONAS = ["jess", "marcus", "priya"];

export function middleware(req: NextRequest) {
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
