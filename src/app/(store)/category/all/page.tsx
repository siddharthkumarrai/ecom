import Image from "next/image";
import Link from "next/link";
import { getAllActiveCategoriesFromDb } from "@/lib/store/data";

export const dynamic = "force-dynamic";

export default async function AllCategoryPage() {
  const { categories, dbError } = await getAllActiveCategoriesFromDb();

  return (
    <main className="pb-2">
      <section className="rounded border border-zinc-200 bg-white">
        <div className="border-b border-zinc-200 px-4 py-3 md:px-6">
          <nav className="text-xs text-zinc-500" aria-label="Breadcrumb">
            <ol className="flex flex-wrap items-center gap-1.5">
              <li>
                <Link href="/" className="hover:text-zinc-700">
                  Home
                </Link>
              </li>
              <li className="text-zinc-400">/</li>
              <li className="font-medium text-zinc-700">All Categories</li>
            </ol>
          </nav>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-900 md:text-4xl">All Categories</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {categories.length} categor{categories.length === 1 ? "y" : "ies"} available
          </p>
          {dbError ? <p className="mt-2 text-sm font-medium text-rose-600">{dbError}</p> : null}
        </div>

        {categories.length ? (
          <div className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-2 md:p-4 lg:grid-cols-3 xl:grid-cols-4">
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/category/${category.slug}`}
                className="group flex min-h-[92px] items-center gap-3 rounded border border-zinc-200 bg-white px-3 py-3 transition hover:border-[#f5c400]"
              >
                <span className="relative inline-flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded bg-[#f7f7f7]">
                  <Image
                    src={String(category.image || "").trim() || "/hero-placeholder.svg"}
                    alt={category.name}
                    fill
                    sizes="64px"
                    className="object-contain p-1"
                  />
                </span>
                <div className="min-w-0">
                  <p className="line-clamp-2 text-sm font-semibold text-zinc-800 md:text-[16px]">{category.name}</p>
                  <p className="mt-1 text-xs text-zinc-500">View all products</p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="px-4 py-10 text-center md:px-6">
            <p className="text-base font-medium text-zinc-700">No active categories found in the live database.</p>
          </div>
        )}
      </section>
    </main>
  );
}
