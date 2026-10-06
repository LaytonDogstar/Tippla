// Lifecycle email (spec 10, flag email_lifecycle_v1): the secondary channel. No email provider is connected
// yet, so emails go to an outbox table (viewable at /dev/outbox); a provider plugs in at `deliver`.
// Spam Act 2003: only with consent (the member's email setting per category), the sender identified, and a
// one-click unsubscribe in every email. Subjects never mention sensitive categories. Server only.
import { createHmac, timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db";
import { isBlocked } from "./policy";

export type EmailKind = "notification" | "weekly_digest" | "recap" | "consent_expiry" | "win_back";
export interface Email { kind: EmailKind; to: string; subject: string; text: string; html: string }

const secret = () => process.env.EMAIL_SECRET ?? process.env.ANALYTICS_SALT ?? "tippla-demo";
const baseUrl = () => process.env.APP_URL ?? "http://localhost:3000";
export const SENDER = { name: "Tippla", address: process.env.EMAIL_FROM ?? "hello@tippla.example" };

export function unsubscribeToken(member: string, kind: EmailKind): string {
  return createHmac("sha256", secret()).update(`${member}:${kind}`).digest("hex").slice(0, 32);
}
export function verifyUnsubscribe(member: string, kind: string, token: string): boolean {
  const expected = unsubscribeToken(member, kind as EmailKind);
  const a = Buffer.from(token), b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
export const unsubscribeUrl = (member: string, kind: EmailKind) =>
  `${baseUrl()}/api/email/unsubscribe?m=${encodeURIComponent(member)}&k=${kind}&t=${unsubscribeToken(member, kind)}`;

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/** Wrap content with the sender identity and the unsubscribe link (required in every email). */
export function compose(member: string, kind: EmailKind, to: string, subject: string, lines: string[], link: { label: string; href: string }): Email {
  const unsub = unsubscribeUrl(member, kind);
  const footer = `You're getting this because you chose to hear from Tippla by email. Unsubscribe: ${unsub}`;
  const text = [...lines, "", `${link.label}: ${baseUrl()}${link.href}`, "", `${SENDER.name} <${SENDER.address}>`, footer].join("\n");
  const html = `<div style="font-family:system-ui,sans-serif;max-width:560px;color:#111">${lines.map((l) => `<p>${esc(l)}</p>`).join("")}`
    + `<p><a href="${baseUrl()}${link.href}">${esc(link.label)}</a></p><hr><p style="font-size:12px;color:#555">${esc(SENDER.name)} &lt;${esc(SENDER.address)}&gt;<br>`
    + `You're getting this because you chose to hear from Tippla by email. <a href="${unsub}">Unsubscribe</a></p></div>`;
  return { kind, to, subject, text, html };
}

export async function isUnsubscribed(member: string, kind: EmailKind): Promise<boolean> {
  return (await (await db()).query("SELECT 1 FROM email_unsubscribes WHERE member_id = $1 AND kind = $2", [member, kind])).rows.length > 0;
}

export async function unsubscribe(member: string, kind: EmailKind) {
  await (await db()).query("INSERT INTO email_unsubscribes (member_id, kind) VALUES ($1, $2) ON CONFLICT DO NOTHING", [member, kind]);
}

/** Queue an email unless the member unsubscribed or it carries blocked content. Returns whether it was queued. */
export async function sendEmail(member: string, email: Email): Promise<boolean> {
  if (await isUnsubscribed(member, email.kind)) return false;
  if (isBlocked({ title: email.subject, body: email.text.split("\n").slice(0, -3).join(" "), href: "" })) return false;
  await (await db()).query("INSERT INTO email_outbox (member_id, kind, to_address, subject, text_body, html_body) VALUES ($1, $2, $3, $4, $5, $6)",
    [member, email.kind, email.to, email.subject, email.text, email.html]);
  return true;
}

export async function outbox(limit = 50) {
  return (await (await db()).query<{ member_id: string; kind: string; to_address: string; subject: string; text_body: string; created_at: string }>(
    "SELECT member_id, kind, to_address, subject, text_body, created_at::text FROM email_outbox ORDER BY id DESC LIMIT $1", [limit])).rows;
}
