// Spec 08 guardrails, enforced in code (the system prompt says the same, but code decides):
//  - intent: distress cues lead with support; borrowing questions get general information, the member's own
//    figures and hardship/NILS options; gambling gets supportive links. Never personal credit advice.
//  - no invented numbers: every figure in an answer must appear in the tool outputs.
//  - no credit-product or lender recommendations, ever.
import { LENDER_DIRECTORY } from "@/data/directories";

export type Intent =
  | "distress" | "credit" | "gambling" | "afford" | "safe_to_spend" | "score" | "bills" | "subscriptions"
  | "spending" | "plan" | "hardship" | "forecast" | "other";
export type Escalation = "distress" | "credit" | "gambling" | null;

const DISTRESS = /\b(can'?t cope|cannot cope|going under|drowning|hopeless|give up|end it|kill myself|suicid\w*|self[- ]harm|no way out|can'?t go on|falling apart|desperate|panick?ing|breaking down)\b/i;
const CREDIT = /\b(lenders?|loans?|borrow\w*|credit cards?|pay ?advances?|beforepay|afterpay|zip ?pay|nimble|cash ?train|moneyme|latitude|refinanc\w*|consolidat\w*|apply for|take (out|another)|should i (take|get|apply)|which (lender|loan|card))\b/i;
const ADVICE_SEEK = /\b(should|which|best|recommend\w*|apply|take (out|another)|cheaper|approv\w*|worth it|good idea)\b/i;
const GAMBLING = /\b(gambl\w*|betting|bets?|pokies|casino|sportsbet|tab|lotto|punting)\b/i;

/** Classify a question. Distress always wins; then borrowing; then gambling; then the data questions. */
export function classify(q: string): Intent {
  if (DISTRESS.test(q)) return "distress";
  if (/\b(afford|can i (spend|buy|pay))\b/i.test(q) && /\$?\d/.test(q)) return "afford";
  // Borrowing advice ("which lender", "should I take another advance"), not facts ("when's my Nimble repayment").
  if (CREDIT.test(q) && (ADVICE_SEEK.test(q) || /\b(borrow\w*|consolidat\w*|refinanc\w*)\b/i.test(q))) return "credit";
  if (GAMBLING.test(q)) return "gambling";
  if (/\b(hardship|struggling|behind on|can'?t pay|tight)\b/i.test(q)) return "hardship";
  if (/\b(score|smartscore)\b/i.test(q)) return "score";
  if (/\b(subscriptions?|netflix|spotify|stan|binge|icloud|kayo)\b/i.test(q)) return "subscriptions";
  if (/\b(safe to spend|how much can i spend|left to spend|each day|per day|a day)\b/i.test(q)) return "safe_to_spend";
  if (/\b(bills?|due|next payments?|rent)\b/i.test(q)) return "bills";
  if (/\b(spend|spent|spending|takeaway|groceries|eating out|food|transport|shopping)\b/i.test(q)) return "spending";
  if (/\b(plan|steps?|goal)\b/i.test(q)) return "plan";
  if (/\b(forecast|balance|short|payday)\b/i.test(q)) return "forecast";
  return "other";
}

export const escalationFor = (i: Intent): Escalation => (i === "distress" || i === "credit" || i === "gambling" ? i : null);

/** Every number in the text, normalised and unsigned: "$1,234.50" → "1234.5", "−9" → "9"; dates "01/10" as they are. */
export function numbersIn(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(/\d{1,2}\/\d{1,2}(?:\/\d{2,4})?|\d[\d,]*(?:\.\d+)?/g)) {
    const raw = m[0];
    if (raw.includes("/")) { out.push(raw); continue; }
    const n = Number(raw.replace(/,/g, ""));
    if (Number.isFinite(n)) out.push(String(n));
  }
  return out;
}

/** Numbers too small or generic to be a claim (step counts, "1 tap", "2 bills"). */
const TRIVIAL = (n: string) => !n.includes("/") && Number(n) <= 10 && Number.isInteger(Number(n));
/** Support phone numbers in the guarded copy (NDH 1800 007 007, Lifeline 13 11 14). */
const SUPPORT_NUMBERS = new Set(["1800", "7", "13", "11", "14", "0", "131114", "1800007007"]);

/**
 * The automated check (spec 08): every non-trivial number in the answer appears in the tool outputs.
 * Returns the numbers that don't, so a failing answer can be logged and replaced.
 */
export function unsupportedNumbers(answer: string, toolOutputs: unknown[]): string[] {
  const allowed = new Set(toolOutputs.flatMap((o) => numbersIn(JSON.stringify(o))));
  return numbersIn(answer).filter((n) => !TRIVIAL(n) && !SUPPORT_NUMBERS.has(n) && !allowed.has(n));
}

const LENDERS = LENDER_DIRECTORY.map((l) => l.name.toLowerCase());
const ADVICE = /\b(you should (take|get|apply|borrow|use)|i (would )?recommend (taking|getting|applying|a loan|the loan|borrowing)|best (lender|loan|option is to borrow)|take (out )?(a|another) (loan|advance|pay advance))\b/i;
/** "Go with Latitude", "apply with Nimble": a named provider after the verb (case-sensitive). */
const ADVICE_NAMED = /\b([Gg]o with|[Aa]pply (for|with|to)) [A-Z]/;

/**
 * Credit-product advice in an answer: telling the member to take, or which lender to use. Naming a lender the
 * member already has (from their own transactions) is fine; recommending any is not.
 */
export function creditAdvice(answer: string): boolean {
  if (ADVICE.test(answer) || ADVICE_NAMED.test(answer)) return true;
  const lower = answer.toLowerCase();
  return LENDERS.some((l) => new RegExp(`\\b(try|use|switch to|consider|go with|apply (with|to)) ${l}\\b`).test(lower));
}

/** Tone: nothing judgemental (spec 08: gambling never judgemental; voice rules for everything). */
const JUDGEMENTAL = /\b(irresponsible|reckless|bad with money|your fault|you should be ashamed|addict|wasting|blew)\b/i;
export const judgemental = (answer: string) => JUDGEMENTAL.test(answer);
