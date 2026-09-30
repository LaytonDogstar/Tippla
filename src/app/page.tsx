import Link from "next/link";

// Phase 0 placeholder. The dashboard arrives in Phase 3.
export default function Home() {
  return (
    <main className="mx-auto max-w-[390px] px-4 py-t6">
      <p className="text-eyebrow uppercase text-text-muted">Tippla · Phase 0</p>
      <h1 className="mt-t2 font-display text-h1">Foundations</h1>
      <p className="mt-t3 text-text-muted">
        The mock API, selectors and tokens are in place. Screens start in Phase 1.
      </p>
      <Link href="/dev/selectors" className="mt-t5 inline-flex min-h-tap items-center rounded-pill bg-accent px-t5 font-semibold text-on-accent">
        Open the selector debug page
      </Link>
    </main>
  );
}
