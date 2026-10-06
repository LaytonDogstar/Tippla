// Spec 06 §4: which official sources to point to, from the member's optional answers. Pointers only:
// Tippla never decides eligibility, and every link is an official source (tested). Pure.
import { PROGRAMS, STATE_CONCESSIONS, type ProgramId } from "@/data/directories";

export type Answers = Partial<Record<"household" | "dependants" | "work" | "study" | "rent" | "card", string>>;

export function pointers(a: Answers, opts: { state: string; hasEnergyBill: boolean; usesPayAdvances: boolean }): { id: ProgramId; url: string }[] {
  const ids: ProgramId[] = ["payment_finder"];
  if (a.rent === "yes") ids.push("rent_assistance");
  if (a.card !== "yes" && (a.work === "part" || a.work === "looking" || a.work === "none" || a.study === "yes" || a.dependants === "yes")) ids.push("concession_cards");
  ids.push("state_concessions");
  if (a.card === "yes" || opts.hasEnergyBill) ids.push("energy_compare");
  // No-interest loans as an alternative to pay advances: first when the member uses them.
  if (opts.usesPayAdvances) ids.splice(1, 0, "nils"); else ids.push("nils");
  return ids.map((id) => ({ id, url: id === "state_concessions" ? STATE_CONCESSIONS[opts.state] ?? PROGRAMS.state_concessions.url : PROGRAMS[id].url }));
}
