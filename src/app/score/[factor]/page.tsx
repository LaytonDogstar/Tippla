// Deep link to a factor: the SmartScore screen with that factor's sheet open.
import { notFound } from "next/navigation";
import { factorFromSlug } from "@/lib/ui/factorSlugs";
import { ScorePage } from "../page";

export const dynamic = "force-dynamic";

export default function FactorPage({ params, searchParams }: { params: { factor: string }; searchParams: { persona?: string; present?: string } }) {
  if (!factorFromSlug(params.factor)) notFound();
  return <ScorePage searchParams={searchParams} slug={params.factor} />;
}
