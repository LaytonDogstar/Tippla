// Mock TaleFin screen, deliberately styled as a third party (neutral, its own header) and labelled as a demo.
import { currentPersona } from "@/lib/persona";
import { loadPersona } from "@/lib/api/client";
import { TaleFinLogin } from "./TaleFinLogin";

export const dynamic = "force-dynamic";

export default async function TaleFin({ searchParams }: { searchParams: { persona?: string } }) {
  const { data } = await loadPersona(currentPersona(searchParams.persona), { latencyMs: 0 });
  return <TaleFinLogin bank={data.bankStatement.profiles[0]?.bank.name ?? "your bank"} />;
}
