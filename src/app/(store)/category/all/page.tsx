import Link from "next/link";
import { categories } from "@/lib/store/mock-data";

export default function AllCategoryPage() {
  return (
    <main className="rounded border border-zinc-200 bg-white p-4">
      <h1 className="text-3xl font-semibold">All categories</h1>
      <div className="mt-6 divide-y divide-zinc-200 border border-zinc-200">
        {categories.map((category) => (
          <Link key={category.id} href={`/category/${category.slug}`} className="flex items-center justify-between px-4 py-4 hover:bg-zinc-50">
            <span className="text-sm font-medium text-zinc-800">{category.name}</span>
            <span className="text-xs text-zinc-500">View all products</span>
          </Link>
        ))}
      </div>
    </main>
  );
}

