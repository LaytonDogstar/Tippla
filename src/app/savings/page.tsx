// The plan page moved to /money-plan (Your money plan, 12/10/2026). Old links and bookmarks still land there, with
// their query (persona, present) kept.
import { redirect } from "next/navigation";

export default function Savings({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(searchParams)) for (const x of [v].flat()) if (x !== undefined) q.append(k, x);
  redirect(`/money-plan${q.size ? `?${q}` : ""}`);
}
