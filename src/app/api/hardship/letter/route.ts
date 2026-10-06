// Spec 06: the member's hardship letter as a PDF download. The text comes from the member's own browser and
// is returned straight away; nothing is stored or sent anywhere.
import { NextResponse } from "next/server";
import { letterPdf } from "@/lib/hardship/pdf";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const text = String(form?.get("text") ?? "").slice(0, 8000);
  if (!text.trim()) return NextResponse.json({ error: "Nothing to download" }, { status: 400 });
  return new NextResponse(Buffer.from(letterPdf(text)) as unknown as BodyInit, { headers: { "content-type": "application/pdf", "content-disposition": 'attachment; filename="hardship-letter.pdf"', "cache-control": "no-store" } });
}
