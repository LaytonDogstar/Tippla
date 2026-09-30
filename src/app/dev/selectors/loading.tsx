// Skeleton, not a spinner, while the mock API resolves.
export default function Loading() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-t5" aria-busy="true" aria-label="Loading">
      <div className="h-t5 w-40 rounded-sm bg-surface2" />
      <div className="mt-t5 space-y-t2 rounded-lg bg-surface p-t4">
        {Array.from({ length: 10 }, (_, i) => <div key={i} className="h-t4 rounded-sm bg-surface2" />)}
      </div>
    </main>
  );
}
