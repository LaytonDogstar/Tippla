// Spec 06: assemble a hardship letter in plain English from details the member confirmed. Pure.
import { letterCopy as t } from "@/content/actions";

export interface LetterInput {
  lender: string; amount: string; due: string; name: string;
  reason?: string; duration?: string; afford?: string; contact?: string;
}

export function buildLetter(i: LetterInput): string {
  const b = t.body;
  const middle = [
    i.reason && b.reason[i.reason] ? b.reason[i.reason] : null,
    i.duration && b.duration[i.duration] ? b.duration[i.duration] : null,
    i.afford ? b.afford(i.afford) : null,
  ].filter(Boolean).join(" ");
  return [
    b.greeting(i.lender),
    b.ask(i.amount, i.due),
    ...(middle ? [middle] : []),
    b.options,
    ...(i.contact ? [b.contact(i.contact)] : []),
    `${b.close}\n${i.name}`,
  ].join("\n\n");
}

/** mailto: draft (the member's own email app; Tippla never sends). */
export const mailtoFor = (to: string | null, subject: string, body: string) =>
  `mailto:${to ? encodeURIComponent(to) : ""}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
