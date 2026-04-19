import Link from "next/link";
import type { Category } from "@/lib/store/types";

export function HomeTopCategoriesSection({ title, categories }: { title: string; categories: Category[] }) {
  if (!categories.length) return null;

  return (
    <section className="rounded-md border border-zinc-200 bg-white p-3 md:p-4">
      <h2 className="text-[14px] font-bold uppercase tracking-[0.1em] text-zinc-800 md:text-[16px]">{title}</h2>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
        {categories.slice(0, 10).map((category) => (
          <Link
            key={category.id}
            href={`/category/${category.slug}`}
            className="group flex min-h-20 flex-col items-center justify-center rounded-sm border border-zinc-200 bg-zinc-50 px-2 py-3 text-center transition hover:border-brand-yellow hover:bg-brand-yellow/10"
          >
            <span className="mb-2 flex h-9 w-9 items-center justify-center rounded-sm bg-brand-yellow text-xs font-bold uppercase text-zinc-900 shadow-sm">
              {category.name.slice(0, 1)}
            </span>
            <span className="text-[11px] font-semibold text-zinc-800 transition group-hover:text-zinc-900">{category.name}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
