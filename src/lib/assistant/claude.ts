// Spec 08: the model-written answer. Claude calls Tippla's deterministic tools (manual loop) and writes the
// reply; code then enforces the guardrails: distress never goes to the model (support comes first, scripted),
// every number must come from a tool output, no credit-product advice, nothing judgemental. Any failure falls
// back to the scripted answer and is logged. Server only; needs ANTHROPIC_API_KEY (or another SDK credential).
import Anthropic from "@anthropic-ai/sdk";
import { classify, creditAdvice, judgemental, unsupportedNumbers } from "./guard";
import { answerScripted, type Answer } from "./scripted";
import { runTool, TOOL_DEFS, TOOL_ROUTES, type ToolCtx, type ToolName } from "./tools";

export const ASSISTANT_MODEL = "claude-opus-5-5";
const MAX_TURNS = 6;

/** Frozen system prompt (cached): the guardrails in words. Code checks them again after every answer. */
export const SYSTEM_PROMPT = `You are "Ask Tippla", the in-app assistant of Tippla, an Australian financial health app for people who were recently declined for a small loan. Members ask about their own money.

How to answer:
- Use the tools for every figure. Never calculate or estimate a figure yourself, and never state a number that isn't in a tool result. Copy figures exactly as the tools give them (for example "$53", "01/10").
- Lead with the conclusion in one sentence, then the evidence in one or two short sentences. Plain Australian English, warm and direct, no jargon. Say "estimate" where a tool marks a figure as an estimate.
- Keep it short: under 80 words. No headings or tables.

Limits:
- General information only. Never recommend a credit product, a lender, or whether to take or not take a loan or pay advance. If asked about borrowing, say you can't recommend loans or lenders, share the member's own figures, and mention hardship options and no-interest loans (NILS) from get_hardship_options. The member can explore their Borrowing page themselves.
- You have no access to loan offers or lender matching.
- Gambling: supportive, never judgemental. Point to the support options on the Hardship support page.
- If the member sounds distressed, lead with support: the Hardship support page and the National Debt Helpline from get_hardship_options. Don't try to counsel.
- If no tool can answer the question, say what you can help with instead of guessing.`;

export function assistantMode(): "claude" | "scripted" {
  const m = process.env.ASSISTANT_MODE;
  if (m === "scripted") return "scripted";
  return m === "claude" || process.env.ANTHROPIC_API_KEY ? "claude" : "scripted";
}

export interface ClaudeResult extends Answer { fellBack: null | "distress" | "numbers" | "advice" | "tone" | "refusal" | "error" | "no_answer"; unsupported: string[] }

type Client = Pick<Anthropic, "beta">;

export async function answerWithClaude(question: string, ctx: ToolCtx, opts: { client?: Client } = {}): Promise<ClaudeResult> {
  const intent = classify(question);
  const scripted = (fellBack: ClaudeResult["fellBack"], unsupported: string[] = []): ClaudeResult => ({ ...answerScripted(question, ctx), fellBack, unsupported });
  // Distress: support first, every time, without a model in the loop.
  if (intent === "distress") return scripted("distress");
  const client = opts.client ?? new Anthropic();
  const tools: Answer["tools"] = [];
  const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: "user", content: question.slice(0, 500) }];
  try {
    for (let turn = 0; turn < MAX_TURNS; turn++) {
      const response = await client.beta.messages.create({
        model: ASSISTANT_MODEL,
        max_tokens: 16000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        output_config: { effort: "low" },
        cache_control: { type: "ephemeral" },
        system: SYSTEM_PROMPT,
        tools: TOOL_DEFS.map((t) => ({ ...t, strict: true })) as unknown as Anthropic.Beta.BetaTool[],
        messages,
      });
      if (response.stop_reason === "refusal") return scripted("refusal");
      if (response.stop_reason === "tool_use") {
        messages.push({ role: "assistant", content: response.content });
        const results: Anthropic.Beta.BetaToolResultBlockParam[] = [];
        for (const block of response.content) {
          if (block.type !== "tool_use") continue;
          const name = block.name as ToolName;
          if (!(name in TOOL_ROUTES)) { results.push({ type: "tool_result", tool_use_id: block.id, content: "Unknown tool", is_error: true }); continue; }
          const input = (block.input && typeof block.input === "object" ? block.input : {}) as Record<string, unknown>;
          const output = runTool(name, input, ctx);
          tools.push({ name, input, output });
          results.push({ type: "tool_result", tool_use_id: block.id, content: JSON.stringify(output) });
        }
        messages.push({ role: "user", content: results });
        continue;
      }
      const text = response.content.filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text").map((b) => b.text).join("\n").trim();
      if (!text) return scripted("no_answer");
      // Code-enforced guardrails.
      const unsupported = unsupportedNumbers(text, tools.map((t) => t.output));
      if (unsupported.length) return scripted("numbers", unsupported);
      if (creditAdvice(text)) return scripted("advice");
      if (judgemental(text)) return scripted("tone");
      const base = answerScripted(question, ctx); // for the escalation links and suggestions
      const links = [...new Map([...tools.map((t) => TOOL_ROUTES[t.name]), ...base.links].map((l) => [l.href, l])).values()];
      return { text, points: [], suggestions: [], links, intent, escalation: base.escalation, tools, mode: "claude", fellBack: null, unsupported: [] };
    }
    return scripted("no_answer");
  } catch {
    return scripted("error");
  }
}
