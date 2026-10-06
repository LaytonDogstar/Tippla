// Spec 08: answer a member's question (model or scripted) and log it for quality review. Server only.
import type { PersonaData } from "@/lib/api/types";
import type { AccountState } from "@/lib/account/state";
import { memberIdFor } from "@/lib/analytics/server";
import { db } from "@/lib/db";
import { answerWithClaude, assistantMode, type ClaudeResult } from "./claude";
import { answerScripted } from "./scripted";

export type Reply = Omit<ClaudeResult, "tools"> & { id: number | null };

export async function ask(member: string, question: string, d: PersonaData, a: AccountState): Promise<Reply> {
  const q = question.trim().slice(0, 500);
  const r: ClaudeResult = assistantMode() === "claude" ? await answerWithClaude(q, { d, a }) : { ...answerScripted(q, { d, a }), fellBack: null, unsupported: [] };
  let id: number | null = null;
  try {
    const row = await (await db()).query<{ id: string }>(
      "INSERT INTO assistant_logs (member_id, intent, mode, tools, escalation, fell_back, unsupported_numbers) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id",
      [memberIdFor(member), r.intent, r.mode, r.tools.map((t) => t.name).join(","), r.escalation, r.fellBack, r.unsupported.length]);
    id = Number(row.rows[0]?.id ?? 0) || null;
  } catch { /* logging never blocks an answer */ }
  const { tools: _tools, ...reply } = r; // tool outputs stay on the server
  void _tools;
  return { ...reply, id };
}

export async function rate(id: number, helpful: boolean): Promise<void> {
  await (await db()).query("UPDATE assistant_logs SET helpful = $1 WHERE id = $2", [helpful, id]);
}
