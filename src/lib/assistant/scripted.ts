// Spec 08: the scripted answerer. Classifies the question, calls the same deterministic tools the model would,
// and writes the answer from templates. Used without an API key, as the fallback whenever a model answer fails
// a guard, and as the baseline the eval set measures. Every figure comes from a tool output.
import { assistantCopy as t } from "@/content/assistant";
import { NDH, LIFELINE } from "@/config/services";
import { PROGRAMS } from "@/data/directories";
import { payAdvanceRun } from "@/lib/selectors";
import { classify, escalationFor, type Escalation, type Intent } from "./guard";
import { runTool, TOOL_ROUTES, type ToolCtx, type ToolName } from "./tools";

/** Tool outputs are plain JSON objects; templates read their fields by name. */
type Any = any;

export interface AnswerLink { href: string; label: string; external?: boolean }
export interface Answer {
  text: string;
  /** Bullet points after the lead sentence (options, subscriptions). */
  points: string[];
  /** Example questions to tap (not claims, so not number-checked). */
  suggestions: string[];
  links: AnswerLink[];
  intent: Intent;
  escalation: Escalation;
  /** Tool calls and their outputs, for the number check and the log. */
  tools: { name: ToolName; input: Record<string, unknown>; output: Record<string, unknown> }[];
  mode: "scripted" | "claude";
}

