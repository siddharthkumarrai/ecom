import Link from "next/link";

export function HomeBrandStrip({ brands }: { brands: string[] }) {
  if (!brands.length) return null;

  return (
    <section className="rounded-md border border-zinc-200 bg-white p-2.5 md:p-3">
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
        {brands.slice(0, 16).map((brand) => (
          <Link
            key={brand}
            href={`/brands/${brand.toLowerCase().trim().replace(/\s+/g, "-")}`}
            className="group flex items-center gap-2 rounded-sm border border-zinc-200 bg-zinc-50 px-2 py-2 transition hover:border-zinc-300 hover:bg-white"
          >
            <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-sm bg-brand-yellow text-[10px] font-bold uppercase text-zinc-900">
              {brand.slice(0, 1)}
            </span>
            <span className="line-clamp-1 text-[10px] font-semibold text-zinc-700 transition group-hover:text-zinc-900 md:text-[11px]">
              {brand}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
