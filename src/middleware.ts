// Dev conveniences carried in cookies so every route sees them:
//   ?persona=jess|marcus|priya   switches the mock customer
//   ?present=1 / ?present=0       presentation mode on/off (hides dev tools and "Sample logic" tags)
import { NextResponse, type NextRequest } from "next/server";

const PERSONAS = ["jess", "marcus", "priya"];

export function middleware(req: NextRequest) {
  const persona = req.nextUrl.searchParams.get("persona");
  const present = req.nextUrl.searchParams.get("present");
  if (!persona && present === null) return NextResponse.next();
  const res = NextResponse.next();
  if (persona && PERSONAS.includes(persona)) res.cookies.set("tippla-persona", persona, { path: "/", sameSite: "lax" });
  if (present === "1" || present === "0") res.cookies.set("tippla-present", present, { path: "/", sameSite: "lax" });
  // Pages read the query first, so this same request already sees the new value.
  return res;
}

export const config = { matcher: ["/((?!_next|favicon.ico).*)"] };
