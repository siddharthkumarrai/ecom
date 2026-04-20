import Link from "next/link";
import Image from "next/image";
import { SectionHeader } from "@/components/store/sections/blocks/SectionHeader";
import type { SectionRenderProps } from "@/components/store/sections/registry";
import { getCategoriesBySlugsOrMock, getTopCategoriesOrMock } from "@/lib/store/data";

export async function TopCategoriesGridSection({ section, siteConfig }: SectionRenderProps) {
  const title = String(section.config.title || siteConfig.homepage.topCategories.title);
  const slugList = Array.from(
    new Set(
      (Array.isArray(section.config.categorySlugs)
        ? (section.config.categorySlugs as unknown[]).map((slug) => String(slug).trim()).filter(Boolean)
        : (siteConfig.homepage.topCategories.categorySlugs ?? []).map((slug) => String(slug).trim()).filter(Boolean))
    )
  ).slice(0, 10);

  const fromSlugsResult = slugList.length ? await getCategoriesBySlugsOrMock(slugList) : null;
  const fromSlugs = fromSlugsResult?.source === "db" ? fromSlugsResult.categories : [];
  const fallbackResult = !fromSlugs.length ? await getTopCategoriesOrMock() : null;
  const fallback = fallbackResult?.source === "db" ? fallbackResult.categories.slice(0, 10) : [];
  const categories = (fromSlugs.length ? fromSlugs : fallback)
    .filter((c): c is NonNullable<typeof c> => c != null)
    .slice(0, 10);
  if (!categories.length) return null;

  return (
    <section className="border border-zinc-200 bg-white p-3 md:p-4">
      <SectionHeader title={title} />
      <div className="-mx-3 overflow-x-auto px-3 pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex snap-x snap-mandatory gap-2">
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/category/${category.slug}`}
              className="group flex min-h-[104px] min-w-[148px] snap-start items-center gap-3 border border-zinc-200 bg-white px-2.5 py-2.5 hover:border-[#f5c400] sm:min-h-[112px] sm:min-w-[176px] sm:px-3 sm:py-3 md:min-w-[212px]"
            >
              <span className="relative inline-flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded bg-[#f7f7f7] sm:h-16 sm:w-16">
                <Image
                  src={String(category.image || "").trim() || "/hero-placeholder.svg"}
                  alt={category.name}
                  fill
                  sizes="64px"
                  className="object-contain p-1"
                />
              </span>
              <span className="line-clamp-2 text-xs font-medium text-zinc-800 sm:text-sm md:text-base">{category.name}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
