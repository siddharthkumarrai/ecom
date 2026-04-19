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

  const fromSlugs = slugList.length ? (await getCategoriesBySlugsOrMock(slugList)).categories : [];
  const fallback = !fromSlugs.length ? (await getTopCategoriesOrMock()).categories.slice(0, 10) : [];
  const categories = (fromSlugs.length ? fromSlugs : fallback)
    .filter((c): c is NonNullable<typeof c> => c != null)
    .slice(0, 10);
  const categoryImages =
    section.config.categoryImages && typeof section.config.categoryImages === "object" && !Array.isArray(section.config.categoryImages)
      ? Object.fromEntries(
          Object.entries(section.config.categoryImages as Record<string, unknown>)
            .map(([slug, image]) => [slug, String(image || "").trim()])
            .filter(([, image]) => image)
        )
      : {};
  if (!categories.length) return null;

  return (
    <section className="border border-zinc-200 bg-white p-3 md:p-4">
      <SectionHeader title={title} />
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-5">
        {categories.map((category) => (
          <Link
            key={category.id}
            href={`/category/${category.slug}`}
            className="group flex min-h-[112px] items-center gap-4 border border-zinc-200 bg-white px-3 py-3 hover:border-[#f5c400]"
          >
            <span className="relative inline-flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded bg-[#f7f7f7]">
              <Image
                src={categoryImages[category.slug] || String(category.image || "").trim() || "/hero-placeholder.svg"}
                alt={category.name}
                fill
                sizes="64px"
                className="object-contain p-1"
              />
            </span>
            <span className="line-clamp-2 text-sm font-medium text-zinc-800 md:text-[18px]">{category.name}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
