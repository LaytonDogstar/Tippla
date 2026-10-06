// The VAPID public key a browser needs to subscribe to push (spec 10).
import { NextResponse } from "next/server";
import { vapidKeys } from "@/lib/notify/push";

export const dynamic = "force-dynamic";
export async function GET() {
  return NextResponse.json({ publicKey: (await vapidKeys()).publicKey });
}