const SEVERE = /\b(kill myself|suicid|end it|self[- ]harm|no way out|can'?t go on|unsafe)\b/i;
const WEEKDAY = /\b(today|tomorrow|mon(day)?|tue(s|sday)?|wed(nesday)?|thu(rs|rsday)?|fri(day)?|sat(urday)?|sun(day)?|\d{4}-\d{2}-\d{2})\b/i;
const CATEGORY: [RegExp, string][] = [
  [/takeaway|take-away|eating out|food|restaurant|cafe|coffee|uber eats|delivery/i, "food"], [/grocer|supermarket/i, "groceries"], [/transport|petrol|fuel|uber\b|train|bus|opal/i, "transport"],
  [/shopping|clothes/i, "shopping"], [/entertainment|movies/i, "entertainment"], [/subscription/i, "subscriptions"], [/rent|housing/i, "housing"],
  [/alcohol|drinks|bottle/i, "alcohol"], [/cash/i, "cash"], [/bills?|utilit/i, "bills"], [/health|chemist|doctor/i, "health"], [/fees?\b/i, "fees"],
];

export function answerScripted(question: string, ctx: ToolCtx): Answer {
  const intent = classify(question);
  const tools: Answer["tools"] = [];
  const call = (name: ToolName, input: Record<string, unknown> = {}) => { const output = runTool(name, input, ctx); tools.push({ name, input, output }); return output as Record<string, Any>; };
  const a = t.answers;
  let text = "", points: string[] = [], suggestions: string[] = [];
  const links: AnswerLink[] = [];
  const link = (name: ToolName) => { const r = TOOL_ROUTES[name]; if (!links.some((l) => l.href === r.href)) links.push(r); };
  const hardshipLink = () => { if (!links.some((l) => l.href === "/hardship")) links.push({ href: "/hardship", label: t.links.hardship }); };

  switch (intent) {
    case "distress": {
      const h = call("get_hardship_options");
      text = a.distress;
      points = [a.distressNdh(NDH.phoneDisplay, NDH.hours), ...(SEVERE.test(question) ? [a.distressCrisis(h.crisis.phone)] : []), a.distressHardship];
      links.push({ href: NDH.tel, label: t.links.ndh, external: true });
      if (SEVERE.test(question)) links.unshift({ href: LIFELINE.tel, label: t.links.lifeline, external: true });
      hardshipLink();
      break;
    }
    case "credit": {
      const f = call("get_forecast", { date: "today" });
      call("get_hardship_options");
      const run = payAdvanceRun(ctx.d);
      text = a.credit;
      points = [
        ...(run?.fee ? [a.creditAdvance(run.provider, `$${run.fee}`)] : []),
        ...(f.short_before_payday ? [a.creditShort(f.short_before_payday, f.payday)] : []),
        a.creditAlt,
      ];
      if (run?.fee) tools.push({ name: "get_bills", input: {}, output: { advance_fee: `$${run.fee}`, provider: run.provider } });
      hardshipLink();
      links.push({ href: PROGRAMS.nils.url, label: t.links.nils, external: true }, { href: "/loans", label: t.links.borrowing });
      break;
    }
    case "gambling": {
      text = a.gambling;
      points = [a.gamblingLink];
      links.push({ href: "/hardship", label: t.links.gambling });
      break;
    }
    case "afford": {
      const amount = Number((/\$?\s?(\d+(?:\.\d{1,2})?)/.exec(question) ?? [])[1] ?? 0);
      const when = (WEEKDAY.exec(question) ?? [])[0] ?? "today";
      const s = call("simulate_spend", { amount, date: when });
      if (!s.before_payday) text = a.affordAfterPayday(s.date, s.payday);
      else if (s.short_now) { text = a.affordShortAlready(s.amount, s.short_now, s.payday, s.short_if_spent ?? s.short_now); hardshipLink(); }
      else if (s.short_if_spent) { text = a.affordWouldShort(s.amount, s.payday, s.short_if_spent); hardshipLink(); }
      else text = a.affordOk(s.amount, s.payday, s.left_after_bills_if_spent);
      link("simulate_spend");
      break;
    }
    case "safe_to_spend": {
      const s = call("get_safe_to_spend");
      text = s.nothing_spare ? a.safeNone(s.payday) : a.safe(s.per_day, s.payday, s.days_to_payday);
      link("get_safe_to_spend");
      if (s.nothing_spare) hardshipLink();
      break;
    }
    case "forecast": {
      const when = (WEEKDAY.exec(question) ?? [])[0] ?? "today";
      const f = call("get_forecast", { date: when });
      text = f.short_before_payday ? a.forecastShort(f.short_before_payday, f.payday) : a.forecastOk(f.left_after_bills_before_payday, f.payday);
      link("get_forecast");
      if (f.short_before_payday) hardshipLink();
      break;
    }
    case "bills": {
      const b = call("get_bills", { days: 14 });
      const next = b.bills[0];
      text = next ? `${a.billsNext(next.merchant, next.amount, next.date)} ${a.billsBefore(b.due_before_payday)}` : a.billsNone;
      link("get_bills");
      break;
    }
    case "subscriptions": {
      const s = call("get_subscriptions");
      text = s.count ? a.subs(s.count, s.per_year) : a.subsNone;
      points = s.items.map((i: { merchant: string; monthly: string; next_charge: string }) => `${i.merchant}: ${i.monthly} a month, next ${i.next_charge}`);
      link("get_subscriptions");
      break;
    }
    case "spending": {
      const cat = CATEGORY.find(([re]) => re.test(question))?.[1];
      if (!cat) { text = a.spendingWhich; break; }
      const range = /last (pay )?cycle|last fortnight/i.test(question) ? "last_cycle" : /90 days|3 months|three months/i.test(question) ? "last_90_days" : "this_cycle";
      const s = call("get_spending", { category: cat, range });
      text = s.hidden ? a.spendingHidden : a.spending(s.total, s.category.toLowerCase(), s.range, s.count);
      link("get_spending");
      break;
    }
    case "score": {
      const s = call("get_score");
      if (s.score === null) { text = a.scoreNone(s.reason); link("get_score"); break; }
      const at = call("get_score_attribution");
      const parts = at.available === false ? "" : (at.parts as { factor: string; points: number }[]).filter((p) => p.points !== 0).map((p) => `${p.factor} ${p.points > 0 ? "+" : "−"}${Math.abs(p.points)}`).join(", ");
      text = [a.score(s.score, s.stage), s.change !== null ? a.scoreChange(s.change, at.since ?? s.updated) : "", parts ? a.scoreParts(parts) : "", s.points_to_next_stage ? a.scoreNext(s.points_to_next_stage, s.next_stage) : ""].filter(Boolean).join(" ");
      link("get_score_attribution");
      break;
    }
    case "plan": {
      const p = call("get_plan");
      text = p.plan ? a.plan(p.plan, p.step, p.current_step) : a.planNone;
      link("get_plan");
      break;
    }
    case "hardship": {
      call("get_hardship_options");
      text = a.hardship;
      points = a.hardshipList(NDH.phoneDisplay);
      hardshipLink();
      links.push({ href: NDH.tel, label: t.links.ndh, external: true });
      break;
    }
    default: {
      text = a.other;
      suggestions = [t.suggestions.afford, t.suggestions.bills, t.suggestions.takeaway, t.suggestions.score];
    }
  }
  return { text, points, suggestions, links, intent, escalation: escalationFor(intent), tools, mode: "scripted" };
}
