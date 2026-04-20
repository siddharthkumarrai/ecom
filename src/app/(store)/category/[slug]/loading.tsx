export default function CategoryLoading() {
  return (
    <main className="space-y-4 pb-2">
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="animate-pulse rounded-2xl border border-zinc-200 bg-white p-3">
            <div className="h-40 rounded-xl bg-zinc-100" />
            <div className="mt-3 h-4 w-3/4 rounded bg-zinc-100" />
            <div className="mt-2 h-3 w-1/2 rounded bg-zinc-100" />
          </div>
        ))}
      </section>
      <div className="h-20 animate-pulse rounded-2xl border border-zinc-200 bg-white" />
    </main>
  );
}
