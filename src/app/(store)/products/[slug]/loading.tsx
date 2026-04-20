export default function ProductLoading() {
  return (
    <main className="-mx-[var(--content-px-mobile)] space-y-5 md:-mx-[var(--content-px-desktop)]">
      <section className="grid animate-pulse gap-6 rounded-2xl border border-zinc-200 bg-white p-4 md:grid-cols-[340px_minmax(0,1fr)] md:p-6">
        <div className="h-[340px] rounded-xl bg-zinc-100" />
        <div className="space-y-3">
          <div className="h-8 w-3/4 rounded bg-zinc-100" />
          <div className="h-4 w-1/2 rounded bg-zinc-100" />
          <div className="h-10 w-1/3 rounded bg-zinc-100" />
          <div className="h-12 w-full rounded bg-zinc-100" />
        </div>
      </section>
      <div className="h-20 animate-pulse rounded-2xl border border-zinc-200 bg-white" />
    </main>
  );
}
